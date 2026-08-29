import type WaButton from '@awesome.me/webawesome/dist/components/button/button.js';
import type WaSelect from '@awesome.me/webawesome/dist/components/select/select.js';
import type WaInput from '@awesome.me/webawesome/dist/components/input/input.js';
import type WaTextarea from '@awesome.me/webawesome/dist/components/textarea/textarea.js';
import { ChannelEditQuery } from 'types/ChannelEditQuery';
import { ChannelEditResult } from 'types/ChannelEditResult';
import { loadChannels, reloadChannels, getChannels } from './common';
import { createAlert, postJson, processImageFile } from './utils';

class EditChannelForm extends HTMLElement {
    private form: HTMLFormElement;
    private submitBtn: WaButton;
    private alertSlot: HTMLElement;
    private channelInput: WaSelect;
    private nameInput: WaInput;
    private descInput: WaTextarea;
    private fileInput: HTMLInputElement;

    connectedCallback() {
        this.render();
        this.form = this.querySelector("form")!;
        this.submitBtn = this.querySelector('wa-button[type="submit"]')!;
        this.alertSlot = this.querySelector("#alert-slot")!;

        this.channelInput = this.form.querySelector('wa-select[name=channel]')!;
        this.nameInput = this.form.querySelector('wa-input[name=name]')!;
        this.descInput = this.form.querySelector('wa-textarea[name=description]')!;
        this.fileInput = this.form.querySelector('input[name=thumb]')!;

        this.form.addEventListener("submit", (e) => this.onSubmit(e));
        this.channelInput.addEventListener('change', () => this.onChannelChange());

        loadChannels(this.channelInput);
    }

    render() {
        this.innerHTML = `
        <div id="alert-slot"></div>
        <form>
            <wa-select name="channel" label="Channel" required with-clear></wa-select>
            <br />
            <wa-input name="name" label="Channel name" required with-clear></wa-input>
            <br />
            <wa-textarea name="description" label="Channel description" rows="4"></wa-textarea>
            <br />
            <label>Thumbnail (optional — leave empty to keep current)</label>
            <input type="file" name="thumb" accept="image/png,image/jpeg" />
            <br />
            <wa-button type="submit" variant="brand">Update channel</wa-button>
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
        const channelName = (formData.get('name') as string).trim();
        const channelDescription = (formData.get('description') as string).trim();
        if (!channelId || !channelName) {
            this.showAlert("danger", "Both a channel and a new name are required.");
            return;
        }

        this.submitBtn.loading = true;

        let channelThumbBase64: string | undefined;
        try {
            channelThumbBase64 = await processImageFile(this.fileInput);
        } catch {
            this.showAlert('danger', 'Failed to process thumbnail image.');
            this.submitBtn.loading = false;
            return;
        }

        const { ok, data } = await postJson<ChannelEditResult>(`/api/channel/${channelId}`, {
            channelName,
            channelDescription,
            channelThumbBase64,
        } satisfies ChannelEditQuery);

        if (ok) {
            this.showAlert(
                "success",
                `Updated channel "${channelName}" (${data.updatedVideos} video(s) updated).`,
            );
            this.form.reset();
            reloadChannels().catch(() => {});
        } else {
            this.showAlert("danger", data.message);
        }

        this.submitBtn.loading = false;
    }

    async onChannelChange() {
        const channelId = new FormData(this.form).get('channel') as string;
        if (!channelId) return;

        const channel = (await getChannels()).find(c => c.channel_id === channelId)!;

        this.nameInput.value = channel.channel_name;
        this.descInput.value = channel.channel_description ?? '';
        this.fileInput.value = '';
    }
}

customElements.define("edit-channel-form", EditChannelForm);
