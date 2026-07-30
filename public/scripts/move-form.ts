import type WaButton from '@awesome.me/webawesome/dist/components/button/button.js';
import type WaInput from '@awesome.me/webawesome/dist/components/input/input.js';
import { MoveQuery } from 'types/MoveQuery';
import { MoveResult } from 'types/MoveResult';
import { VideoDoc } from 'types/VideoDoc';
import { loadChannels } from './common';
import { createAlert, extractId, fetchJson, postJson } from './utils';

class MoveForm extends HTMLElement {
    private videoInput: WaInput;
    private form: HTMLFormElement;
    private submitBtn: WaButton;
    private alertSlot: HTMLElement;

    connectedCallback() {
        this.render();
        this.videoInput = this.querySelector('[name="video"]')!;
        this.form = this.querySelector("form")!;
        this.submitBtn = this.querySelector('wa-button[type="submit"]')!;
        this.alertSlot = this.querySelector("#alert-slot")!;

        this.videoInput.addEventListener("wa-change", () => this.previewVideo());
        this.form.addEventListener("submit", (e) => this.onSubmit(e));

        loadChannels(this.form.querySelector('wa-select[name=channel]')!);
    }

    render() {
        this.innerHTML = `
        <div id="alert-slot"></div>
        <form>
            <wa-input name="video" label="Video ID or URL" required clearable></wa-input>
            <br />
            <wa-select name="channel" label="Target channel" required hoist clearable></wa-select>
            <br />
            <wa-button type="submit" variant="brand">Move video</wa-button>
        </form>
        `;
    }

    setPreview(el: WaInput, text: string) {
        el.setAttribute('hint', text);
    }

    showAlert(variant: "danger" | "success", message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async previewVideo() {
        const id = extractId(this.videoInput.value);
        if (!id) {
            this.setPreview(this.videoInput, "");
            return;
        }
        const { ok, data } = await fetchJson<VideoDoc>(`/api/video/${encodeURIComponent(id)}`);
        if (!ok) {
            this.setPreview(this.videoInput, data.message);
            return;
        }
        this.setPreview(this.videoInput, `${data.title} — currently in ${data.channel.channel_name}`);
    }

    async onSubmit(e: Event) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const videoId = extractId(formData.get('video') as string);
        const channelId = formData.get('channel') as string;
        if (!videoId || !channelId) {
            this.showAlert("danger", "Both a video and a target channel are required.");
            return;
        }

        this.submitBtn.loading = true;

        const { ok, data } = await postJson<MoveResult>("/api/move-video", { videoId, channelId } satisfies MoveQuery);
        if (ok) {
            this.showAlert(
                "success",
                `Moved ${data.videoId} to ${data.toChannelId} (${data.movedFiles} file(s)).`,
            );
            this.videoInput.setAttribute('value', '');
            this.setPreview(this.videoInput, "");
        } else {
            this.showAlert("danger", data.message);
        }

        this.submitBtn.loading = false;
    }
}

customElements.define("move-form", MoveForm);
