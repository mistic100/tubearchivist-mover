import type WaButton from '@awesome.me/webawesome/dist/components/button/button.js';
import type WaInput from '@awesome.me/webawesome/dist/components/input/input.js';
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

class TrimSlider extends HTMLElement {
    private slider: WaSlider;
    private inputStart: WaInput;
    private inputEnd: WaInput;

    connectedCallback() {
        this.render();

        this.slider = this.querySelector<WaSlider>('#trim-slider')!;
        this.inputStart = this.querySelector<WaInput>('#trim-input-start')!;
        this.inputEnd = this.querySelector<WaInput>('#trim-input-end')!;

        this.slider.valueFormatter = formatTime;

        this.slider.addEventListener('input', () => {
            this.inputStart.value = formatTime(this.slider.minValue);
            this.inputEnd.value = formatTime(this.slider.maxValue);

            this.dispatchEvent(new CustomEvent('trim-slider-change', {
                detail: [this.slider.minValue, this.slider.maxValue],
            }));
        });

        this.inputStart.querySelector('wa-icon[name="minus"]')!.addEventListener('click', () => this.step('min', -1));
        this.inputStart.querySelector('wa-icon[name="plus"]')!.addEventListener('click', () => this.step('min', 1));
        this.inputEnd.querySelector('wa-icon[name="minus"]')!.addEventListener('click', () => this.step('max', -1));
        this.inputEnd.querySelector('wa-icon[name="plus"]')!.addEventListener('click', () => this.step('max', 1));
    }

    render() {
        this.innerHTML = `
        <wa-slider range step="0.1" with-tooltip id="trim-slider">
            <wa-input slot="reference" size="xs" placeholder="Start" readonly id="trim-input-start">
                <wa-icon name="minus" slot="start"></wa-icon>
                <wa-icon name="plus" slot="end"></wa-icon>
            </wa-input>
            <wa-input slot="reference" size="xs" placeholder="End" readonly id="trim-input-end">
                <wa-icon name="minus" slot="start"></wa-icon>
                <wa-icon name="plus" slot="end"></wa-icon>
            </wa-input>
        </wa-slider>

        <style>
            #trim-slider wa-input {
                --wa-form-control-padding-inline: 0.5em;
                width: 9.5em;
                font-size: var(--wa-font-size-xs);
            }
        </style>
        `;
    }

    reset(min: number, max: number) {
        this.slider.min = this.slider.minValue = min;
        this.slider.max = this.slider.maxValue = max;
        this.slider.dispatchEvent(new CustomEvent('input'));
    }

    step(type: 'min' | 'max', inc: 1 | -1) {
        if (type === 'min' && inc === -1) {
            this.slider.minValue = Math.max(this.slider.min, this.slider.minValue - 0.1);
        }
        if (type === 'min' && inc === 1) {
            this.slider.minValue = Math.min(this.slider.maxValue, this.slider.minValue + 0.1);
        }
        if (type === 'max' && inc === -1) {
            this.slider.maxValue = Math.max(this.slider.minValue, this.slider.maxValue - 0.1);
        }
        if (type === 'max' && inc === 1) {
            this.slider.maxValue = Math.min(this.slider.max, this.slider.maxValue + 0.1);
        }
        this.slider.dispatchEvent(new CustomEvent('input'));
    }
}

customElements.define('trim-slider', TrimSlider);

class TrimForm extends HTMLElement {
    private videoSelector: VideoSelector;
    private form: HTMLFormElement;
    private submitBtn: WaButton;
    private alertSlot: HTMLElement;
    private videoContainer: HTMLElement;
    private previewVideo: HTMLVideoElement;
    private slider: TrimSlider;
    private dialog: HTMLDialogElement;
    private tempVideoElt: HTMLVideoElement;

    private selectedVideo: VideoDoc | null;
    private selectedTimestamp = [0, 0];

    private loadFrame = throttle((t: number) => this.previewVideo.currentTime = t, 500);

    connectedCallback() {
        this.render();
        this.querySelector('wa-card')?.remove();
        this.videoSelector = this.querySelector('video-selector')!;
        this.form = this.querySelector('form')!;
        this.submitBtn = this.querySelector('wa-button[type="submit"]')!;
        this.alertSlot = this.querySelector('#alert-slot')!;
        this.videoContainer = this.querySelector('#video-container')!;
        this.previewVideo = this.querySelector('video')!;
        this.slider = this.querySelector<TrimSlider>('trim-slider')!;

        this.form.addEventListener('submit', (e) => this.onSubmit(e));

        this.videoSelector.addEventListener('video-selected', (e) => {
            this.selectVideo((e as CustomEvent).detail);
        });

        this.previewVideo.addEventListener('loadedmetadata', () => {
            const max = Math.ceil(this.previewVideo.duration * 10) / 10;
            this.slider.reset(0, max);
            this.selectedTimestamp = [0, max];
        });

        this.previewVideo.addEventListener('error', () => {
            this.selectVideo(null);
            this.showAlert('danger', 'Failed to load video');
        });

        this.slider.addEventListener('trim-slider-change', (e) => {
            const [minValue, maxValue] = (e as CustomEvent).detail as [number, number];

            if (minValue !== this.selectedTimestamp[0]) {
                this.loadFrame(minValue);
            } else if (maxValue !== this.selectedTimestamp[1]) {
                this.loadFrame(maxValue);
            }
            this.selectedTimestamp = [minValue, maxValue];
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
            <div id="video-container" style="display:none;">
                <video muted style="width:100%;"></video>
                <trim-slider></trim-slider>
                <br />
            </div>
            <wa-button type="submit" variant="brand">Trim video</wa-button>
        </form>
        
        <wa-dialog id="trim-preview-dialog" label="Preview trimmed video" style="--width: 75vw;">
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
        this.alertSlot.replaceChildren();

        this.selectedVideo = video;

        if (!video) {
            this.videoContainer.style.display = 'none';
            return;
        }

        this.previewVideo.src = video.media_url;
        this.videoContainer.style.display = 'block';
    }

    async onSubmit(e: Event) {
        e.preventDefault();

        const video = this.selectedVideo;
        const [start, end] = this.selectedTimestamp;

        if (!video) {
            this.showAlert('danger', 'Select a video first');
            return;
        }

        if (start === end) {
            this.showAlert('danger', 'Start must be before end');
            return;
        }

        this.alertSlot.replaceChildren();
        this.submitBtn.loading = true;

        const { ok, data } = await postJson<string>('/api/trim-video', {
            videoId: video.youtube_id,
            action: 'trim',
            start: formatTime(start),
            end: formatTime(end),
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
