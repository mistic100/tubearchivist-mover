import { $ } from "bun";
import { mkdir, readdir, rename } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { ImportQuery } from 'types/ImportQuery';
import { VideoDoc } from 'types/VideoDoc';
import { config } from '../config';
import { getChannel } from '../es/channel';
import { createVideo } from '../es/video';

const IMPORT_FOLDER = 'import';
const ALLOWED_VIDEO_EXTENSIONS = [".mp4", ".mkv", ".webm"];

/**
 * List media files in the import folder
 */
export async function listImportFiles(): Promise<string[]> {
    const channelDir = join(config.dataDir, IMPORT_FOLDER);

    return (await readdir(channelDir, { withFileTypes: true }))
        .filter((entry) => entry.isFile())
        .filter((entry) => ALLOWED_VIDEO_EXTENSIONS.includes(extname(entry.name).toLowerCase()))
        .map((entry) => entry.name);
}

type ImportErrorCode =
    | "INVALID_INPUT"
    | "SOURCE_MISSING"
    | "CHANNEL_NOT_FOUND"
    | "MOVE_FAILED"
    | "FFPROBE_FAILED";

const STATUS_BY_CODE: Record<ImportErrorCode, number> = {
    INVALID_INPUT: 400,
    SOURCE_MISSING: 404,
    CHANNEL_NOT_FOUND: 404,
    MOVE_FAILED: 500,
    FFPROBE_FAILED: 500,
};

export class ImportError extends Error {
    constructor(
        readonly code: ImportErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "ImportError";
    }

    toResponse(): Response {
        return Response.json({ error: this.code, message: this.message }, STATUS_BY_CODE[this.code]);
    }
}

type FFprobeResult = {
    "streams": {
        "codec_name": string;
        "codec_type": string;
        "width": number;
        "height": number;
        "bit_rate": string;
        "nb_frames": number;
    }[];
    "format": {
        "duration": string;
        "size": string;
    };
};

export async function importVideo(payload: ImportQuery): Promise<VideoDoc & { url: string }> {
    console.log('Import video', payload);

    if (!payload.video || !payload.channel || !payload.title || !payload.published) {
        throw new ImportError(
            "INVALID_INPUT",
            `Incomplete request`
        );
    }

    const channel = await getChannel(payload.channel);
    if (!channel) {
        throw new ImportError(
            "CHANNEL_NOT_FOUND",
            `Channel "${payload.channel}" not found`
        );
    }

    const sourceFile = join(config.dataDir, IMPORT_FOLDER, payload.video);
    if (!(await Bun.file(sourceFile).exists())) {
        throw new ImportError(
            "SOURCE_MISSING",
            `Source file not found: ${sourceFile}`
        );
    }

    const probe = await getFFprobeData(sourceFile);

    const newId = 'tam-' + generateRandomString(7);
    const now = Math.round(new Date().getTime() / 1000);
    const duration = Math.round(parseFloat(probe.format.duration));
    const published = Math.round(Date.parse(`${payload.published}`) / 1000);

    console.log(`New ID is "${newId}"`);

    await generateThumbnail(newId, probe, sourceFile);

    try {
        const destinationFile = join(config.dataDir, channel.channel_id, newId + extname(sourceFile));
        console.log(`Move "${sourceFile}" to "${destinationFile}"`);
        await mkdir(dirname(destinationFile), { recursive: true });
        await rename(sourceFile, destinationFile);
    } catch (err) {
        throw new ImportError(
            "MOVE_FAILED",
            `Move failed: ${err instanceof Error ? err.message : String(err)}`
        );
    }

    const video: VideoDoc = {
        "active": false,
        "category": payload.category ? [payload.category] : [],
        "date_downloaded": now,
        "published": published,
        "tags": [],
        "title": payload.title,
        "vid_last_refresh": now,
        "vid_thumb_url": "",
        "vid_type": "videos",
        "youtube_id": newId,
        "description": "",
        "channel": channel,
        "stats": {
            "view_count": 0,
            "like_count": 0,
            "dislike_count": 0,
            "average_rating": 0
        },
        "media_url": `${channel.channel_id}/${newId + extname(sourceFile)}`,
        "player": {
            "duration": duration,
            "duration_str": formatDuration(duration),
            "watched": false
        },
        "streams": probe.streams.map((stream, i) => ({
            index: i,
            bitrate: parseInt(stream.bit_rate, 10),
            codec: stream.codec_name,
            type: stream.codec_type,
            width: stream.width,
            height: stream.height,
        })),
        "media_size": parseInt(probe.format.size, 10),
    };

    console.log('Create new video', video);
    await createVideo(newId, video);

    return {
        ...video,
        url: `${config.taHost}/video/${newId}`,
    };
}

function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';

    const randomValues = new Uint32Array(length);
    crypto.getRandomValues(randomValues);

    let result = '';
    randomValues.forEach((value) => {
        result += characters.charAt(value % characters.length);
    });
    return result;
}

function formatDuration(duration: number): string {
    if (!isFinite(duration) || duration <= 0) return "0s";

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);

    return parts.length > 0 ? parts.join(' ') : '0s';
}

async function getFFprobeData(sourceFile: string): Promise<FFprobeResult> {
    try {
        const probe = await $`ffprobe "${sourceFile}" -print_format json -show_entries format=duration,size:stream=codec_name,codec_type,bit_rate,nb_frames,width,height -v quiet`.json();
        console.log('FFprobe result', probe);
        return probe;
    } catch (err) {
        throw new ImportError(
            "FFPROBE_FAILED",
            `Cannot analyze video file: ${err instanceof Error ? err.message : String(err)}`
        );
    }
}

async function generateThumbnail(newId: string, probe: FFprobeResult, sourceFile: string) {
    try {
        const destinationThumb = join(config.cacheDir, 'videos', newId[0], newId + '.jpg');
        const frame = Math.round(probe.streams.find(s => s.codec_type === 'video')!.nb_frames * 0.1);

        if (isFinite(frame)) {
            console.log(`Generate thumbnail`, destinationThumb);
            await $`ffmpeg -i "${sourceFile}" -vf "select=eq(n\\,${frame}),scale=1280:-2" -frames:v 1 -q:v 2 "${destinationThumb}"`;
        } else {
            console.warn(`Cannot generate thumbnail`);
        }
    } catch (err) {
        console.error(`Failed to generate thumbnail: ${err instanceof Error ? err.message : String(err)}`);
    }
}
