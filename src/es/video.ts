import { ChannelDoc, getAllChannels } from './channel.ts';
import { get, search, update, updateByQuery } from "./client.ts";

export const VIDEO_INDEX = "ta_video";

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
        size: 10000,
    });
    return hits.map((h) => h.youtube_id);
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

/**
 * Update channel.channel_name on every video belonging to a channel.
 * Returns the number of videos updated.
 */
export async function updateChannelNameOnVideos(
    channelId: string,
    newName: string,
): Promise<number> {
    return updateByQuery(VIDEO_INDEX, {
        query: { term: { "channel.channel_id": channelId } },
        script: {
            source: "ctx._source.channel.channel_name = params.name",
            lang: "painless",
            params: { name: newName },
        },
    });
}

/**
 * Lists all videos where the media_url does not match the channel_id
 */
export async function listMediaUrlMismatch(): Promise<VideoDoc[]> {
    return search<VideoDoc>(VIDEO_INDEX, {
        "query": {
            "bool": {
                "filter": {
                    "script": {
                        "script": {
                            "source": "!doc['media_url'].value.startsWith(doc['channel.channel_id'].value)",
                            "lang": "painless"
                        }
                    }
                }
            }
        },
        size: 10000,
    });
}

/**
 * Lists all videos where the channel_name does not match with the ta_channel index
 */
export async function listChannelNameMismatch(): Promise<(VideoDoc & { actual_channel_name: string })[]> {
    const results: (VideoDoc & { actual_channel_name: string })[] = [];

    for (const channel of await getAllChannels()) {
        const hits = await search<VideoDoc>(VIDEO_INDEX, {
            "query": {
                "bool": {
                    "must": {
                        "term": {
                            "channel.channel_id": channel.channel_id
                        }
                    },
                    "must_not": {
                        "match_phrase": {
                            "channel.channel_name": channel.channel_name
                        }
                    }
                }
            },
            size: 10000,
        });

        results.push(...hits.map(hit => ({
            ...hit,
            actual_channel_name: channel.channel_name
        })));
    }

    return results;
}
