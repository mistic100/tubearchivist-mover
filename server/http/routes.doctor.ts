import { BunRequest } from 'bun';
import { getChannel, listEmptyChannels } from "../es/channel.ts";
import { getVideo, listChannelNameMismatch, listMediaUrlMismatch, updateVideo } from "../es/video.ts";
import { deleteChannel } from '../ta/channel.ts';

export async function handleMediaUrlMismatch(req: Request) {
    const videos = await listMediaUrlMismatch();
    return Response.json({ items: videos });
}

export async function handleChannelNameMismatch(req: Request) {
    const videos = await listChannelNameMismatch();
    return Response.json({ items: videos });
}

export async function handleEmptyChannel(req: Request) {
    const channels = await listEmptyChannels();
    return Response.json({ items: channels });
}

export async function handleFixMediaUrlMismatch(req: BunRequest<":id">) {
    const video = await getVideo(req.params.id);
    if (!video) {
        return Response.json({ error: "VIDEO_NOT_FOUND", message: "Video not found" }, 404);
    }

    const media_url = video.media_url.split('/');
    media_url[0] = video.channel.channel_id;
    await updateVideo(video.youtube_id, { media_url: media_url.join('/') });

    return Response.json({});
}

export async function handleFixChannelNameMismatch(req: BunRequest<":id">) {
    const video = await getVideo(req.params.id);
    if (!video) {
        return Response.json({ error: "VIDEO_NOT_FOUND", message: "Video not found" }, 404);
    }
    const channel = await getChannel(video.channel.channel_id);
    if (!channel) {
        return Response.json({ error: "CHANNEL_NOT_FOUND", message: "Channel not found" }, 404);
    }

    await updateVideo(video.youtube_id, { channel: channel });
    
    return Response.json({});
}

export async function handleFixEmptyChannel(req: BunRequest<":id">) {
    await deleteChannel(req.params.id);
    return Response.json({});
}
