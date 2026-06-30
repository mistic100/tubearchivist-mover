import { BunRequest } from 'bun';
import { getChannel, updateChannelName } from "../es/channel.ts";
import { getVideo, listChannelVideoIds, updateChannelNameOnVideos } from "../es/video.ts";
import { MoveError, moveVideo } from "../services/moveVideo.ts";

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
    const payload = await req.json() as { videoId?: string; channelId?: string };
    const videoId = typeof payload.videoId === "string" ? payload.videoId : "";
    const channelId = typeof payload.channelId === "string" ? payload.channelId : "";
    if (!videoId || !channelId) {
        return Response.json({ error: "INVALID_INPUT", message: "videoId and channelId are required" }, 400);
    }

    try {
        const result = await moveVideo(videoId, channelId);
        return Response.json({ ok: true, ...result });
    } catch (err) {
        if (err instanceof MoveError) {
            return err.toResponse();
        };
        throw err;
    }
}

export async function handleRenameChannel(req: Request) {
    const payload = await req.json() as { channelId?: unknown; newName?: unknown };
    const channelId = typeof payload.channelId === "string" ? payload.channelId : "";
    const newName = typeof payload.newName === "string" ? payload.newName.trim() : "";
    if (!channelId || !newName) {
        return Response.json({ error: "INVALID_INPUT", message: "channelId and newName are required" }, 400);
    }

    const channel = await getChannel(channelId);
    if (!channel) {
        return Response.json({ error: "CHANNEL_NOT_FOUND", message: "Channel not found" }, 404);
    }

    await updateChannelName(channelId, newName);
    const updatedVideos = await updateChannelNameOnVideos(channelId, newName);
    return Response.json({
        ok: true,
        channel_id: channelId,
        channel_name: newName,
        updatedVideos,
    });
}
