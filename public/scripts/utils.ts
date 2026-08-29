import type WaCallout from '@awesome.me/webawesome/dist/components/callout/callout.js';

type QueryResult<T> = { ok: true, data: T } | { ok: false, data: { error: string, message: string } };

async function queryWrapper<T>(query: Promise<Response>): Promise<QueryResult<T>> {
    try {
        const res = await query;
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            return { ok: false, data: { error: data.error ?? 'UNKNOWN', message: data.message ?? `Error ${res.status}: ${res.statusText}` } };
        } else {
            return { ok: true, data };
        }
    } catch (e) {
        return {
            ok: false,
            data: {
                error: 'UNKNOWN',
                message: e instanceof Error ? e.message : 'Unknown error',
            },
        };
    }
}

export async function fetchJson<T>(url: string): Promise<QueryResult<T>> {
    return queryWrapper(fetch(url));
}

export async function postJson<T>(url: string, body: Record<string, unknown>): Promise<QueryResult<T>> {
    return queryWrapper(fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    }));
}

export function createAlert(variant: "danger" | "success" | "warning", message: string): WaCallout {
    const alert = document.createElement("wa-callout") as WaCallout;
    alert.variant = variant;
    alert.innerHTML = `
    <wa-icon slot="icon" name="${variant === "success" ? "circle-check" : "circle-exclamation"}"></wa-icon>${message}
    `;
    return alert;
}

export async function processImageFile(input: HTMLInputElement, THUMB_SIZE = 900): Promise<string | undefined> {
    if (!input.files || !input.files.length) {
        return undefined;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.onload = () => {
            const src = reader.result as string;
            const img = new Image();
            img.onerror = () => reject(new Error('Invalid image'));
            img.onload = () => {
                const size = Math.min(img.width, img.height);
                const sx = Math.floor((img.width - size) / 2);
                const sy = Math.floor((img.height - size) / 2);

                const destSize = Math.min(size, THUMB_SIZE);

                const canvas = document.createElement('canvas');
                canvas.width = destSize;
                canvas.height = destSize;
                const ctx = canvas.getContext('2d')!;
                ctx.drawImage(img, sx, sy, size, size, 0, 0, destSize, destSize);

                // export as jpeg base64
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                resolve(dataUrl);
            };
            img.src = src;
        };
        reader.readAsDataURL(input.files![0]);
    });
}
