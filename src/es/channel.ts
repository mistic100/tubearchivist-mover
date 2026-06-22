import { get } from "./client.ts";

const CHANNEL_INDEX = "ta_channel";

export interface ChannelDoc {
    channel_id: string;
    channel_name: string;
    [K: string]: any;
}

export async function getChannel(id: string): Promise<ChannelDoc | null> {
    return get<ChannelDoc>(CHANNEL_INDEX, id);
}
