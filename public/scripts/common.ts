import type WaSelect from '@awesome.me/webawesome/dist/components/select/select.js';
import { ChannelDoc } from 'types/ChannelDoc';
import { fetchJson } from './utils';

let allChannels: Promise<ChannelDoc[]>;
const registeredSelects = new Set<WaSelect>();

export async function loadChannels(select: WaSelect) {
    registeredSelects.add(select);

    if (!allChannels) {
        allChannels = _loadChannels();
    }

    populateSelect(select, await allChannels);
}

export async function reloadChannels() {
    allChannels = _loadChannels();

    for (const select of registeredSelects) {
        populateSelect(select, await allChannels);
    }
}

export async function getChannels(): Promise<ChannelDoc[]> {
    if (!allChannels) {
        allChannels = _loadChannels();
    }
    return await allChannels;
}

function populateSelect(select: WaSelect, channels: ChannelDoc[]) {
    select.replaceChildren();

    for (const channel of channels) {
        const option = document.createElement('wa-option');
        option.value = channel.channel_id;
        option.innerText = channel.channel_name;
        select.append(option);
    }

    select.setAttribute('value', null as any);
}

function _loadChannels(): Promise<ChannelDoc[]> {
    return fetchJson<{ channels: ChannelDoc[] }>('/api/channels')
        .then(({ ok, data }) => ok ? data.channels : [])
        .then(channels => channels.sort((a, b) => a.channel_name.localeCompare(b.channel_name)));
}
