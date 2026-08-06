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
