import { config } from "./config.ts";
import { handleApi } from "./http/routes.ts";
import { serveStatic } from "./http/static.ts";

const server = Bun.serve({
    port: config.port,
    async fetch(req) {
        const url = new URL(req.url);
        if (url.pathname.startsWith("/api/")) {
            const apiRes = await handleApi(req, url);
            if (apiRes) {
                return apiRes;
            } else {
                return Response.json(
                    { error: "NOT_FOUND", message: "Unknown API route" },
                    404
                );
            }
        } else {
            return await serveStatic(url.pathname);
        }
    },
});

console.log(`Listening on ${server.url}`);
