import { createAlert, extractId, fetchJson, postJson } from "./utils.js";
import { loadChannels } from "./common.js";

const generateRandomString = (length) => {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  const charactersLength = characters.length;
  let result = '';

  // Create an array of 32-bit unsigned integers
  const randomValues = new Uint32Array(length);
  
  // Generate random values
  window.crypto.getRandomValues(randomValues);
  randomValues.forEach((value) => {
    result += characters.charAt(value % charactersLength);
  });
  return result;
};

class ManualImportItem extends HTMLElement {
    video = '';

    connectedCallback() {
        this.render();
        this.details = this.querySelector('sl-details');
        this.form = this.querySelector('form');
        this.submitBtn = this.querySelector('sl-button[type="submit"]');
        this.channelSelect = this.form.querySelector('sl-select[name=channel]');
        this.alertSlot = this.querySelector("#alert-slot");

        this.form.addEventListener('submit', (e) => this.onSubmit(e));

        this.form.querySelector('sl-input[name=title]').setAttribute('value', this.video.replace(/\.[^.]+$/, ''));
        loadChannels(this.form.querySelector('sl-select[name=channel]'));
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
    
    showAlert(variant, message) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async onSubmit(e)  {
        e.preventDefault();

        const formData = new FormData(this.form);
        const title = formData.get('title').trim();
        const channel = formData.get('channel');
        const published = formData.get('published');
        const category = formData.get('category');

        if (!title || !channel || !published || !category) {
            this.showAlert("danger", "All fields are required.");
            return;
        }

        this.submitBtn.loading = true;

        try {
            const { ok, data } = await postJson("/api/import", {
                video: this.video,
                title,
                channel,
                published,
                category,
            });

            if (ok) {
                this.showAlert(
                    "success",
                    `Video imported: <a href="${data.url}">${data.title}</a>`
                );
                this.form.remove();
            }   else {
                this.showAlert("danger", data.message);
            }
        } catch (err) {
            this.showAlert("danger", `Request failed: ${err.message}`);
        } finally {
            this.submitBtn.loading = false;
        }
    }

}

customElements.define("manual-import-item", ManualImportItem);

class ManualImportForm extends HTMLElement {
    connectedCallback() {
        this.render();
        this.alertSlot = this.querySelector("#alert-slot");
        this.scanButton = this.querySelector('sl-button[type="submit"]');
        this.content = this.querySelector("#content");

        this.scanButton.addEventListener("click", () => this.scan());
    }

    render() {
        this.innerHTML = `
        <sl-alert open>
            <sl-icon slot="icon" name="info-circle"></sl-icon>
            Add mp4, mkv, webm files in the <code>import</code> directory of your data folder then click "Scan".
        </sl-alert>
        <div id="alert-slot"></div>
        <sl-button type="submit" variant="primary">Scan</sl-button>
        <div id="content" style="margin-top:1rem;"></div>
        `;
    }

    showAlert(variant, message) {
        this.alertSlot.replaceChildren(createAlert(variant, message));
    }

    async scan() {
        this.content.replaceChildren();

        const { ok, data } = await fetchJson(`/api/imports`);
        if (!ok) {
            this.showAlert("danger", data.message);
            return;
        }

        if (!data.videos.length) {
            this.showAlert("success", 'No videos found in "import" folder');
        }

        for (const video of data.videos) {
            const itemElt = document.createElement('manual-import-item');
            itemElt.video = video;
            this.content.appendChild(itemElt);
        }
    }
}

customElements.define("manual-import-form", ManualImportForm);
