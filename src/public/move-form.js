import { createAlert, extractId, fetchJson, postJson } from "./utils.js";

class MoveForm extends HTMLElement {
    connectedCallback() {
        this.render();
        this.videoInput = this.querySelector('[name="video"]');
        this.channelInput = this.querySelector('[name="channel"]');
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
            <sl-input name="video" label="Video ID or URL" clearable></sl-input>
            <br />
            <sl-input name="channel" label="Target channel ID or URL" clearable></sl-input>
            <br />
            <sl-button type="submit" variant="primary">Move video</sl-button>
        </form>
        `;
    }

    async previewVideo() {
        const id = extractId(this.videoInput.value);
        if (!id) {
            this.setPreview(this.videoInput, "");
            return;
        }
        const { ok, data } = await fetchJson(`/api/video/${encodeURIComponent(id)}`);
        if (!ok) {
            this.setPreview(this.videoInput, data.message);
            return;
        }
        this.setPreview(this.videoInput, `${data.title} — currently in ${data.channel_name}`);
    }

    async previewChannel() {
        const id = extractId(this.channelInput.value);
        if (!id) {
            this.setPreview(this.channelInput, "");
            return;
        }
        const { ok, data } = await fetchJson(`/api/channel/${encodeURIComponent(id)}`);
        if (!ok) {
            this.setPreview(this.channelInput, data.message);
            return;
        }
        this.setPreview(this.channelInput, `Target: ${data.channel_name}`);
    }

    setPreview(el, text) {
        el.setAttribute('help-text', text);
    }

    showAlert(variant, message) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
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
            const { ok, data } = await postJson("/api/move-video", { videoId, channelId });
            if (ok) {
                this.showAlert(
                    "success",
                    `Moved ${data.videoId} to ${data.toChannelId} (${data.movedFiles} file(s)).`,
                );
                this.videoInput.value = "";
                this.channelInput.value = "";
                this.setPreview(this.videoInput, "");
                this.setPreview(this.channelInput, "");
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
