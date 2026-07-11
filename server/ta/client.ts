import { config } from '../config';

export class TaError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = "TaError";
    }
}

export async function taFetch<T>(url: string, method: "GET" | "DELETE"): Promise<T>;
export async function taFetch<T>(url: string, method: "POST", body: Record<string, unknown>): Promise<T>;
export async function taFetch<T>(url: string, method: "GET" | "POST" | "DELETE", body?: Record<string, unknown>): Promise<T> {
    const res = await fetch(
        `${config.taHost}/api/${url}`,
        {
            method: method,
            headers: {
                Authorization: `Token ${config.apiToken}`,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        }
    );

    if (!res.ok) {
        throw new TaError(
            `TA fetch failed (${res.status}): ${await res.text()}`,
            res.status,
        );
    }

    return (await res.json()) as T;
}

export async function taHealth(): Promise<boolean> {
    try {
        await taFetch('appsettings/token', 'GET');
        return true;
    
    } catch {
        return false;
    }
}
