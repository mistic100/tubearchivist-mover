export type ChannelDoc = {
    channel_id: string;
    channel_name: string;
    channel_description: string;
    channel_active: boolean;
    channel_last_refresh: number;
    channel_subs: number;
    channel_subscribed: boolean;
    channel_tags: string[];
    channel_tabs: string[];
    channel_thumb_url?: string;
};
