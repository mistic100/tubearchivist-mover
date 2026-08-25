import { ChannelDoc } from 'types/ChannelDoc';
import { count, create, get, search, update } from './client';
import { VIDEO_INDEX } from './video';

const CHANNEL_INDEX = "ta_channel";


export async function getAllChannels(): Promise<ChannelDoc[]> {
    return (await search<ChannelDoc>(CHANNEL_INDEX, {
        size: 10000,
    }));
}

export async function getChannel(id: string): Promise<ChannelDoc | null> {
    return get<ChannelDoc>(CHANNEL_INDEX, id);
}

export async function createChannel(
    id: string,
    channel: ChannelDoc,
): Promise<void> {
    await create(CHANNEL_INDEX, id, channel as any);
}

/**
 * Update the channel.
 */
export async function updateChannel(id: string, partial: Partial<ChannelDoc>): Promise<void> {
    await update(CHANNEL_INDEX, id, partial);
}

/**
 * List channels with no videos.
 */
export async function listEmptyChannels(): Promise<ChannelDoc[]> {
    const results: ChannelDoc[] = [];

    for (const channel of await getAllChannels()) {
        if ((await count(VIDEO_INDEX, {
            query: { term: { "channel.channel_id": channel.channel_id } }
        })) === 0) {
            results.push(channel);
        }
    }

    return results;
}
