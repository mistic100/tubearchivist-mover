import { SlButton, SlDialog, SlProgressBar, SlSelect } from '@shoelace-style/shoelace';
import { ChannelDoc } from 'types/ChannelDoc';
import { MoveQuery } from 'types/MoveQuery';
import { MoveResult } from 'types/MoveResult';
import { loadChannels } from './common';
import { createAlert, fetchJson, postJson } from './utils';

class BulkMoveForm extends HTMLElement {
    private sourceSelect: SlSelect;
    private form: HTMLFormElement;
    private submitBtn: SlButton;
    private alertSlot: HTMLElement;
    private dialog: SlDialog;
    private dialogCount: HTMLElement;
    private progressWrap: HTMLElement;
    private progressBar: SlProgressBar;
    private progressLabel: HTMLElement;

    private pendingMove: { targetId: string, videoIds: string[] };

    connectedCallback() {
        this.render();
        this.sourceSelect = this.querySelector('[name="source"]')!;
        this.form = this.querySelector("form")!;
        this.submitBtn = this.querySelector('sl-button[type="submit"]')!;
        this.alertSlot = this.querySelector("#alert-slot")!;

        this.dialog = this.querySelector("#bulk-confirm-dialog")!;
        this.dialogCount = this.querySelector("#bulk-confirm-count")!;
        this.progressWrap = this.querySelector("#bulk-progress-wrap")!;
        this.progressBar = this.querySelector("#bulk-progress")!;

        this.form.addEventListener("submit", (e) => this.onSubmit(e));
        this.dialog.querySelector("#bulk-confirm-btn")!.addEventListener("click", () => this.runBulkMove());
        this.dialog.querySelector("#bulk-cancel-btn")!.addEventListener("click", () => this.dialog.hide());

        loadChannels(this.form.querySelector('sl-select[name=source]')!);
        loadChannels(this.form.querySelector('sl-select[name=target]')!);
    }

    render() {
        this.innerHTML = `
        <div id="alert-slot"></div>
        <form>
            <sl-select name="source" label="Source channel" required hoist clearable></sl-select>
            <br />
            <sl-select name="target" label="Target channel" required hoist clearable></sl-select>
            <br />
            <sl-button type="submit" variant="primary">Move all videos</sl-button>
        </form>

        <div id="bulk-progress-wrap" style="display: none">
            <sl-progress-bar id="bulk-progress" value="0"></sl-progress-bar>
            <div id="bulk-progress-label" class="preview"></div>
        </div>

        <sl-dialog id="bulk-confirm-dialog" label="Confirm bulk move">
            <p>You are about to move <strong id="bulk-confirm-count">0</strong> video(s) to the target channel. This renames files and rewrites Elasticsearch documents one by one.</p>
            <p>Are you sure you want to continue?</p>
            <sl-button id="bulk-cancel-btn" slot="footer" variant="default">Cancel</sl-button>
            <sl-button id="bulk-confirm-btn" slot="footer" variant="primary">Move videos</sl-button>
        </sl-dialog>

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
        this.dialog.show();
    }

    async runBulkMove() {
        this.dialog.hide();
        const { targetId, videoIds } = this.pendingMove;
        const total = videoIds.length;

        this.submitBtn.loading = true;
        this.alertSlot.innerHTML = "";
        this.progressWrap.style.display = "";
        this.progressBar.value = 0;

        let moved = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < total; i++) {
            const videoId = videoIds[i];
            this.progressLabel.textContent = `Moving ${i + 1} of ${total}…`;
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

        this.progressLabel.textContent = `Done: ${moved} moved, ${skipped} skipped, ${failed} failed.`;
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
