import { createAlert, fetchJson, postJson } from './utils.js';

class TaDoctorBase extends HTMLElement {
    _loaded = false;
    _title = 'TODO';
    _url = 'TODO';

    connectedCallback() {
        this.render();
        this.details = this.querySelector('sl-details');
        this.content = this.querySelector('#content');
        this.spinner = this.querySelector('sl-spinner');
        this.alertSlot = this.querySelector("#alert-slot");
        this.fixBtn = this.querySelector('sl-button');

        this.details.addEventListener('sl-show', () => this.load());
        this.fixBtn.addEventListener('click', () => this.runFix());
    }

    render() {
        this.innerHTML = `
        <sl-details summary="${this._title}" style="margin-bottom: 1rem">
            <sl-spinner></sl-spinner>
            <div id="alert-slot"></div>
            <div id="content"></div>
            <sl-button variant="primary" style="display: none">Fix all</sl-button>
        </sl-details>

        <style>
        .details-container {
            white-space: nowrap;
            text-overflow: ellipsis;
            display: block;
            overflow: hidden;
        }
        </style>
        `;
    }

    showAlert(variant, message) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async load() {
        if (this._loaded) {
            return;
        }

        this.spinner.style.display = '';

        const { ok, data } = await fetchJson(this._url);
        this.spinner.style.display = 'none';
        this._loaded = true;

        if (ok) {
            for (const video of data.videos) {
                const alert = document.createElement("sl-alert");
                alert.variant = "warning";
                alert.open = true;
                const container = document.createElement('div');
                container.className = 'details-container';
                container.innerHTML = this.formatItem(video);
                alert.appendChild(container);
                this.content.appendChild(alert);
            }
            if (data.videos.length === 0) {
                this.showAlert('success', 'No problem detected');
            } else {
                // this.fixBtn.style.display = '';
            }
        } else {
            this.showAlert("danger", data.message);
        }
    }

    async runFix() {
        this.fixBtn.loading = true;

        const { ok, data } = await postJson(this._url, {});
        if (ok) {
            this._loaded = false;
            await this.load();
        } else {
            this.showAlert("danger", data.message);
        }

        this.fixBtn.loading = false;
    }

    formatItem(video) {
        return 'TODO';
    }
}

class TaDoctorMediaUrlMismatch extends TaDoctorBase {
    _title = 'media_url mismatch';
    _url = '/api/doctor/media-url-mismatch';

    formatItem(video) {
        return `
        youtube_id: <strong><code>${video.youtube_id}</code></strong><br>
        title: ${video.title}<br>
        channel_id: <code>${video.channel.channel_id}</code><br>
        media_url: <strong><code>${video.media_url}</code></strong>
        `;
    }
}

customElements.define("ta-doctor-media-url-mismatch", TaDoctorMediaUrlMismatch);

class TaDoctorChannelNameMismatch extends TaDoctorBase {
    _title = 'channel_name mismatch';
    _url = '/api/doctor/channel-name-mismatch';

    formatItem(video) {
        return `
        youtube_id: <strong><code>${video.youtube_id}</code></strong><br>
        title: ${video.title}<br>
        channel_id: <code>${video.channel.channel_id}</code><br>
        channel_name: ${video.channel.channel_name}<br>
        actual channel_name: <strong>${video.actual_channel_name}</strong>
        `;
    }
}

customElements.define("ta-doctor-channel-name-mismatch", TaDoctorChannelNameMismatch);

class TaDoctor extends HTMLElement {
    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
        <ta-doctor-media-url-mismatch></ta-doctor-media-url-mismatch>
        <ta-doctor-channel-name-mismatch></ta-doctor-channel-name-mismatch>
        `;
    }
}

customElements.define("ta-doctor", TaDoctor);
