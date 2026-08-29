import { ChannelCreateQuery } from 'types/ChannelCreateQuery';
import { ChannelDoc } from 'types/ChannelDoc';
import { config } from '../config';
import { createChannel as _createChannel, getAllChannels } from '../es/channel';
import { uploadThumbnail } from '../ta/channel';
import { generateRandomId } from '../utils';

type CreateErrorCode =
    | 'INVALID_INPUT'
    | 'CHANNEL_EXISTS';

const STATUS_BY_CODE: Record<CreateErrorCode, number> = {
    INVALID_INPUT: 400,
    CHANNEL_EXISTS: 409,
};

export class CreateError extends Error {
    constructor(
        readonly code: CreateErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'CreateError';
    }

    toResponse(): Response {
        return Response.json({ error: this.code, message: this.message }, STATUS_BY_CODE[this.code]);
    }
}

export async function createChannel(payload: ChannelCreateQuery): Promise<ChannelDoc & { url: string }> {
    console.log('Create channel', payload);

    if (!payload.channelName) {
        throw new CreateError('INVALID_INPUT', 'Missing channelName');
    }

    const channels = await getAllChannels();
    if (channels.some(c => c.channel_name.toLowerCase() === payload.channelName.toLowerCase())) {
        throw new CreateError(
            'CHANNEL_EXISTS',
            `Channel name "${payload.channelName}" already exists`
        );
    }

    const newId = generateRandomId(24);
    const now = Math.round(new Date().getTime() / 1000);

    const channel: ChannelDoc = {
        channel_id: newId,
        channel_name: payload.channelName,
        channel_description: payload.channelDescription ?? '',
        channel_active: false,
        channel_last_refresh: now,
        channel_subs: 0,
        channel_subscribed: false,
        channel_tags: [],
        channel_tabs: ['videos'],
    };

    if (payload.channelThumbBase64) {
        channel.channel_thumb_url = await uploadThumbnail(newId, payload.channelThumbBase64);
    }

    await _createChannel(newId, channel);

    return {
        ...channel,
        url: `${config.taHost}/channel/${newId}`,
    };
}
