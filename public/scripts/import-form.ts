import { SlButton, SlSelect } from '@shoelace-style/shoelace';
import { ImportQuery } from '../../types/ImportQuery';
import { VideoDoc } from '../../types/VideoDoc';
import { loadChannels } from "./common.ts";
import { createAlert, fetchJson, postJson } from "./utils.ts";

class ImportItem extends HTMLElement {
    private form: HTMLFormElement;
    private submitBtn: SlButton;
    private channelSelect: SlSelect;
    private alertSlot: HTMLElement;

    video = '';

    connectedCallback() {
        this.render();
        this.form = this.querySelector('form')!;
        this.submitBtn = this.querySelector('sl-button[type="submit"]')!;
        this.channelSelect = this.form.querySelector('sl-select[name=channel]')!;
        this.alertSlot = this.querySelector("#alert-slot")!;

        this.form.addEventListener('submit', (e) => this.onSubmit(e));

        this.form.querySelector('sl-input[name=title]')!.setAttribute('value', this.video.replace(/\.[^.]+$/, ''));
        loadChannels(this.channelSelect);
    }

    render() {
        this.innerHTML = `
        <sl-details summary="${this.video}" style="margin-bottom: 1rem">
            <div id="alert-slot"></div>
            <form>
                <sl-input name="title" label="Video title" clearable required></sl-input>
                <br />
                <sl-select name="channel" label="Channel" required></sl-select>
                <br/>
                <sl-input type="date" name="published" label="Publish date" required></sl-input>
                <br/>
                <sl-select name="category" label="Category" required>
                    <sl-option value="Film and Animation ">Film and Animation </sl-option>
                    <sl-option value="Autos and Vehicles">Autos and Vehicles</sl-option>
                    <sl-option value="Music">Music</sl-option>
                    <sl-option value="Pets and Animals">Pets and Animals</sl-option>
                    <sl-option value="Sports">Sports</sl-option>
                    <sl-option value="Travel and Events">Travel and Events</sl-option>
                    <sl-option value="Gaming">Gaming</sl-option>
                    <sl-option value="People and Blogs">People and Blogs</sl-option>
                    <sl-option value="Comedy">Comedy</sl-option>
                    <sl-option value="Entertainment">Entertainment</sl-option>
                    <sl-option value="News and Politics">News and Politics</sl-option>
                    <sl-option value="How-to and Style">How-to and Style</sl-option>
                    <sl-option value="Education">Education</sl-option>
                    <sl-option value="Science and Technology">Science and Technology</sl-option>
                    <sl-option value="Nonprofits and Activism">Nonprofits and Activism</sl-option>
                </sl-select>
                <br/>
                <sl-button type="submit" variant="primary">Import</sl-button>
            </form>
        </sl-details>
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
    private scanButton: SlButton;
    private content: HTMLElement;

    connectedCallback() {
        this.render();
        this.alertSlot = this.querySelector("#alert-slot")!;
        this.scanButton = this.querySelector('sl-button')!;
        this.content = this.querySelector("#content")!;

        this.scanButton.addEventListener("click", () => this.scan());
    }

    render() {
        this.innerHTML = `
        <sl-alert open>
            <sl-icon slot="icon" name="info-circle"></sl-icon>
            Add mp4, mkv, webm files in the <code>import</code> directory of your data folder then click "Scan".
        </sl-alert>
        <div id="alert-slot"></div>
        <sl-button type="button" variant="primary">Scan</sl-button>
        <div id="content" style="margin-top:1rem;"></div>
        `;
    }

    showAlert(variant: "danger" | "success", message: string) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async scan() {
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
