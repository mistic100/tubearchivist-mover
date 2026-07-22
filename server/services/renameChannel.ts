import { ChannelRenameQuery } from 'types/ChannelRenameQuery';
import { ChannelRenameResult } from 'types/ChannelRenameResult';
import { getChannel, updateChannel } from '../es/channel';
import { updateChannelNameOnVideos } from '../es/video';

type RenameErrorCode =
    | "INVALID_INPUT"
    | "CHANNEL_NOT_FOUND";

const STATUS_BY_CODE: Record<RenameErrorCode, number> = {
    INVALID_INPUT: 400,
    CHANNEL_NOT_FOUND: 404,
};

export class RenameError extends Error {
    constructor(
        readonly code: RenameErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "RenameError";
    }

    toResponse(): Response {
        return Response.json({ error: this.code, message: this.message }, STATUS_BY_CODE[this.code]);
    }
}

export async function renameChannel(payload: ChannelRenameQuery): Promise<ChannelRenameResult> {
    console.log('Rename channel', payload);

    const { channelId, newName } = payload;

    if (!channelId || !newName) {
        throw new RenameError(
            "INVALID_INPUT",
            `Incomplete request`
        );
    }

    const channel = await getChannel(channelId);
    if (!channel) {
        throw new RenameError(
            "CHANNEL_NOT_FOUND",
            `Channel "${channelId}" not found`
        );
    }

    await updateChannel(channelId, { channel_name: newName });
    const updatedVideos = await updateChannelNameOnVideos(channelId, newName);

    return { updatedVideos };
}
