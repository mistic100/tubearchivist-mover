import { SlButton } from '@shoelace-style/shoelace';
import { ChannelRenameQuery } from 'types/ChannelRenameQuery';
import { ChannelRenameResult } from 'types/ChannelRenameResult';
import { loadChannels } from './common';
import { createAlert, postJson } from './utils';

class RenameChannelForm extends HTMLElement {
    private form: HTMLFormElement;
    private submitBtn: SlButton;
    private alertSlot: HTMLElement;

    connectedCallback() {
        this.render();
        this.form = this.querySelector("form")!;
        this.submitBtn = this.querySelector('sl-button[type="submit"]')!;
        this.alertSlot = this.querySelector("#alert-slot")!;

        this.form.addEventListener("submit", (e) => this.onSubmit(e));

        loadChannels(this.form.querySelector('sl-select[name=channel]')!);
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

    showAlert(variant: "danger" | "success", message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async onSubmit(e: Event) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const channelId = formData.get('channel') as string;
        const newName = (formData.get('name') as string).trim();
        if (!channelId || !newName) {
            this.showAlert("danger", "Both a channel and a new name are required.");
            return;
        }

        this.submitBtn.loading = true;

        const { ok, data } = await postJson<ChannelRenameResult>("/api/rename-channel", { channelId, newName } satisfies ChannelRenameQuery);
        if (ok) {
            this.showAlert(
                "success",
                `Renamed channel to "${newName}" (${data.updatedVideos} video(s) updated).`,
            );
            this.form.reset();
        } else {
            this.showAlert("danger", data.message);
        }

        this.submitBtn.loading = false;
    }
}

customElements.define("rename-channel-form", RenameChannelForm);
