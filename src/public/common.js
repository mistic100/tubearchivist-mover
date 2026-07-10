import { fetchJson } from "./utils.js";

let allChannels;

export async function loadChannels(select) {
    if (!allChannels) {
        allChannels = (await fetchJson('/api/channels')).data.channels;
    }

     for (const channel of allChannels) {
        const option = document.createElement('sl-option');
        option.value = channel.channel_id;
        option.innerText = channel.channel_name;
        select.append(option);
    }

    select.setAttribute('value', null);
}
