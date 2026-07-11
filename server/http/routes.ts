import { BunRequest } from 'bun';
import fs from 'node:fs';
import { access } from 'node:fs/promises';
import { ChannelRenameQuery } from '../../types/ChannelRenameQuery';
import { HealthResult } from '../../types/HealthResult';
import { ImportQuery } from '../../types/ImportQuery';
import { MoveQuery } from '../../types/MoveQuery';
import { config } from '../config.ts';
import { getAllChannels, getChannel } from "../es/channel.ts";
import { esHealth } from '../es/client.ts';
import { getVideo, listChannelVideoIds } from "../es/video.ts";
import { ImportError, importVideo, listImportFiles } from '../services/importVideo.ts';
import { MoveError, moveVideo } from "../services/moveVideo.ts";
import { renameChannel, RenameError } from '../services/renameChannel.ts';
import { taHealth } from '../ta/client.ts';

export async function handleHealth() {
    return Response.json({
        es: await esHealth(),
        ta: await taHealth(),
        data: await access(config.dataDir, fs.constants.W_OK).then(() => true).catch(() => false),
        cache: await access(config.cacheDir, fs.constants.W_OK).then(() => true).catch(() => false),
    } satisfies HealthResult);
}

export async function handleGetVideo(req: BunRequest<":id">) {
    const video = await getVideo(req.params.id);
    if (!video) {
        return Response.json({ error: "VIDEO_NOT_FOUND", message: "Video not found" }, 404);
    }
    return Response.json(video);
}

export async function handleGetChannelVideos(req: BunRequest<":id">) {
    const channel = await getChannel(req.params.id);
    if (!channel) {
        return Response.json({ error: "CHANNEL_NOT_FOUND", message: "Channel not found" }, 404);
    }

    const videoIds = await listChannelVideoIds(req.params.id);
    return Response.json({
        ...channel,
        videoIds,
    });
}

export async function handleListChannels() {
    const channels = await getAllChannels();

    return Response.json({ channels });
}

export async function handleGetChannel(req: BunRequest<":id">) {
    const channel = await getChannel(req.params.id);
    if (!channel) {
        return Response.json({ error: "CHANNEL_NOT_FOUND", message: "Channel not found" }, 404);
    }

    return Response.json({
        channel_id: channel.channel_id,
        channel_name: channel.channel_name,
    });
}

export async function handleMoveVideo(req: Request) {
    const payload = await req.json() as MoveQuery;

    try {
        const result = await moveVideo(payload);
        return Response.json(result);
    } catch (err) {
        if (err instanceof MoveError) {
            return err.toResponse();
        }
        throw err;
    }
}

export async function handleRenameChannel(req: Request) {
    const payload = await req.json() as ChannelRenameQuery;

    try {
        const result = await renameChannel(payload);
        return Response.json(result);
    } catch (err) {
        if (err instanceof RenameError) {
            return err.toResponse();
        }
        throw err;
    }
}

export async function handleGetImports() {
    const videos = await listImportFiles();
    return Response.json({ videos });
}

export async function handleImport(req: Request) {
    const payload = await req.json() as ImportQuery;

    try {
        const result = await importVideo(payload);
        return Response.json(result);
    } catch (err) {
        if (err instanceof ImportError) {
            return err.toResponse();
        }
        throw err;
    }
}
