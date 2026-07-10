import { createAlert, fetchJson, postJson } from "./utils.js";
import { loadChannels } from "./common.js";

class RenameChannelForm extends HTMLElement {
    connectedCallback() {
        this.render();
        this.channelSelect = this.querySelector('[name="channel"]');
        this.form = this.querySelector("form");
        this.submitBtn = this.querySelector('sl-button[type="submit"]');
        this.alertSlot = this.querySelector("#alert-slot");

        this.form.addEventListener("submit", (e) => this.onSubmit(e));

        loadChannels(this.form.querySelector('sl-select[name=channel]'));
    }

    render() {
        this.innerHTML = `
        <div id="alert-slot"></div>
        <form>
            <sl-select name="channel" label="Channel" required hoist clearable></sl-select>
            <br />
            <sl-input name="name" label="New channel name" clearable required></sl-input>
            <br />
            <sl-button type="submit" variant="primary">Rename channel</sl-button>
        </form>
        `;
    }
    
    showAlert(variant, message) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async onSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const channelId = formData.get('channel');
        const newName = formData.get('name').trim();
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
                this.channelSelect.setAttribute('value', null);
                this.nameInput.setAttribute('value', null);
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
