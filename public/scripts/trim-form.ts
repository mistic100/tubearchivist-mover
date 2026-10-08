import type WaButton from '@awesome.me/webawesome/dist/components/button/button.js';
import type WaSlider from '@awesome.me/webawesome/dist/components/slider/slider.js';
import { throttle } from 'lodash';
import { TrimQuery } from 'types/TrimQuery';
import { VideoDoc } from 'types/VideoDoc';
import { type VideoSelector } from './components/video-selector';
import { createAlert, postJson } from './utils';

function formatTime(sec: number) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const hours = Math.floor(sec / 3600);
    const minutes = Math.floor((sec % 3600) / 60);
    const seconds = Math.floor(sec % 60);
    const cents = sec - Math.floor(sec);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${cents.toFixed(1).substring(1)}`;
}

class TrimForm extends HTMLElement {
    private videoSelector: VideoSelector;
    private form: HTMLFormElement;
    private submitBtn: WaButton;
    private alertSlot: HTMLElement;
    private selectedVideo: VideoDoc | null;
    private previewVideo: HTMLVideoElement;
    private slider: WaSlider;
    private dialog: HTMLDialogElement;
    private tempVideoElt: HTMLVideoElement;

    private previousTimestamp = [0, 0];

    private loadFrame = throttle((t: number) => this.previewVideo.currentTime = t, 500);

    connectedCallback() {
        this.render();
        this.querySelector('wa-card')?.remove();
        this.videoSelector = this.querySelector('video-selector')!;
        this.form = this.querySelector('form')!;
        this.submitBtn = this.querySelector('wa-button[type="submit"]')!;
        this.alertSlot = this.querySelector('#alert-slot')!;
        this.previewVideo = this.querySelector('video') as HTMLVideoElement;
        this.slider = this.querySelector('wa-slider') as WaSlider;

        this.form.addEventListener('submit', (e) => this.onSubmit(e));

        this.videoSelector.addEventListener('video-selected', (e) => {
            this.selectVideo((e as CustomEvent).detail);
        });

        this.previewVideo.addEventListener('loadedmetadata', () => {
            this.slider.min = this.slider.minValue = 0;
            this.slider.max = this.slider.maxValue = this.previewVideo.duration;
            this.previousTimestamp = [this.slider.minValue, this.slider.maxValue];
            this.slider.dispatchEvent(new CustomEvent('input'));
        });

        this.slider.valueFormatter = formatTime;
        this.slider.addEventListener('input', () => {
            this.slider.querySelector('[slot=reference]:first-child')!.innerHTML = formatTime(this.slider.minValue);
            this.slider.querySelector('[slot=reference]:last-child')!.innerHTML = formatTime(this.slider.maxValue);

            if (this.slider.minValue !== this.previousTimestamp[0]) {
                this.loadFrame(this.slider.minValue);
            } else if (this.slider.maxValue !== this.previousTimestamp[1]) {
                this.loadFrame(this.slider.maxValue);
            }
            this.previousTimestamp = [this.slider.minValue, this.slider.maxValue];
        });

        this.dialog = this.querySelector('#trim-preview-dialog')!;
        this.tempVideoElt = this.querySelector('#trim-temp-video')! as HTMLVideoElement;

        const cancelBtn = this.dialog.querySelector('#trim-cancel-btn')!;
        const validateBtn = this.dialog.querySelector('#trim-validate-btn')!;

        // prevent closing by backdrop or cross
        this.dialog.addEventListener('wa-hide', (event: any) => {
            const src = event.detail?.source;
            if (src !== cancelBtn && src !== validateBtn) {
                event.preventDefault();
            }
        });

        cancelBtn.addEventListener('click', async () => this.cancelTrim());
        validateBtn.addEventListener('click', async () => this.validateTrim());
    }

    render() {
        this.innerHTML = `
        <div id="alert-slot"></div>
        <form>
            <video-selector></video-selector>
            <br />
            <video muted style="width:100%;display:none;"></video>
            <br />
            <wa-slider name="timestamp" range min="0" max="60" max-value="60" step="0.1" with-tooltip>
                <span slot="reference">00:00:00.0</span>
                <span slot="reference">00:01:00.0</span>
            </wa-slider>
            <br />
            <wa-button type="submit" variant="brand">Trim video</wa-button>
        </form>
        
        <wa-dialog id="trim-preview-dialog" label="Preview trimmed video">
            <video id="trim-temp-video" controls style="width:100%;"></video>
            <wa-button id="trim-cancel-btn" slot="footer" variant="default" data-dialog="close">Cancel</wa-button>
            <wa-button id="trim-validate-btn" slot="footer" variant="brand" data-dialog="close">Validate</wa-button>
        </wa-dialog>
        `;
    }

    showAlert(variant: 'danger' | 'success' | 'warning', message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async selectVideo(video: VideoDoc | null) {
        this.selectedVideo = video;

        if (!video) {
            this.previewVideo.style.display = 'none';
            return;
        }

        this.previewVideo.src = video.media_url;
        this.previewVideo.style.display = 'block';
    }

    async onSubmit(e: Event) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const video = this.selectedVideo;
        const [start, end] = formData.getAll('timestamp') as  [string, string];

        if (!video) {
            this.showAlert('danger', 'Select a video first');
            return;
        }

        if (start === end) {
            this.showAlert('danger', 'Start must be before end');
            return;
        }

        this.submitBtn.loading = true;

        const { ok, data } = await postJson<string>('/api/trim-video', {
            videoId: video.youtube_id,
            action: 'trim',
            start,
            end,
        } satisfies TrimQuery);

        this.submitBtn.loading = false;

        if (!ok) {
            this.showAlert('danger', data.message);
            return;
        }

        this.tempVideoElt.src = data;
        this.dialog.open = true;
    }

    async cancelTrim() {
        if (!this.selectedVideo) {
            return;
        }

        this.submitBtn.loading = true;

        const { ok, data } = await postJson('/api/trim-video', {
            videoId: this.selectedVideo.youtube_id,
            action: 'cancel',
        } satisfies TrimQuery);

        if (!ok) {
            this.showAlert('danger', data.message);
        }

        this.submitBtn.loading = false;
    }

    async validateTrim() {
        if (!this.selectedVideo) {
            return;
        }

        this.submitBtn.loading = true;

        const { ok, data } = await postJson('/api/trim-video', {
            videoId: this.selectedVideo.youtube_id,
            action: 'validate',
        } satisfies TrimQuery);

        if (!ok) {
            this.showAlert('danger', data.message);
        } else {
            this.showAlert('success', `Video trim success`);
            this.videoSelector.clear();
        }

        this.submitBtn.loading = false;
    }
}

customElements.define('trim-form', TrimForm);
