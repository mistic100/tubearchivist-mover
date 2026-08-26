import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ChannelCreateQuery } from 'types/ChannelCreateQuery';
import { ChannelDoc } from 'types/ChannelDoc';
import { config } from '../config';
import { createChannel as _createChannel, getAllChannels } from '../es/channel';
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

    // If a thumbnail was provided (data URL or base64), store it in cacheDir/channels
    if (payload.channelThumbBase64) {
        try {
            const dataUrl = payload.channelThumbBase64;
            const match = dataUrl.match(/^data:\w+\/(\w+);base64,(.*)$/);
            const base64 = match ? match[2] : dataUrl;
            const destDir = join(config.cacheDir, 'channels');
            await mkdir(destDir, { recursive: true });
            const destPath = join(destDir, `${newId}_thumb.jpg`);
            await writeFile(destPath, Buffer.from(base64, 'base64'));
        } catch (err) {
            console.error('Failed to store channel thumbnail', err);
        }
    }

    await _createChannel(newId, channel);

    return {
        ...channel,
        url: `${config.taHost}/channel/${newId}`,
    };
}
