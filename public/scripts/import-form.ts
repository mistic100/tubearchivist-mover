import type WaButton from '@awesome.me/webawesome/dist/components/button/button.js';
import type WaSelect from '@awesome.me/webawesome/dist/components/select/select.js';
import { ImportQuery } from 'types/ImportQuery';
import { VideoDoc } from 'types/VideoDoc';
import { loadChannels } from './common';
import { createAlert, fetchJson, postJson } from './utils';

class ImportItem extends HTMLElement {
    private form: HTMLFormElement;
    private submitBtn: WaButton;
    private channelSelect: WaSelect;
    private alertSlot: HTMLElement;

    video = '';

    connectedCallback() {
        this.render();
        this.form = this.querySelector('form')!;
        this.submitBtn = this.querySelector('wa-button[type="submit"]')!;
        this.channelSelect = this.form.querySelector('wa-select[name="channel"]')!;
        this.alertSlot = this.querySelector("#alert-slot")!;

        this.form.addEventListener('submit', (e) => this.onSubmit(e));

        this.form.querySelector('wa-input[name=title]')!.setAttribute('value', this.video.replace(/\.[^.]+$/, ''));
        loadChannels(this.channelSelect);
    }

    render() {
        this.innerHTML = `
        <wa-details summary="${this.video}" style="margin-bottom: 1rem">
            <div id="alert-slot"></div>
            <form>
                <wa-input name="title" label="Video title" clearable required></wa-input>
                <br />
                <wa-select name="channel" label="Channel" required></wa-select>
                <br/>
                <wa-input type="date" name="published" label="Publish date" required></wa-input>
                <br/>
                <wa-select name="category" label="Category" required>
                    <wa-option value="Film and Animation ">Film and Animation </wa-option>
                    <wa-option value="Autos and Vehicles">Autos and Vehicles</wa-option>
                    <wa-option value="Music">Music</wa-option>
                    <wa-option value="Pets and Animals">Pets and Animals</wa-option>
                    <wa-option value="Sports">Sports</wa-option>
                    <wa-option value="Travel and Events">Travel and Events</wa-option>
                    <wa-option value="Gaming">Gaming</wa-option>
                    <wa-option value="People and Blogs">People and Blogs</wa-option>
                    <wa-option value="Comedy">Comedy</wa-option>
                    <wa-option value="Entertainment">Entertainment</wa-option>
                    <wa-option value="News and Politics">News and Politics</wa-option>
                    <wa-option value="How-to and Style">How-to and Style</wa-option>
                    <wa-option value="Education">Education</wa-option>
                    <wa-option value="Science and Technology">Science and Technology</wa-option>
                    <wa-option value="Nonprofits and Activism">Nonprofits and Activism</wa-option>
                </wa-select>
                <br/>
                <wa-button type="submit" variant="brand">Import</wa-button>
            </form>
        </wa-details>
        `;
    }

    showAlert(variant: "danger" | "success", message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async onSubmit(e: Event) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const title = (formData.get('title') as string).trim();
        const channel = formData.get('channel') as string;
        const published = formData.get('published') as string;
        const category = formData.get('category') as string;

        if (!title || !channel || !published || !category) {
            this.showAlert("danger", "All fields are required.");
            return;
        }

        this.submitBtn.loading = true;

        const { ok, data } = await postJson<VideoDoc & { url: string }>("/api/import", {
            video: this.video,
            title,
            channel,
            published,
            category,
        } satisfies ImportQuery);

        if (ok) {
            this.showAlert(
                "success",
                `Video imported: <a href="${data.url}">${data.title}</a>`
            );
            this.form.remove();
        } else {
            this.showAlert("danger", data.message);
        }

        this.submitBtn.loading = false;
    }

}

customElements.define("import-item", ImportItem);

class ImportForm extends HTMLElement {
    private alertSlot: HTMLElement;
    private scanButton: WaButton;
    private content: HTMLElement;

    connectedCallback() {
        this.render();
        this.alertSlot = this.querySelector("#alert-slot")!;
        this.scanButton = this.querySelector('wa-button')!;
        this.content = this.querySelector("#content")!;

        this.scanButton.addEventListener("click", () => this.scan());
    }

    render() {
        this.innerHTML = `
        <wa-callout variant="neutral">
            <wa-icon slot="icon" name="info-circle"></wa-icon>
            Add mp4, mkv, webm files in the <code>import</code> directory of your data folder then click "Scan".
        </wa-callout>
        <div id="alert-slot"></div>
        <wa-button type="button" variant="brand">Scan</wa-button>
        <div id="content" style="margin-top:1rem;"></div>
        `;
    }

    showAlert(variant: "danger" | "success", message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async scan() {
        this.alertSlot.replaceChildren();
        this.content.replaceChildren();
        this.scanButton.loading = true;

        const { ok, data } = await fetchJson<{ videos: string[] }>(`/api/imports`);
        if (!ok) {
            this.showAlert("danger", data.message);
        } else {
            if (!data.videos.length) {
                this.showAlert("success", 'No videos found in "import" folder');
            }

            for (const video of data.videos) {
                const itemElt = document.createElement('import-item') as ImportItem;
                itemElt.video = video;
                this.content.appendChild(itemElt);
            }
        }

        this.scanButton.loading = false;
    }
}

customElements.define("import-form", ImportForm);
