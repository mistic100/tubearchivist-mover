import type WaSelect from '@awesome.me/webawesome/dist/components/select/select.js';
import { ChannelDoc } from 'types/ChannelDoc';
import { fetchJson } from './utils';

let allChannels: Promise<ChannelDoc[]>;

export async function loadChannels(select: WaSelect) {
    if (!allChannels) {
        allChannels = fetchJson<{ channels: ChannelDoc[] }>('/api/channels')
            .then(({ ok, data }) => ok ? data.channels : [])
            .then(channels => channels.sort((a, b) => a.channel_name.localeCompare(b.channel_name)));
    }

    for (const channel of await allChannels) {
        const option = document.createElement('wa-option');
        option.value = channel.channel_id;
        option.innerText = channel.channel_name;
        select.append(option);
    }

    select.setAttribute('value', null as any);
}
