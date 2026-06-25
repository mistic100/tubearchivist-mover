import { get, update } from "./client.ts";

const CHANNEL_INDEX = "ta_channel";

export interface ChannelDoc {
    channel_id: string;
    channel_name: string;
    [K: string]: any;
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
