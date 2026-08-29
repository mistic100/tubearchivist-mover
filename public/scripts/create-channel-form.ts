import type WaButton from '@awesome.me/webawesome/dist/components/button/button.js';
import { ChannelCreateQuery } from 'types/ChannelCreateQuery';
import { ChannelDoc } from 'types/ChannelDoc';
import { reloadChannels } from './common';
import { createAlert, postJson, processImageFile } from './utils';

class CreateChannelForm extends HTMLElement {
    private form: HTMLFormElement;
    private fileInput: HTMLInputElement;
    private submitBtn: WaButton;
    private alertSlot: HTMLElement;

    connectedCallback() {
        this.render();
        this.form = this.querySelector('form')!;
        this.fileInput = this.form.querySelector('input[name=thumb]')!;
        this.submitBtn = this.querySelector('wa-button[type="submit"]')!;
        this.alertSlot = this.querySelector('#alert-slot')!;

        this.form.addEventListener('submit', (e) => this.onSubmit(e));
    }

    render() {
        this.innerHTML = `
        <div id="alert-slot"></div>
        <form>
            <wa-input name="channelName" label="Channel name" required with-clear></wa-input>
            <br />
            <wa-textarea name="channelDescription" label="Description (optional)" rows="4"></wa-textarea>
            <br />
            <label>Thumbnail (optional)</label>
            <input type="file" name="thumb" accept="image/png,image/jpeg" />
            <br />
            <wa-button type="submit" variant="brand">Create channel</wa-button>
        </form>
        `;
    }

    showAlert(variant: 'danger' | 'success', message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async onSubmit(e: Event) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const channelName = (formData.get('channelName') as string).trim();
        const channelDescription = (formData.get('channelDescription') as string).trim();

        if (!channelName) {
            this.showAlert('danger', 'Channel name and thumbnail are required.');
            return;
        }

        this.submitBtn.loading = true;

        let channelThumbBase64: string | undefined;
        try {
            channelThumbBase64 = await processImageFile(this.fileInput);
        } catch {
            this.showAlert('danger', 'Failed to process thumbnail image.');
            return;
        }

        const { ok, data } = await postJson<ChannelDoc & { url: string }>('/api/channels', {
            channelName,
            channelDescription,
            channelThumbBase64,
        } satisfies ChannelCreateQuery);

        if (ok) {
            this.showAlert(
                'success',
                `Channel created: <a href="${data.url}">${data.channel_name}</a>`
            );
            this.form.reset();
            reloadChannels().catch(() => {});
        } else {
            this.showAlert('danger', data.message);
        }

        this.submitBtn.loading = false;
    }
}

customElements.define('create-channel-form', CreateChannelForm);
