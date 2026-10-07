import { join } from 'node:path';
import { config } from '../config';

/**
 * Serve JPG files from the cache dir
 */
export async function handleCache(req: Request) {
    const pathname = new URL(req.url).pathname;
    const requestedFile = pathname.replace(/^\/cache\/+/, "");

    if (
        !requestedFile ||
        !requestedFile.endsWith(".jpg") ||
        requestedFile.includes("..") ||
        requestedFile.includes('\\') ||
        requestedFile.startsWith('/')
    ) {
        return new Response("Invalid request", {
            status: 400,
            headers: { "Content-Type": "text/plain" },
        });
    }

    const filePath = join(config.cacheDir, requestedFile);

    const file = Bun.file(filePath);
    if (!(await file.exists())) {
        return new Response("Image not found", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
        });
    }

    return new Response(file, {
        headers: { "Content-Type": "image/jpeg" },
    });
}
