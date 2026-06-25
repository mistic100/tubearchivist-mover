import { getChannel, updateChannelName } from "../es/channel.ts";
import { getVideo, listChannelVideoIds, updateChannelNameOnVideos } from "../es/video.ts";
import { MoveError, moveVideo, type MoveErrorCode } from "../move/orchestrator.ts";

const STATUS_BY_CODE: Record<MoveErrorCode, number> = {
    INVALID_INPUT: 400,
    VIDEO_NOT_FOUND: 404,
    ALREADY_IN_CHANNEL: 409,
    CHANNEL_NOT_FOUND: 404,
    SOURCE_MISSING: 404,
    PREFIX_MISMATCH: 422,
    MOVE_FAILED: 500,
};

/**
 * Handle an /api/* request. Returns null if the path is not an API route.
 */
export async function handleApi(req: Request, url: URL): Promise<Response | null> {
    if (req.method === "GET" && url.pathname.startsWith("/api/video/")) {
        const id = decodeURIComponent(url.pathname.slice("/api/video/".length));
        if (!id) {
            return Response.json({ error: "INVALID_INPUT", message: "Missing id" }, 400);
        }
        const video = await getVideo(id);
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

    const channelVideosMatch = url.pathname.match(/^\/api\/channel\/([^/]+)\/videos$/);
    if (req.method === "GET" && channelVideosMatch) {
        const id = decodeURIComponent(channelVideosMatch[1]);
        if (!id) {
            return Response.json({ error: "INVALID_INPUT", message: "Missing id" }, 400);
        }
        const channel = await getChannel(id);
        if (!channel) {
            return Response.json({ error: "CHANNEL_NOT_FOUND", message: "Channel not found" }, 404);
        }
        const videoIds = await listChannelVideoIds(id);
        return Response.json({
            channel_id: channel.channel_id,
            channel_name: channel.channel_name,
            count: videoIds.length,
        });
    }

    if (req.method === "GET" && url.pathname.startsWith("/api/channel/")) {
        const id = decodeURIComponent(url.pathname.slice("/api/channel/".length));
        if (!id) {
            return Response.json({ error: "INVALID_INPUT", message: "Missing id" }, 400);
        }
        const channel = await getChannel(id);
        if (!channel) {
            return Response.json({ error: "CHANNEL_NOT_FOUND", message: "Channel not found" }, 404);
        }
        return Response.json({
            channel_id: channel.channel_id,
            channel_name: channel.channel_name,
        });
    }

    if (req.method === "POST" && url.pathname === "/api/move-video") {
        let payload: { videoId?: unknown; channelId?: unknown };
        try {
            payload = await req.json() as any;
        } catch {
            return Response.json({ error: "INVALID_INPUT", message: "Invalid JSON body" }, 400);
        }
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
                return Response.json({ error: err.code, message: err.message }, STATUS_BY_CODE[err.code]);
            };
            throw err;
        }
    }

    if (req.method === "POST" && url.pathname === "/api/rename-channel") {
        let payload: { channelId?: unknown; newName?: unknown };
        try {
            payload = await req.json() as any;
        } catch {
            return Response.json({ error: "INVALID_INPUT", message: "Invalid JSON body" }, 400);
        }
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

    return null;
}
