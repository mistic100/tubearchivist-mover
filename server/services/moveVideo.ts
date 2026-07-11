import { mkdir, rename } from "node:fs/promises";
import { dirname, join } from "node:path";
import { MoveQuery } from '../../types/MoveQuery';
import { MoveResult } from '../../types/MoveResult';
import { Subtitle } from '../../types/VideoDoc';
import { config } from "../config.ts";
import { getChannel } from "../es/channel.ts";
import { getVideo, updateVideo } from "../es/video.ts";

type MoveErrorCode =
    | "INVALID_INPUT"
    | "VIDEO_NOT_FOUND"
    | "ALREADY_IN_CHANNEL"
    | "CHANNEL_NOT_FOUND"
    | "SOURCE_MISSING"
    | "PREFIX_MISMATCH"
    | "MOVE_FAILED";

const STATUS_BY_CODE: Record<MoveErrorCode, number> = {
    INVALID_INPUT: 400,
    VIDEO_NOT_FOUND: 404,
    ALREADY_IN_CHANNEL: 409,
    CHANNEL_NOT_FOUND: 404,
    SOURCE_MISSING: 404,
    PREFIX_MISMATCH: 422,
    MOVE_FAILED: 500,
};

export class MoveError extends Error {
    constructor(
        readonly code: MoveErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "MoveError";
    }

    toResponse(): Response {
        return Response.json({ error: this.code, message: this.message }, STATUS_BY_CODE[this.code]);
    }
}

interface FileRename {
    from: string;
    to: string;
}

export async function moveVideo(payload: MoveQuery): Promise<MoveResult> {
    console.log('Move video', payload);

    const { videoId, channelId } = payload;

    if (!videoId || !channelId) {
        throw new MoveError(
            "INVALID_INPUT",
            `Incomplete request`
        );
    }

    const video = await getVideo(videoId);
    if (!video) {
        throw new MoveError(
            "VIDEO_NOT_FOUND",
            `Video "${videoId}" not found`
        );
    }

    const oldChannelId = video.channel.channel_id;
    if (oldChannelId === channelId) {
        throw new MoveError(
            "ALREADY_IN_CHANNEL",
            `Video "${videoId}" is already in channel "${channelId}"`
        );
    }

    const channel = await getChannel(channelId);
    if (!channel) {
        throw new MoveError(
            "CHANNEL_NOT_FOUND",
            `Channel "${channelId}" not found`
        );
    }

    const renames: FileRename[] = [];

    // Compute the main mp4 rename.
    const sourceMp4 = join(config.dataDir, oldChannelId, `${videoId}.mp4`);
    const targetMp4 = join(config.dataDir, channelId, `${videoId}.mp4`);
    renames.push({ from: sourceMp4, to: targetMp4 });

    // Compute subtitle renames + rewritten media_urls.
    const newSubtitles: Subtitle[] = [];
    if (video.subtitles) {
        for (const sub of video.subtitles) {
            const fileName = sub.media_url.split('/').pop() as string;
            renames.push({
                from: join(config.dataDir, oldChannelId, fileName),
                to: join(config.dataDir, channelId, fileName),
            });
            newSubtitles.push({ ...sub, media_url: sub.media_url.replace(oldChannelId, channelId) });
        }
    }

    // Perform filesystem moves, tracking what we did for rollback.
    const completed: FileRename[] = [];
    try {
        for (const r of renames) {
            if (!(await Bun.file(r.from).exists())) {
                throw new MoveError(
                    "SOURCE_MISSING",
                    `Source file not found: ${r.from}`
                );
            }
            console.log(`Move "${r.from}" to "${r.to}"`);
            await mkdir(dirname(r.to), { recursive: true });
            await rename(r.from, r.to);
            completed.push(r);
        }

        await updateVideo(videoId, {
            channel: channel,
            media_url: video.media_url.replace(oldChannelId, channelId),
            subtitles: newSubtitles.length > 0 ? newSubtitles : undefined,
        });
    } catch (err) {
        // Rollback every completed rename.
        for (const r of completed) {
            try {
                await rename(r.to, r.from);
            } catch (e) {
                console.error(`Rollback failed: could not move ${r.from} -> ${r.to}:`, err);
            }
        }
        if (err instanceof MoveError) {
            throw err;
        } else {
            throw new MoveError(
                "MOVE_FAILED",
                `Move failed and files were rolled back: ${err instanceof Error ? err.message : String(err)}`,
            );
        }
    }

    return {
        videoId,
        fromChannelId: oldChannelId,
        toChannelId: channelId,
        movedFiles: completed.length,
    };
}
