import type WaButton from '@awesome.me/webawesome/dist/components/button/button.js';
import type WaCard from '@awesome.me/webawesome/dist/components/card/card.js';
import type WaInput from '@awesome.me/webawesome/dist/components/input/input.js';
import type WaScroller from '@awesome.me/webawesome/dist/components/scroller/scroller.js';
import { debounce } from 'lodash';
import { MoveQuery } from 'types/MoveQuery';
import { MoveResult } from 'types/MoveResult';
import { VideoDoc } from 'types/VideoDoc';
import { loadChannels } from './common';
import { createAlert, fetchJson, postJson } from './utils';

class VideoItem extends HTMLElement {
    video: VideoDoc;

    private card: WaCard;

    connectedCallback() {
        const shadow = this.attachShadow({ mode: 'open' });
        shadow.innerHTML = this.html();

        const sheet = new CSSStyleSheet();
        sheet.replaceSync(this.css());
        shadow.adoptedStyleSheets = [sheet];

        this.card = shadow.querySelector('wa-card')!;

        this.addEventListener('click', () => this.dispatchEvent(
            new CustomEvent('video-selected', {
                detail: { youtube_id: this.video.youtube_id },
                bubbles: true,
                composed: true,
            })
        ));
    }

    setActive(active: boolean) {
        this.card.appearance = active ? 'accent' : 'outlined';
    }

    html() {
        return `
        <wa-card orientation="horizontal">
            <div slot="media" style="background-image: url(${this.video.vid_thumb_url})"></div>
            <div class="body">
                <span class="wa-text-truncate">${this.video.title}</span><br>
                <small class="wa-caption-s">${this.video.channel.channel_name}</small>
            </div>
        </wa-card>
        `;
    }

    css() {
        return `
        wa-card {
            cursor: pointer;
            margin: 0.25rem 0;

            div[slot='media'] {
                height: 100px;
                aspect-ratio: 16 / 9;
                background-size: cover;
                background-position: center;
            }

            div.body {
                display: flex;
                flex-direction: column;
                justify-content: center;
                padding: 0 1rem;
            }
        }
        wa-card::part(media) {
            flex: none;
        }
        wa-card::part(body) {
            min-width: 0;
            padding: 0;
        }

        /* copy from WA stylesheet because for some reason it is not picked up */
        .wa-text-truncate {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        `;
    }
}

customElements.define("video-item", VideoItem);

class MoveForm extends HTMLElement {
    private videoInput: WaInput;
    private scroller: WaScroller;
    private form: HTMLFormElement;
    private submitBtn: WaButton;
    private alertSlot: HTMLElement;
    private selectedVideo: string | null;

    connectedCallback() {
        this.render();
        this.querySelector('wa-card')?.remove();
        this.videoInput = this.querySelector('[name="video"]')!;
        this.form = this.querySelector("form")!;
        this.scroller = this.querySelector("wa-scroller")!;
        this.submitBtn = this.querySelector('wa-button[type="submit"]')!;
        this.alertSlot = this.querySelector("#alert-slot")!;

        this.videoInput.addEventListener("input", debounce(() => this.searchVideos(), 300));
        this.videoInput.addEventListener("wa-clear", () => this.searchVideos());
        this.form.addEventListener("submit", (e) => this.onSubmit(e));

        loadChannels(this.form.querySelector('wa-select[name=channel]')!);

        this.scroller.addEventListener('video-selected', (e) => {
            this.selectVideo((e as CustomEvent).detail.youtube_id);
        });
    }

    render() {
        this.innerHTML = `
        <div id="alert-slot"></div>
        <wa-card><!-- preload --></wa-card>
        <form>
            <wa-input name="video" label="Search video" required with-clear></wa-input>
            <wa-scroller orientation="vertical" style="max-height: 300px;"></wa-scroller>
            <br />
            <wa-select name="channel" label="Target channel" required with-clear></wa-select>
            <br />
            <wa-button type="submit" variant="brand">Move video</wa-button>
        </form>
        `;
    }

    setPreview(el: WaInput, text: string) {
        el.setAttribute('hint', text);
    }

    showAlert(variant: "danger" | "success" | "warning", message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async searchVideos() {
        this.scroller.content?.replaceChildren();
        this.alertSlot.replaceChildren();
        this.selectVideo(null);

        const q = this.videoInput.value || "";
        if (q.length < 3) {
            return;
        }

        const { ok, data } = await fetchJson<{ videos: VideoDoc[] }>(`/api/videos?q=${encodeURIComponent(q)}`);
        if (!ok) {
            this.showAlert("danger", data.message);
            return;
        }

        for (const item of data.videos) {
            const itemElt = document.createElement("video-item") as VideoItem;
            itemElt.video = item;
            this.scroller.content.appendChild(itemElt);
        }
        if (data.videos.length === 0) {
            this.showAlert('warning', 'No matching video found');
        }
    }

    selectVideo(id: string | null) {
        this.selectedVideo = id;

        Array.from(this.scroller.content.children).forEach(el => {
            if (el instanceof VideoItem) {
                el.setActive(id === el.video.youtube_id);
            }
        });
    }

    async onSubmit(e: Event) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const videoId = this.selectedVideo;
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
