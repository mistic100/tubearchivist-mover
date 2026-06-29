import { count, get, search, update } from "./client.ts";
import { VIDEO_INDEX } from './video.ts';

const CHANNEL_INDEX = "ta_channel";

export interface ChannelDoc {
    channel_id: string;
    channel_name: string;
    [K: string]: any;
}

export async function getAllChannels(): Promise<ChannelDoc[]> {
    return (await search<ChannelDoc>(CHANNEL_INDEX, {
        size: 10000,
    }));
}

export async function getChannel(id: string): Promise<ChannelDoc | null> {
    return get<ChannelDoc>(CHANNEL_INDEX, id);
}

/**
 * Update the channel_name on the channel document in the ta_channel index.
 */
export async function updateChannelName(id: string, newName: string): Promise<void> {
    await update(CHANNEL_INDEX, id, { channel_name: newName });
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
