import { config } from "../config.ts";

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

async function esFetch<T>(url: string): Promise<T>;
async function esFetch<T>(url: string, body: Record<string, unknown>): Promise<T>;
async function esFetch<T>(url: string, body?: Record<string, unknown>): Promise<T> {
    const res = await fetch(
        `${config.esUrl}/${url}`,
        {
            method: body ? "POST" : "GET",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        }
    );

    if (!res.ok) {
        throw new EsError(
            `ES get failed (${res.status}): ${await res.text()}`,
            res.status,
        );
    }

    return (await res.json()) as T;
}

/**
 * Count the number of documents matching the query.
 */
export async function count(index: string, body: Record<string, unknown>): Promise<number> {
    const res = await esFetch<{ count: number }>(`${index}/_count`, body);
    return res.count;
}

/**
 * Fetch a document source by index/id.
 */
export async function get<T>(index: string, id: string): Promise<T | null> {
    const res = await esFetch<{ _source?: T }>(`${index}/_doc/${encodeURIComponent(id)}`);
    return res._source ?? null;
}

/**
 * Partial update of a document via the _update endpoint.
 */
export async function update(index: string, id: string, doc: Record<string, unknown>): Promise<void> {
    await esFetch(`${index}/_update/${encodeURIComponent(id)}?refresh=true`, { doc });
}

/**
 * Run a search query and return the raw hits. Caller supplies the index and
 * request body (query, _source, size, ...).
 */
export async function search<T>(index: string, body: Record<string, unknown>): Promise<T[]> {
    const res = await esFetch<{ hits?: { hits?: Array<{ _source: T }> } }>(`${index}/_search`, body);
    return (res.hits?.hits ?? []).map(hit => hit._source);
}

/**
 * Update every document matching a query via the _update_by_query endpoint.
 * Returns the number of documents updated.
 */
export async function updateByQuery(index: string, body: Record<string, unknown>): Promise<number> {
    const res = await esFetch<{ updated?: number }>(`${index}/_update_by_query?refresh=true&conflicts=proceed`, body);
    return res.updated ?? 0;
}
