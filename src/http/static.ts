import { join, normalize, sep } from "node:path";

const PUBLIC_DIR = join(import.meta.dir, "../public");

const CONTENT_TYPES: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
};

function contentTypeFor(path: string): string | undefined {
    const dot = path.lastIndexOf(".");
    if (dot === -1) return undefined;
    return CONTENT_TYPES[path.slice(dot)];
}

/**
 * Serve a file from public/. `/` maps to index.html. Returns 404 Response if
 * the file does not exist, guarding against path traversal.
 */
export async function serveStatic(pathname: string): Promise<Response> {
    const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");

    const fullPath = normalize(join(PUBLIC_DIR, rel));

    // Guard against path traversal: the resolved path must stay inside PUBLIC_DIR.
    if (!fullPath.startsWith(PUBLIC_DIR + sep)) {
        return new Response("Not found", { status: 404 });
    }

    const file = Bun.file(fullPath);
    if (!(await file.exists())) {
        return new Response("Not found", { status: 404 });
    }

    const type = contentTypeFor(rel);
    return new Response(file, type ? { headers: { "Content-Type": type } } : undefined);
}
