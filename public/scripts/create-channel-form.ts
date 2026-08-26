import type WaButton from '@awesome.me/webawesome/dist/components/button/button.js';
import { ChannelCreateQuery } from 'types/ChannelCreateQuery';
import { ChannelDoc } from 'types/ChannelDoc';
import { reloadChannels } from './common';
import { createAlert, postJson } from './utils';

const THUMB_SIZE = 900;

async function processImageFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = () => {
            const src = reader.result as string;
            const img = new Image();
            img.onerror = () => reject(new Error('Invalid image'));
            img.onload = () => {
                const size = Math.min(img.width, img.height);
                const sx = Math.floor((img.width - size) / 2);
                const sy = Math.floor((img.height - size) / 2);

                const destSize = Math.min(size, THUMB_SIZE);

                const canvas = document.createElement('canvas');
                canvas.width = destSize;
                canvas.height = destSize;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, sx, sy, size, size, 0, 0, destSize, destSize);

                // export as jpeg base64
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                resolve(dataUrl);
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    });
}

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
            <label>Thumbnail (optional)</label>
            <input type="file" name="thumb" accept="image/png,image/jpeg" />
            <br />
            <wa-textarea name="channelDescription" label="Description (optional)" rows="4"></wa-textarea>
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

        let channelThumbBase64: string | undefined = undefined;
        if (this.fileInput.files && this.fileInput.files.length > 0) {
            try {
                channelThumbBase64 = await processImageFile(this.fileInput.files[0]);
            } catch {
                this.showAlert('danger', 'Failed to process thumbnail image.');
                return;
            }
        }

        if (!channelName) {
            this.showAlert('danger', 'Channel name and thumbnail are required.');
            return;
        }

        this.submitBtn.loading = true;

        const { ok, data } = await postJson<ChannelDoc & { url: string }>('/api/create-channel', {
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
