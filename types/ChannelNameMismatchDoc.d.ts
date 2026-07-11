import { VideoDoc } from './VideoDoc';

export type ChannelNameMismatchDoc = VideoDoc & { actual_channel_name: string };
