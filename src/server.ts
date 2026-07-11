import { config } from "./config.ts";
import {
    handleChannelNameMismatch,
    handleEmptyChannel,
    handleFixChannelNameMismatch,
    handleFixEmptyChannel,
    handleFixMediaUrlMismatch,
    handleMediaUrlMismatch,
} from './http/routes.doctor.ts';
import { serveStatic } from "./http/routes.static.ts";
import {
    handleGetChannel,
    handleGetChannelVideos,
    handleGetImports,
    handleGetVideo,
    handleImport,
    handleListChannels,
    handleMoveVideo,
    handleRenameChannel,
} from "./http/routes.ts";

const server = Bun.serve({
    port: config.port,
    routes: {
        "/api/video/:id": {
            GET: async (req) => handleGetVideo(req),
        },
        "/api/channels": {
            GET: async (req) => handleListChannels(req),
        },
        "/api/channel/:id": {
            GET: async (req) => handleGetChannel(req),
        },
        "/api/channel/:id/videos": {
            GET: async (req) => handleGetChannelVideos(req),
        },
        "/api/imports": {
            GET: async (req) => handleGetImports(req),
        },
        "/api/import": {
            POST: async (req) => handleImport(req),
        },
        "/api/move-video": {
            POST: async (req) => handleMoveVideo(req),
        },
        "/api/rename-channel": {
            POST: async (req) => handleRenameChannel(req),
        },

        "/api/doctor/media-url-mismatch": {
            GET: async (req) => handleMediaUrlMismatch(req),
        },
        "/api/doctor/media-url-mismatch/fix/:id": {
            POST: async (req) => handleFixMediaUrlMismatch(req),
        },
        "/api/doctor/channel-name-mismatch": {
            GET: async (req) => handleChannelNameMismatch(req),
        },
        "/api/doctor/channel-name-mismatch/fix/:id": {
            POST: async (req) => handleFixChannelNameMismatch(req),
        },
        "/api/doctor/empty-channel": {
            GET: async (req) => handleEmptyChannel(req),
        },
        "/api/doctor/empty-channel/fix/:id": {
            POST: async (req) => handleFixEmptyChannel(req),
        },

        "/api/*": Response.json(
            { error: "NOT_FOUND", message: "Unknown API route" },
            404
        ),
        "/*": async (req) => serveStatic(new URL(req.url).pathname),
    },
});

console.log(`Listening on ${server.url}`);
