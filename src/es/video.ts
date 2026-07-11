import { ChannelDoc, getAllChannels } from './channel.ts';
import { create, get, search, update, updateByQuery } from "./client.ts";

export const VIDEO_INDEX = "ta_video";

export interface Subtitle {
    media_url: string;
    [K: string]: any;
}

export interface VideoDoc {
    active: boolean;
    category: string[];
    date_downloaded: number;
    published: number;
    tags: string[];
    title: string;
    vid_last_refresh: number;
    vid_thumb_url: string;
    vid_type: "videos" | "streams";
    youtube_id: string;
    description: string;
    channel: ChannelDoc;
    stats: {
        view_count: number;
        like_count: number;
        dislike_count: number;
        average_rating: number;
    };
    media_url: string;
    player: {
        duration: number;
        duration_str: string;
        watched: boolean;
        watched_date?: number;
    };
    streams: Array<{
        index: number;
        bitrate: number;
        codec: string;
        type: string;
        width?: number;
        height?: number;
    }>;
    media_size: number;
    subtitles?: Subtitle[];
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

export async function updateVideo(
    id: string,
    partial: Partial<VideoDoc>,
): Promise<void> {
    await update(VIDEO_INDEX, id, partial);
}

export async function createVideo(
    id: string,
    video: VideoDoc,
): Promise<void> {
    await create(VIDEO_INDEX, id, video as any);
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
