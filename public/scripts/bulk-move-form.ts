import type WaButton from '@awesome.me/webawesome/dist/components/button/button.js';
import type WaDialog from '@awesome.me/webawesome/dist/components/dialog/dialog.js';
import type WaProgressBar from '@awesome.me/webawesome/dist/components/progress-bar/progress-bar.js';
import type WaSelect from '@awesome.me/webawesome/dist/components/select/select.js';
import { ChannelDoc } from 'types/ChannelDoc';
import { MoveQuery } from 'types/MoveQuery';
import { MoveResult } from 'types/MoveResult';
import { loadChannels } from './common';
import { createAlert, fetchJson, postJson } from './utils';

class BulkMoveForm extends HTMLElement {
    private sourceSelect: WaSelect;
    private form: HTMLFormElement;
    private submitBtn: WaButton;
    private alertSlot: HTMLElement;
    private dialog: WaDialog;
    private dialogCount: HTMLElement;
    private progressBar: WaProgressBar;

    private pendingMove: { targetId: string, videoIds: string[] };

    connectedCallback() {
        this.render();
        this.sourceSelect = this.querySelector('[name="source"]')!;
        this.form = this.querySelector("form")!;
        this.submitBtn = this.querySelector('wa-button[type="submit"]')!;
        this.alertSlot = this.querySelector("#alert-slot")!;

        this.dialog = this.querySelector("#bulk-confirm-dialog")!;
        this.dialogCount = this.querySelector("#bulk-confirm-count")!;
        this.progressBar = this.querySelector("#bulk-progress")!;

        this.form.addEventListener("submit", (e) => this.onSubmit(e));
        this.dialog.querySelector("#bulk-confirm-btn")!.addEventListener("click", () => this.runBulkMove());
        this.dialog.querySelector("#bulk-cancel-btn")!.addEventListener("click", () => this.dialog.open = false);

        loadChannels(this.form.querySelector('wa-select[name=source]')!);
        loadChannels(this.form.querySelector('wa-select[name=target]')!);
    }

    render() {
        this.innerHTML = `
        <div id="alert-slot"></div>
        <form>
            <wa-select name="source" label="Source channel" required with-clear></wa-select>
            <br />
            <wa-select name="target" label="Target channel" required with-clear></wa-select>
            <br />
            <wa-button type="submit" variant="brand">Move all videos</wa-button>
        </form>

        <wa-progress-bar id="bulk-progress" style="display: none" value="0"></wa-progress-bar>

        <wa-dialog id="bulk-confirm-dialog" label="Confirm bulk move">
            <p>You are about to move <strong id="bulk-confirm-count">0</strong> video(s) to the target channel. This renames files and rewrites Elasticsearch documents one by one.</p>
            <p>Are you sure you want to continue?</p>
            <wa-button id="bulk-cancel-btn" slot="footer" variant="default">Cancel</wa-button>
            <wa-button id="bulk-confirm-btn" slot="footer" variant="brand">Move videos</wa-button>
        </wa-dialog>

        <style>
            #bulk-progress-wrap {
                margin-top: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
        </style>
        `;
    }

    showAlert(variant: "danger" | "success" | "warning", message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async onSubmit(e: Event) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const sourceId = formData.get('source') as string;
        const targetId = formData.get('target') as string;
        if (!sourceId || !targetId) {
            this.showAlert("danger", "Both a source and a target channel are required.");
            return;
        }
        if (sourceId === targetId) {
            this.showAlert("danger", "Source and target channels must be different.");
            return;
        }

        // Always fetch a fresh list right before confirming.
        const { ok, data } = await fetchJson<ChannelDoc & { videoIds: string[] }>(`/api/channel/${encodeURIComponent(sourceId)}/videos`);
        if (!ok) {
            this.showAlert("danger", data.message);
            return;
        }
        if (!data.videoIds.length) {
            this.showAlert("danger", "The source channel has no videos to move.");
            return;
        }

        this.pendingMove = { targetId, videoIds: data.videoIds };
        this.dialogCount.textContent = `${data.videoIds.length}`;
        this.dialog.open = true;
    }

    async runBulkMove() {
        this.dialog.open = false;
        const { targetId, videoIds } = this.pendingMove;
        const total = videoIds.length;

        this.submitBtn.loading = true;
        this.alertSlot.innerHTML = "";
        this.progressBar.style.display = "";
        this.progressBar.value = 0;

        let moved = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < total; i++) {
            const videoId = videoIds[i];
            try {
                const { ok, data } = await postJson<MoveResult>("/api/move-video", { videoId, channelId: targetId } satisfies MoveQuery);
                if (ok) {
                    moved++;
                } else if (data.error === "ALREADY_IN_CHANNEL") {
                    skipped++;
                } else {
                    failed++;
                    console.error(`Failed to move ${videoId}:`, data.message);
                }
            } catch (err) {
                failed++;
                console.error(`Failed to move ${videoId}:`, err);
            }
            this.progressBar.value = Math.round(((i + 1) / total) * 100);
        }

        this.submitBtn.loading = false;

        const variant = failed > 0 ? "warning" : "success";
        this.showAlert(
            variant,
            `Bulk move complete — ${moved} moved, ${skipped} skipped, ${failed} failed.`,
        );

        if (failed === 0) {
            this.sourceSelect.setAttribute('value', null as any);
        }
    }
}

customElements.define("bulk-move-form", BulkMoveForm);
