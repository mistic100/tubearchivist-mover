import { $ } from 'bun';
import { rename, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { TrimQuery } from 'types/TrimQuery';
import { VideoDoc } from 'types/VideoDoc';
import { config } from '../config';
import { getVideo } from '../es/video';

type TrimErrorCode =
    | 'INVALID_INPUT'
    | 'VIDEO_NOT_FOUND'
    | 'TRIM_FAILED';

const STATUS_BY_CODE: Record<TrimErrorCode, number> = {
    INVALID_INPUT: 400,
    VIDEO_NOT_FOUND: 404,
    TRIM_FAILED: 500,
};

export class TrimError extends Error {
    constructor(
        readonly code: TrimErrorCode,
        message: string,
    ) {
        super(message);
        this.name = 'TrimError';
    }

    toResponse(): Response {
        return Response.json({ error: this.code, message: this.message }, STATUS_BY_CODE[this.code]);
    }
}

export async function trimVideo(payload: TrimQuery): Promise<string> {
    const { videoId, action } = payload;
    if (!videoId || !action) {
        throw new TrimError('INVALID_INPUT', 'Incomplete request');
    }

    const video = await getVideo(videoId);
    if (!video) {
        throw new TrimError('VIDEO_NOT_FOUND', `Video "${videoId}" not found`);
    }

    switch (action) {
        case 'trim':
            return trim(payload, video);
        case 'validate':
            return validate(payload, video);
        case 'cancel':
            return cancel(payload, video);
        default:
            throw new TrimError('INVALID_INPUT', 'Invalid action');
    }
}

async function trim(payload: TrimQuery, video: VideoDoc): Promise<string> {
    console.log('Trim video', payload);

    const { start, end } = payload;
    if (!start || !end) {
        throw new TrimError('INVALID_INPUT', 'Incomplete request');
    }

    const sourceFile = join(config.dataDir, video.media_url);
    const tmpFilename = getTempFilename(video);
    const tmpFile = join(config.dataDir, tmpFilename);

    try {
        console.log(`Running ffmpeg trim: ${start} -> ${end}`);
        await $`ffmpeg -y -ss ${start} -to ${end} -i "${sourceFile}" -c copy "${tmpFile}"`;

        return `/media/${tmpFilename}`;
    } catch (err) {
        console.error('Trim failed', err);
        try {
            await unlink(tmpFile);
        } catch {
            // noop
        }
        throw new TrimError('TRIM_FAILED', `Trim failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}

async function validate(payload: TrimQuery, video: VideoDoc): Promise<string> {
    console.log('Validate trim', payload);

    const sourceFile = join(config.dataDir, video.media_url);
    const tmpFilename = getTempFilename(video);
    const tmpFile = join(config.dataDir, tmpFilename);

    if (!(Bun.file(tmpFile).exists())) {
        throw new TrimError('TRIM_FAILED', `Temporary file not found`);
    }

    await rename(tmpFile, sourceFile);

    return 'ok';
}

async function cancel(payload: TrimQuery, video: VideoDoc): Promise<string> {
    console.log('Cancel trim', payload);

    const tmpFilename = getTempFilename(video);
    const tmpFile = join(config.dataDir, tmpFilename);
    
    await unlink(tmpFile);

    return 'ok';
}

function getTempFilename(video: VideoDoc): string {
    return join(video.channel.channel_id, `${video.youtube_id}.tmp.mp4`);
}
