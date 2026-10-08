import type WaCard from '@awesome.me/webawesome/dist/components/card/card.js';
import type WaInput from '@awesome.me/webawesome/dist/components/input/input.js';
import type WaScroller from '@awesome.me/webawesome/dist/components/scroller/scroller.js';
import { debounce } from 'lodash';
import { VideoDoc } from 'types/VideoDoc';
import { createAlert, fetchJson } from '../utils';

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
                detail: this.video,
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

export class VideoSelector extends HTMLElement {
    private videoInput: WaInput;
    private scroller: WaScroller;
    private alertSlot: HTMLElement;

    connectedCallback() {
        this.render();
        this.querySelector('wa-card')?.remove();

        this.alertSlot = this.querySelector("#alert-slot")!;
        this.videoInput = this.querySelector('[name="video"]')!;
        this.scroller = this.querySelector('wa-scroller')!;

        this.videoInput.addEventListener('input', debounce(() => this.searchVideos(), 300));
        this.videoInput.addEventListener('wa-clear', () => this.searchVideos());

        this.scroller.addEventListener('video-selected', (e) => {
            const video = (e as CustomEvent).detail as VideoDoc;

            Array.from(this.scroller.content.children).forEach(el => {
                if (el instanceof VideoItem) {
                    el.setActive(video.youtube_id === el.video.youtube_id);
                }
            });
        });
    }

    render() {
        this.innerHTML = `
            <div id="alert-slot"></div>
            <wa-card><!-- preload --></wa-card>
            <wa-input name="video" label="Search video" required with-clear></wa-input>
            <wa-scroller orientation="vertical" style="max-height: 300px;"></wa-scroller>
        `;
    }

    showAlert(variant: "danger" | "success" | "warning", message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async searchVideos() {
        this.scroller.content?.replaceChildren();
        this.alertSlot.replaceChildren();
        this.unselectVideo();

        const q = this.videoInput.value || '';
        if (q.length < 3) return;

        const { ok, data } = await fetchJson<{ videos: VideoDoc[] }>(`/api/videos?q=${encodeURIComponent(q)}`);
        if (!ok) {
            this.showAlert('danger', data.message);
            return;
        }

        for (const item of data.videos) {
            const itemElt = document.createElement('video-item') as VideoItem;
            itemElt.video = item;
            this.scroller.content.appendChild(itemElt);
        }
        if (data.videos.length === 0) {
            this.showAlert('warning', 'No matching video found');
        }
    }

    unselectVideo() {
        this.dispatchEvent(
            new CustomEvent('video-selected', {
                detail: null,
                bubbles: true,
                composed: true,
            })
        );

        Array.from(this.scroller.content.children).forEach(el => {
            if (el instanceof VideoItem) {
                el.setActive(false);
            }
        });
    }

    clear() {
        this.unselectVideo();
        this.videoInput.setAttribute('value', '');
    }

}

customElements.define("video-selector", VideoSelector);
