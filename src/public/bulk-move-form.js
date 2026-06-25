import { extractId, fetchJson, postJson } from "./utils.js";

class BulkMoveForm extends HTMLElement {
    connectedCallback() {
        this.render();
        this.sourceInput = this.querySelector('[name="source"]');
        this.targetInput = this.querySelector('[name="target"]');
        this.sourcePreview = this.querySelector("#bulk-source-preview");
        this.targetPreview = this.querySelector("#bulk-target-preview");
        this.form = this.querySelector("form");
        this.submitBtn = this.querySelector('sl-button[type="submit"]');
        this.alertSlot = this.querySelector("#bulk-alert-slot");
        this.dialog = this.querySelector("#bulk-confirm-dialog");
        this.dialogCount = this.querySelector("#bulk-confirm-count");
        this.confirmBtn = this.querySelector("#bulk-confirm-btn");
        this.cancelBtn = this.querySelector("#bulk-cancel-btn");
        this.progressWrap = this.querySelector("#bulk-progress-wrap");
        this.progressBar = this.querySelector("#bulk-progress");
        this.progressLabel = this.querySelector("#bulk-progress-label");

        // Cached preview state for the source channel.
        this.sourceCount = null;

        this.sourceInput.addEventListener("sl-change", () => this.previewSource());
        this.targetInput.addEventListener("sl-change", () => this.previewTarget());
        this.form.addEventListener("submit", (e) => this.onSubmit(e));
        this.confirmBtn.addEventListener("click", () => this.runBulkMove());
        this.cancelBtn.addEventListener("click", () => this.dialog.hide());
    }

    render() {
        this.innerHTML = `
        <div id="bulk-alert-slot"></div>
        <form>
            <div class="field-stack">
                <div>
                    <sl-input name="source" label="Source channel ID or URL" clearable></sl-input>
                    <div id="bulk-source-preview" class="preview"></div>
                </div>
                <div>
                    <sl-input name="target" label="Target channel ID or URL" clearable></sl-input>
                    <div id="bulk-target-preview" class="preview"></div>
                </div>
            </div>
            <div class="actions">
                <sl-button type="submit" variant="primary">Move all videos</sl-button>
            </div>
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
        `;
    }

    async previewSource() {
        this.sourceCount = null;
        const id = extractId(this.sourceInput.value);
        if (!id) {
            this.setPreview(this.sourcePreview, "", false);
            return;
        }
        const { ok, data } = await fetchJson(`/api/channel/${encodeURIComponent(id)}/videos`);
        if (!ok) {
            this.setPreview(this.sourcePreview, data.message, true);
            return;
        }
        this.sourceCount = data.count;
        this.setPreview(
            this.sourcePreview,
            `${data.channel_name}: ${data.count} video(s)`,
            false,
        );
    }

    async previewTarget() {
        const id = extractId(this.targetInput.value);
        if (!id) {
            this.setPreview(this.targetPreview, "", false);
            return;
        }
        const { ok, data } = await fetchJson(`/api/channel/${encodeURIComponent(id)}`);
        if (!ok) {
            this.setPreview(this.targetPreview, data.message, true);
            return;
        }
        this.setPreview(this.targetPreview, `Target: ${data.channel_name}`, false);
    }

    setPreview(el, text, isError) {
        el.textContent = text;
        el.classList.toggle("error", Boolean(isError));
    }

    showAlert(variant, message) {
        this.alertSlot.innerHTML = "";
        const alert = document.createElement("sl-alert");
        alert.variant = variant;
        alert.closable = true;
        alert.open = true;
        alert.innerHTML = `
        <sl-icon slot="icon" name="${variant === "success" ? "check2-circle" : "exclamation-octagon"}"></sl-icon>${message}
        `;
        this.alertSlot.appendChild(alert);
    }

    async onSubmit(e) {
        e.preventDefault();
        const sourceId = extractId(this.sourceInput.value);
        const targetId = extractId(this.targetInput.value);
        if (!sourceId || !targetId) {
            this.showAlert("danger", "Both a source and a target channel are required.");
            return;
        }
        if (sourceId === targetId) {
            this.showAlert("danger", "Source and target channels must be different.");
            return;
        }

        // Always fetch a fresh list right before confirming.
        const { ok, data } = await fetchJson(`/api/channel/${encodeURIComponent(sourceId)}/videos`);
        if (!ok) {
            this.showAlert("danger", data.message);
            return;
        }
        if (!data.count) {
            this.showAlert("danger", "The source channel has no videos to move.");
            return;
        }

        this.pendingMove = { targetId, videoIds: data.videoIds };
        this.dialogCount.textContent = data.count;
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
                const { ok, data } = await postJson("/api/move-video", { videoId, channelId: targetId });
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
            this.sourceInput.value = "";
            this.targetInput.value = "";
            this.setPreview(this.sourcePreview, "", false);
            this.setPreview(this.targetPreview, "", false);
        }
    }
}

customElements.define("bulk-move-form", BulkMoveForm);
