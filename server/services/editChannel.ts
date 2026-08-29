import { ChannelDoc } from 'types/ChannelDoc';
import { ChannelEditQuery } from 'types/ChannelEditQuery';
import { ChannelEditResult } from 'types/ChannelEditResult';
import { getChannel, updateChannel } from '../es/channel';
import { updateChannelOnVideos } from '../es/video';
import { uploadThumbnail } from '../ta/channel';

type EditErrorCode =
    | "INVALID_INPUT"
    | "CHANNEL_NOT_FOUND";

const STATUS_BY_CODE: Record<EditErrorCode, number> = {
    INVALID_INPUT: 400,
    CHANNEL_NOT_FOUND: 404,
};

export class EditError extends Error {
    constructor(
        readonly code: EditErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "EditError";
    }

    toResponse(): Response {
        return Response.json({ error: this.code, message: this.message }, STATUS_BY_CODE[this.code]);
    }
}

export async function editChannel(channelId: string, payload: ChannelEditQuery): Promise<ChannelEditResult> {
    console.log('Edit channel', payload);

    if (!channelId || !payload.channelName) {
        throw new EditError(
            "INVALID_INPUT",
            `Incomplete request`
        );
    }

    const channel = await getChannel(channelId);
    if (!channel) {
        throw new EditError(
            "CHANNEL_NOT_FOUND",
            `Channel "${channelId}" not found`
        );
    }

    const partial: Partial<ChannelDoc> = {
        channel_name: payload.channelName,
        channel_description: payload.channelDescription,
    };

    if (payload.channelThumbBase64) {
        partial.channel_thumb_url = await uploadThumbnail(channelId, payload.channelThumbBase64);
    }

    await updateChannel(channelId, partial);
    const updatedVideos = await updateChannelOnVideos(channelId, payload);

    return { updatedVideos };
}
