import { SlSelect } from '@shoelace-style/shoelace';
import { ChannelDoc } from "../../types/ChannelDoc";
import { fetchJson } from "./utils.ts";

let allChannels: Promise<ChannelDoc[]>;

export async function loadChannels(select: SlSelect) {
    if (!allChannels) {
        allChannels = fetchJson<{ channels: ChannelDoc[] }>('/api/channels').then(res => res.data.channels);
    }

    for (const channel of await allChannels) {
        const option = document.createElement('sl-option');
        option.value = channel.channel_id;
        option.innerText = channel.channel_name;
        select.append(option);
    }

    select.setAttribute('value', null as any);
}
