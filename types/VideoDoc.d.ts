import { ChannelDoc } from './ChannelDoc';

export type Subtitle = {
    media_url: string;
    [K: string]: any;
};

export type VideoDoc = {
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
};
