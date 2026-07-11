import { BunRequest } from 'bun';
import { getAllChannels, getChannel } from "../es/channel.ts";
import { getVideo, listChannelVideoIds } from "../es/video.ts";
import { ImportData, ImportError, importVideo, listImportFiles } from '../services/importVideo.ts';
import { MoveError, moveVideo } from "../services/moveVideo.ts";
import { renameChannel, RenameError } from '../services/renameChannel.ts';

export async function handleGetVideo(req: BunRequest<":id">) {
    const video = await getVideo(req.params.id);
    if (!video) {
        return Response.json({ error: "VIDEO_NOT_FOUND", message: "Video not found" }, 404);
    }
    return Response.json({
        youtube_id: video.youtube_id,
        channel_id: video.channel.channel_id,
        channel_name: video.channel.channel_name,
        title: video.title,
    });
}

export async function handleGetChannelVideos(req: BunRequest<":id">) {
    const channel = await getChannel(req.params.id);
    if (!channel) {
        return Response.json({ error: "CHANNEL_NOT_FOUND", message: "Channel not found" }, 404);
    }

    const videoIds = await listChannelVideoIds(req.params.id);
    return Response.json({
        channel_id: channel.channel_id,
        channel_name: channel.channel_name,
        count: videoIds.length,
        videoIds,
    });
}

export async function handleListChannels(req: Request) {
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
    const payload = await req.json() as { videoId: string; channelId: string };

    try {
        const result = await moveVideo(payload.videoId, payload.channelId);
        return Response.json(result);
    } catch (err) {
        if (err instanceof MoveError) {
            return err.toResponse();
        }
        throw err;
    }
}

export async function handleRenameChannel(req: Request) {
    const payload = await req.json() as  { channelId: string; newName: string };

    try {
        const result = await renameChannel(payload.channelId, payload.newName);
        return Response.json(result);
    } catch (err) {
        if (err instanceof RenameError) {
            return err.toResponse();
        }
        throw err;
    }
}

export async function handleGetImports(req: Request) {
    const videos = await listImportFiles();
    return Response.json({ videos });
}

export async function handleImport(req: Request) {
    const payload = await req.json() as ImportData;

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
