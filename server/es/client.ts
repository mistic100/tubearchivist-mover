import { config } from '../config';

const authHeader =
    "Basic " +
    Buffer.from(`${config.esUser}:${config.esPassword}`).toString("base64");

export class EsError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = "EsError";
    }
}

async function esFetch<T>(url: string, method: "GET"): Promise<T>;
async function esFetch<T>(url: string, method: "POST", body: Record<string, unknown>): Promise<T>;
async function esFetch<T>(url: string, method: "GET" | "POST", body?: Record<string, unknown>): Promise<T> {
    const res = await fetch(
        `${config.esUrl}/${url}`,
        {
            method: method,
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: AbortSignal.timeout(5000),
        }
    );

    if (!res.ok) {
        throw new EsError(
            `ES fetch failed (${res.status}): ${await res.text()}`,
            res.status,
        );
    }

    return (await res.json()) as T;
}

export async function esHealth(): Promise<boolean> {
    try {
        await esFetch('_health_report', 'GET');
        return true;
    } catch {
        return false;
    }
}

/**
 * Count the number of documents matching the query.
 */
export async function count(index: string, body: Record<string, unknown>): Promise<number> {
    const res = await esFetch<{ count: number }>(`${index}/_count`, "POST", body);
    return res.count;
}

/**
 * Fetch a document source by index/id.
 */
export async function get<T>(index: string, id: string): Promise<T | null> {
    try {
        const res = await esFetch<{ _source?: T }>(`${index}/_doc/${encodeURIComponent(id)}`, "GET");
        return res._source ?? null;
    } catch(e) {
        if (e instanceof EsError && e.status === 404) {
            return null;
        }
        throw e;
    }
}

/**
 * Partial update of a document via the _update endpoint.
 */
export async function update(index: string, id: string, doc: Record<string, unknown>): Promise<void> {
    await esFetch(`${index}/_update/${encodeURIComponent(id)}?refresh=true`, "POST", { doc });
}

/**
 * Create a document.
 */
export async function create(index: string, id: string, doc: Record<string, unknown>): Promise<void> {
    await esFetch(`${index}/_doc/${encodeURIComponent(id)}?refresh=true`, "POST", doc);
}

/**
 * Run a search query and return the raw hits. Caller supplies the index and
 * request body (query, _source, size, ...).
 */
export async function search<T>(index: string, body: Record<string, unknown>): Promise<T[]> {
    const res = await esFetch<{ hits?: { hits?: Array<{ _source: T }> } }>(`${index}/_search`, "POST", body);
    return (res.hits?.hits ?? []).map(hit => hit._source);
}

/**
 * Update every document matching a query via the _update_by_query endpoint.
 * Returns the number of documents updated.
 */
export async function updateByQuery(index: string, body: Record<string, unknown>): Promise<number> {
    const res = await esFetch<{ updated?: number }>(`${index}/_update_by_query?refresh=true&conflicts=proceed`, "POST", body);
    return res.updated ?? 0;
}
