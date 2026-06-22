import { extractId, fetchJson, postJson } from "./utils.js";

class MoveForm extends HTMLElement {
    connectedCallback() {
        this.render();
        this.videoInput = this.querySelector('[name="video"]');
        this.channelInput = this.querySelector('[name="channel"]');
        this.videoPreview = this.querySelector("#video-preview");
        this.channelPreview = this.querySelector("#channel-preview");
        this.form = this.querySelector("form");
        this.submitBtn = this.querySelector('sl-button[type="submit"]');
        this.alertSlot = this.querySelector("#alert-slot");

        this.videoInput.addEventListener("sl-change", () => this.previewVideo());
        this.channelInput.addEventListener("sl-change", () => this.previewChannel());
        this.form.addEventListener("submit", (e) => this.onSubmit(e));
    }

    render() {
        this.innerHTML = `
        <div id="alert-slot"></div>
        <form>
            <div class="field-stack">
                <div>
                    <sl-input name="video" label="Video ID or URL" clearable></sl-input>
                    <div id="video-preview" class="preview"></div>
                </div>
                <div>
                    <sl-input name="channel" label="Target channel ID or URL" clearable></sl-input>
                    <div id="channel-preview" class="preview"></div>
                </div>
            </div>
            <div class="actions">
                <sl-button type="submit" variant="primary">Move video</sl-button>
            </div>
        </form>
        `;
    }

    async previewVideo() {
        const id = extractId(this.videoInput.value);
        if (!id) {
            this.setPreview(this.videoPreview, "", false);
            return;
        }
        const { ok, data } = await fetchJson(`/api/video/${encodeURIComponent(id)}`);
        if (!ok) {
            this.setPreview(this.videoPreview, data.message, true);
            return;
        }
        this.setPreview(this.videoPreview, `${data.title} — currently in ${data.channel_name}`, false);
    }

    async previewChannel() {
        const id = extractId(this.channelInput.value);
        if (!id) {
            this.setPreview(this.channelPreview, "", false);
            return;
        }
        const { ok, data } = await fetchJson(`/api/channel/${encodeURIComponent(id)}`);
        if (!ok) {
            this.setPreview(this.channelPreview, data.message, true);
            return;
        }
        this.setPreview(this.channelPreview, `Target: ${data.channel_name}`, false);
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
        
        const videoId = extractId(this.videoInput.value);
        const channelId = extractId(this.channelInput.value);
        if (!videoId || !channelId) {
            this.showAlert("danger", "Both a video and a target channel are required.");
            return;
        }

        this.submitBtn.loading = true;
        try {
            const { ok, data } = await postJson("/api/move", { videoId, channelId });
            if (ok) {
                this.showAlert(
                    "success",
                    `Moved ${data.videoId} to ${data.toChannelId} (${data.movedFiles} file(s)).`,
                );
                this.videoInput.value = "";
                this.channelInput.value = "";
                this.setPreview(this.videoPreview, "", false);
                this.setPreview(this.channelPreview, "", false);
            } else {
                this.showAlert("danger", data.message);
            }
        } catch (err) {
            this.showAlert("danger", `Request failed: ${err.message}`);
        } finally {
            this.submitBtn.loading = false;
        }
    }
}

customElements.define("move-form", MoveForm);
