import { version } from '../package.json';
import indexHtml from '../public/index.html';
import { config } from './config';
import {
    handleCreateChannel,
    handleGetChannel,
    handleGetChannelVideos,
    handleGetImports,
    handleGetVideo,
    handleHealth,
    handleImport,
    handleListChannels,
    handleListVideos,
    handleMoveVideo,
    handleRenameChannel,
} from './http/routes';
import {
    handleChannelNameMismatch,
    handleEmptyChannel,
    handleFixChannelNameMismatch,
    handleFixEmptyChannel,
    handleFixMediaUrlMismatch,
    handleMediaUrlMismatch,
} from './http/routes.doctor';

const server = Bun.serve({
    port: config.port,
    development: process.env.NODE_ENV !== 'production',
    routes: {
        "/api/health": handleHealth,

        "/api/videos": handleListVideos,
        "/api/video/:id": handleGetVideo,
        "/api/channels": handleListChannels,
        "/api/channel/:id": handleGetChannel,
        "/api/channel/:id/videos": handleGetChannelVideos,
        "/api/imports": handleGetImports,
        "/api/import": { POST: handleImport },
        "/api/create-channel": { POST: handleCreateChannel },
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

console.log(`TubeArchivist Mover ${version}`);
console.log(`Listening on ${server.url}`);
