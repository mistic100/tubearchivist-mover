import { extractId, fetchJson, postJson } from "./utils.js";

class RenameChannelForm extends HTMLElement {
    connectedCallback() {
        this.render();
        this.channelInput = this.querySelector('[name="channel"]');
        this.nameInput = this.querySelector('[name="name"]');
        this.channelPreview = this.querySelector("#rename-channel-preview");
        this.form = this.querySelector("form");
        this.submitBtn = this.querySelector('sl-button[type="submit"]');
        this.alertSlot = this.querySelector("#rename-alert-slot");

        this.channelInput.addEventListener("sl-change", () => this.previewChannel());
        this.form.addEventListener("submit", (e) => this.onSubmit(e));
    }

    render() {
        this.innerHTML = `
        <div id="rename-alert-slot"></div>
        <form>
            <div class="field-stack">
                <div>
                    <sl-input name="channel" label="Channel ID or URL" clearable></sl-input>
                    <div id="rename-channel-preview" class="preview"></div>
                </div>
                <div>
                    <sl-input name="name" label="New channel name" clearable></sl-input>
                </div>
            </div>
            <div class="actions">
                <sl-button type="submit" variant="primary">Rename channel</sl-button>
            </div>
        </form>
        `;
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
        this.setPreview(this.channelPreview, `Current name: ${data.channel_name}`, false);
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

customElements.define("rename-channel-form", RenameChannelForm);
