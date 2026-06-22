import { rename } from "node:fs/promises";
import { join } from "node:path";
import { config } from "../config.ts";
import { getChannel } from "../es/channel.ts";
import { getVideo, updateVideoChannel, type Subtitle } from "../es/video.ts";

const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export type MoveErrorCode =
    | "INVALID_INPUT"
    | "VIDEO_NOT_FOUND"
    | "ALREADY_IN_CHANNEL"
    | "CHANNEL_NOT_FOUND"
    | "SOURCE_MISSING"
    | "PREFIX_MISMATCH"
    | "MOVE_FAILED";

export class MoveError extends Error {
    constructor(
        readonly code: MoveErrorCode,
        message: string,
    ) {
        super(message);
        this.name = "MoveError";
    }
}

export interface MoveResult {
    videoId: string;
    fromChannelId: string;
    toChannelId: string;
    movedFiles: number;
}

interface FileRename {
    from: string;
    to: string;
}

export async function moveVideo(videoId: string, channelId: string): Promise<MoveResult> {
    if (!ID_PATTERN.test(videoId)) {
        throw new MoveError("INVALID_INPUT", `Invalid video id: "${videoId}"`);
    }
    if (!ID_PATTERN.test(channelId)) {
        throw new MoveError("INVALID_INPUT", `Invalid channel id: "${channelId}"`);
    }

    const video = await getVideo(videoId);
    if (!video) {
        throw new MoveError("VIDEO_NOT_FOUND", `Video "${videoId}" not found`);
    }

    const oldChannelId = video.channel.channel_id;
    if (oldChannelId === channelId) {
        throw new MoveError(
            "ALREADY_IN_CHANNEL",
            `Video "${videoId}" is already in channel "${channelId}"`,
        );
    }

    const channel = await getChannel(channelId);
    if (!channel) {
        throw new MoveError("CHANNEL_NOT_FOUND", `Channel "${channelId}" not found`);
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
                    `Source file not found: ${sourceMp4}`,
                );
            }
            await rename(r.from, r.to);
            completed.push(r);
        }

        await updateVideoChannel(videoId, {
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
                `Move failed and files were rolled back: ${err instanceof Error ? err.message : String(err)
                }`,
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
