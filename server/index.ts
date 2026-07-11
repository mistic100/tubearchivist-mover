import indexHtml from '../public/index.html';
import { config } from "./config.ts";
import {
    handleChannelNameMismatch,
    handleEmptyChannel,
    handleFixChannelNameMismatch,
    handleFixEmptyChannel,
    handleFixMediaUrlMismatch,
    handleMediaUrlMismatch,
} from './http/routes.doctor.ts';
import {
    handleGetChannel,
    handleGetChannelVideos,
    handleGetImports,
    handleGetVideo,
    handleHealth,
    handleImport,
    handleListChannels,
    handleMoveVideo,
    handleRenameChannel,
} from "./http/routes.ts";

const server = Bun.serve({
    port: config.port,
    routes: {
        "/api/health": handleHealth,

        "/api/video/:id": handleGetVideo,
        "/api/channels": handleListChannels,
        "/api/channel/:id": handleGetChannel,
        "/api/channel/:id/videos": handleGetChannelVideos,
        "/api/imports": handleGetImports,
        "/api/import": { POST: handleImport },
        "/api/move-video": { POST: handleMoveVideo },
        "/api/rename-channel": { POST: handleRenameChannel },

        "/api/doctor/media-url-mismatch": handleMediaUrlMismatch,
        "/api/doctor/media-url-mismatch/fix/:id": { POST: handleFixMediaUrlMismatch },
        "/api/doctor/channel-name-mismatch": handleChannelNameMismatch,
        "/api/doctor/channel-name-mismatch/fix/:id": { POST: handleFixChannelNameMismatch },
        "/api/doctor/empty-channel": handleEmptyChannel,
        "/api/doctor/empty-channel/fix/:id": { POST: handleFixEmptyChannel },

        "/api/*": Response.json({ error: "NOT_FOUND", message: "Unknown API route" }, 404),
        "/": indexHtml,
    },
});

console.log(`Listening on ${server.url}`);
