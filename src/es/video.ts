import { ChannelDoc } from './channel.ts';
import { get, update, search } from "./client.ts";

const VIDEO_INDEX = "ta_video";

export interface Subtitle {
    media_url: string;
    [K: string]: any;
}

export interface VideoDoc {
    youtube_id: string;
    title: string;
    media_url: string;
    channel: ChannelDoc;
    subtitles?: Subtitle[];
    [K: string]: any;
}

export async function getVideo(id: string): Promise<VideoDoc | null> {
    return get<VideoDoc>(VIDEO_INDEX, id);
}

export async function listChannelVideoIds(channelId: string): Promise<string[]> {
    const hits = await search<{ youtube_id: string }>(VIDEO_INDEX, {
        query: { term: { "channel.channel_id": channelId } },
        _source: ["youtube_id"],
        size: 1000,
    });
    return hits.map((h) => h._source.youtube_id);
}

export interface VideoChannelUpdate {
    channel: ChannelDoc;
    media_url: string;
    subtitles?: Subtitle[];
}

export async function updateVideoChannel(
    id: string,
    partial: VideoChannelUpdate,
): Promise<void> {
    await update(VIDEO_INDEX, id, partial as unknown as Record<string, unknown>);
}
