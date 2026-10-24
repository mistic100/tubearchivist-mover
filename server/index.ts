import { version } from '../package.json';
import indexHtml from '../public/index.html';
import { config } from './config';
import {
    handleCreateChannel,
    handleEditChannel,
    handleGetChannel,
    handleGetChannelVideos,
    handleGetImports,
    handleGetVideo,
    handleHealth,
    handleImport,
    handleListChannels,
    handleListVideos,
    handleMoveVideo,
    handleTrimVideo,
} from './http/routes';
import {
    handleChannelNameMismatch,
    handleEmptyChannel,
    handleFixChannelNameMismatch,
    handleFixEmptyChannel,
    handleFixMediaUrlMismatch,
    handleFixTempFiles,
    handleMediaUrlMismatch,
    handleTempFiles,
} from './http/routes.doctor';
import { handleCache, handleMedia } from './http/routes.misc';

const server = Bun.serve({
    port: config.port,
    development: process.env.NODE_ENV !== 'production',
    routes: {
        "/api/health": handleHealth,

        "/api/videos": handleListVideos,
        "/api/video/:id": handleGetVideo,
        "/api/channels": { GET: handleListChannels, POST: handleCreateChannel },
        "/api/channel/:id": { GET: handleGetChannel, POST: handleEditChannel },
        "/api/channel/:id/videos": handleGetChannelVideos,
        "/api/imports": handleGetImports,
        "/api/import": { POST: handleImport },
        "/api/move-video": { POST: handleMoveVideo },
        "/api/trim-video": { POST: handleTrimVideo },

        "/api/doctor/media-url-mismatch": handleMediaUrlMismatch,
        "/api/doctor/media-url-mismatch/fix/:id": { POST: handleFixMediaUrlMismatch },
        "/api/doctor/channel-name-mismatch": handleChannelNameMismatch,
        "/api/doctor/channel-name-mismatch/fix/:id": { POST: handleFixChannelNameMismatch },
        "/api/doctor/empty-channel": handleEmptyChannel,
        "/api/doctor/empty-channel/fix/:id": { POST: handleFixEmptyChannel },
        "/api/doctor/temp-files": handleTempFiles,
        "/api/doctor/temp-files/fix/:file": { POST: handleFixTempFiles },

        "/api/*": Response.json({ error: "NOT_FOUND", message: "Unknown API route" }, 404),

        "/cache/*": handleCache,
        "/media/*": handleMedia,

        "/": indexHtml,
    },
});

console.log(`TubeArchivist Mover ${version}`);
console.log(`Listening on ${server.url}`);
