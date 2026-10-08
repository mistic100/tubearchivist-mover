import { join } from 'node:path';
import { config } from '../config';

function isRequestValid(filepath: string, extension: string): boolean {
    return !!filepath
        && filepath.endsWith("." + extension)
        && !filepath.includes("..")
        && !filepath.includes('\\');
}

/**
 * Serve JPG files from the cache dir
 */
export async function handleCache(req: Request) {
    const pathname = new URL(req.url).pathname;
    const requestedFile = pathname.replace(/^\/cache\/+/, "");

    if (!isRequestValid(requestedFile, "jpg")) {
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

/**
 * Serve MP4 files from the data dir
 */
export async function handleMedia(req: Request) {
    const pathname = new URL(req.url).pathname;
    const requestedFile = pathname.replace(/^\/media\/+/, "");

    if (!isRequestValid(requestedFile, "mp4")) {
        return new Response("Invalid request", {
            status: 400,
            headers: { "Content-Type": "text/plain" },
        });
    }

    const filePath = join(config.dataDir, requestedFile);

    const file = Bun.file(filePath);
    if (!(await file.exists())) {
        return new Response("Video not found", {
            status: 404,
            headers: { "Content-Type": "text/plain" },
        });
    }

    return new Response(file, {
        headers: {
            "Content-Type": "video/mp4",
            "Accept-Ranges": "bytes",
        },
    });
}
