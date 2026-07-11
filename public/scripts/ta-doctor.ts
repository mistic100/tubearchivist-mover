import { SlSpinner } from '@shoelace-style/shoelace';
import { ChannelDoc } from '../../types/ChannelDoc';
import { ChannelNameMismatchDoc } from '../../types/ChannelNameMismatchDoc';
import { VideoDoc } from '../../types/VideoDoc';
import { createAlert, fetchJson, postJson } from './utils.ts';

class TaDoctorItem extends HTMLElement {
    message = '';

    connectedCallback() {
        this.render();

        this.querySelector('sl-button')!.addEventListener('click', () => this.dispatchEvent(new Event('fix')));
    }

    render() {
        this.innerHTML = `
        <sl-alert variant="warning" open>
            <div class="container">
                <div class="message">
                    ${this.message}
                </div>
                <sl-button variant="primary">Fix</sl-button>
            </div>
        </sl-alert>

        <style>
        .container {
            display: flex;

            .message {
                flex: 1;
                white-space: nowrap;
                text-overflow: ellipsis;
                display: block;
                overflow: hidden;
                padding-right: 1em;
            }

            sl-button {
                flex: none;
            }
        }
        </style>
        `;
    }
}

customElements.define("ta-doctor-item", TaDoctorItem);

abstract class TaDoctorBase<T> extends HTMLElement {
    private content: HTMLElement;
    private spinner: SlSpinner;
    private alertSlot: HTMLElement;
    
    abstract _title: string;
    abstract _url: string;
    
    _loaded = false;

    connectedCallback() {
        this.render();
        this.content = this.querySelector('#content')!;
        this.spinner = this.querySelector('sl-spinner')!;
        this.alertSlot = this.querySelector("#alert-slot")!;

        this.querySelector('sl-details')!.addEventListener('sl-show', () => this.load());
    }

    render() {
        this.innerHTML = `
        <sl-details summary="${this._title}" style="margin-bottom: 1rem">
            <sl-spinner></sl-spinner>
            <div id="alert-slot"></div>
            <div id="content"></div>
        </sl-details>
        `;
    }

    showAlert(variant: "danger" | "success", message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async load() {
        if (this._loaded) {
            return;
        }

        this.spinner.style.display = '';
        this.content.replaceChildren();

        const { ok, data } = await fetchJson<{ items: T[] }>(this._url);
        this.spinner.style.display = 'none';
        this._loaded = true;

        if (ok) {
            for (const item of data.items) {
                const itemElt = document.createElement("ta-doctor-item") as TaDoctorItem;
                itemElt.message = this.formatItem(item);
                itemElt.addEventListener('fix', () => this.runFix(item));
                this.content.appendChild(itemElt);
            }
            if (data.items.length === 0) {
                this.showAlert('success', 'No problem detected');
            }
        } else {
            this.showAlert("danger", data.message);
        }
    }

    async runFix(item: T) {
        const { ok, data } = await postJson(`${this._url}/fix/${this.getItemId(item)}`, {});
        if (ok) {
            this._loaded = false;
            this.load();
        } else {
            this.showAlert("danger", data.message);
        }
    }

    abstract formatItem(item: T): string;

    abstract getItemId(item: T): string;
}

class TaDoctorMediaUrlMismatch extends TaDoctorBase<VideoDoc> {
    _title = 'media_url mismatch';
    _url = '/api/doctor/media-url-mismatch';

    formatItem(video: VideoDoc) {
        return `
        youtube_id: <strong><code>${video.youtube_id}</code></strong><br>
        title: ${video.title}<br>
        channel_id: <code>${video.channel.channel_id}</code><br>
        media_url: <strong><code>${video.media_url}</code></strong>
        `;
    }

    getItemId(video: VideoDoc) {
        return video.youtube_id;
    }
}

customElements.define("ta-doctor-media-url-mismatch", TaDoctorMediaUrlMismatch);

class TaDoctorChannelNameMismatch extends TaDoctorBase<ChannelNameMismatchDoc> {
    _title = 'channel_name mismatch';
    _url = '/api/doctor/channel-name-mismatch';

    formatItem(video: ChannelNameMismatchDoc) {
        return `
        youtube_id: <strong><code>${video.youtube_id}</code></strong><br>
        title: ${video.title}<br>
        channel_id: <code>${video.channel.channel_id}</code><br>
        channel_name: ${video.channel.channel_name}<br>
        actual channel_name: <strong>${video.actual_channel_name}</strong>
        `;
    }

    getItemId(video: ChannelNameMismatchDoc) {
        return video.youtube_id;
    }
}

customElements.define("ta-doctor-channel-name-mismatch", TaDoctorChannelNameMismatch);


class TaDoctorEmptyChannel extends TaDoctorBase<ChannelDoc> {
    _title = 'empty channel';
    _url = '/api/doctor/empty-channel';

    formatItem(channel: ChannelDoc) {
        return `
        channel_id: <code>${channel.channel_id}</code><br>
        channel_name: ${channel.channel_name}
        `;
    }

    getItemId(channel: ChannelDoc) {
        return channel.channel_id;
    }
}

customElements.define("ta-doctor-empty-channel", TaDoctorEmptyChannel);

class TaDoctor extends HTMLElement {
    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
        <ta-doctor-media-url-mismatch></ta-doctor-media-url-mismatch>
        <ta-doctor-channel-name-mismatch></ta-doctor-channel-name-mismatch>
        <ta-doctor-empty-channel></ta-doctor-empty-channel>
        `;
    }
}

customElements.define("ta-doctor", TaDoctor);
