import { createAlert, extractId, fetchJson, postJson } from "./utils.js";

class RenameChannelForm extends HTMLElement {
    connectedCallback() {
        this.render();
        this.channelInput = this.querySelector('[name="channel"]');
        this.nameInput = this.querySelector('[name="name"]');
        this.form = this.querySelector("form");
        this.submitBtn = this.querySelector('sl-button[type="submit"]');
        this.alertSlot = this.querySelector("#alert-slot");

        this.channelInput.addEventListener("sl-change", () => this.previewChannel());
        this.form.addEventListener("submit", (e) => this.onSubmit(e));
    }

    render() {
        this.innerHTML = `
        <div id="alert-slot"></div>
        <form>
            <sl-input name="channel" label="Channel ID or URL" clearable></sl-input>
            <br />
            <sl-input name="name" label="New channel name" clearable></sl-input>
            <br />
            <sl-button type="submit" variant="primary">Rename channel</sl-button>
        </form>
        `;
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
        this.setPreview(this.channelInput, `Current name: ${data.channel_name}`);
    }

    setPreview(el, text) {
        el.setAttribute('help-text', text);
    }
    
    showAlert(variant, message) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async onSubmit(e) {
        e.preventDefault();

        const channelId = extractId(this.channelInput.value);
        const newName = this.nameInput.value.trim();
        if (!channelId || !newName) {
            this.showAlert("danger", "Both a channel and a new name are required.");
            return;
        }

        this.submitBtn.loading = true;
        try {
            const { ok, data } = await postJson("/api/rename-channel", { channelId, newName });
            if (ok) {
                this.showAlert(
                    "success",
                    `Renamed channel to "${data.channel_name}" (${data.updatedVideos} video(s) updated).`,
                );
                this.channelInput.value = "";
                this.nameInput.value = "";
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

customElements.define("rename-channel-form", RenameChannelForm);
