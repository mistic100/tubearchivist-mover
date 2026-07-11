import { type SlAlert } from '@shoelace-style/shoelace';

export function extractId(input: string): string {
    if (!input) {
        return "";
    }
    const value = String(input).trim();
    if (!value) {
        return "";
    }
    return value.split('/').pop() ?? "";
}

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

export function createAlert(variant: "danger" | "success" | "warning", message: string): SlAlert {
    const alert = document.createElement("sl-alert") as SlAlert;
    alert.variant = variant;
    alert.closable = true;
    alert.open = true;
    alert.innerHTML = `
    <sl-icon slot="icon" name="${variant === "success" ? "check2-circle" : "exclamation-octagon"}"></sl-icon>${message}
    `;
    return alert;
}
