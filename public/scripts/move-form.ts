import type WaButton from '@awesome.me/webawesome/dist/components/button/button.js';
import { MoveQuery } from 'types/MoveQuery';
import { MoveResult } from 'types/MoveResult';
import { VideoDoc } from 'types/VideoDoc';
import { loadChannels } from './common';
import { type VideoSelector } from './components/video-selector';
import { createAlert, postJson } from './utils';

class MoveForm extends HTMLElement {
    private videoSelector: VideoSelector;
    private form: HTMLFormElement;
    private submitBtn: WaButton;
    private alertSlot: HTMLElement;
    private selectedVideo: VideoDoc | null;

    connectedCallback() {
        this.render();
        this.querySelector('wa-card')?.remove();
        this.videoSelector = this.querySelector('video-selector')!;
        this.form = this.querySelector("form")!;
        this.submitBtn = this.querySelector('wa-button[type="submit"]')!;
        this.alertSlot = this.querySelector("[data-alert-slot]")!;

        this.form.addEventListener("submit", (e) => this.onSubmit(e));

        loadChannels(this.form.querySelector('wa-select[name=channel]')!);

        this.videoSelector.addEventListener('video-selected', (e) => {
            this.selectedVideo = (e as CustomEvent).detail;
        });
    }

    render() {
        this.innerHTML = `
        <div data-alert-slot></div>
        <form>
            <video-selector></video-selector>
            <br />
            <wa-select name="channel" label="Target channel" required with-clear></wa-select>
            <br />
            <wa-button type="submit" variant="brand">Move video</wa-button>
        </form>
        `;
    }

    showAlert(variant: "danger" | "success" | "warning", message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async onSubmit(e: Event) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const channelId = formData.get('channel') as string;
        if (!this.selectedVideo || !channelId) {
            this.showAlert("danger", "Both a video and a target channel are required.");
            return;
        }

        this.submitBtn.loading = true;

        const { ok, data } = await postJson<MoveResult>("/api/move-video", { 
            videoId: this.selectedVideo.youtube_id,
            channelId,
        } satisfies MoveQuery);
        if (ok) {
            this.showAlert(
                "success",
                `Moved ${data.videoId} to ${data.toChannelId} (${data.movedFiles} file(s)).`,
            );
            this.videoSelector.clear();
        } else {
            this.showAlert("danger", data.message);
        }

        this.submitBtn.loading = false;
    }
}

customElements.define("move-form", MoveForm);
