import { config } from "../config.ts";

const authHeader =
    "Basic " +
    Buffer.from(`${config.esUser}:${config.esPassword}`).toString(
        "base64",
    );

export class EsError extends Error {
    constructor(
        message: string,
        readonly status: number,
    ) {
        super(message);
        this.name = "EsError";
    }
}

/**
 * Fetch a document source by index/id. Returns null on 404.
 */
export async function get<T>(index: string, id: string): Promise<T | null> {
    const res = await fetch(
        `${config.esUrl}/${index}/_doc/${encodeURIComponent(id)}`,
        {
            method: "GET",
            headers: { Authorization: authHeader },
        },
    );

    if (res.status === 404) return null;
    if (!res.ok) {
        throw new EsError(
            `ES get failed (${res.status}): ${await res.text()}`,
            res.status,
        );
    }

    const body = (await res.json()) as { _source?: T };
    return body._source ?? null;
}

/**
 * Partial update of a document via the _update endpoint.
 */
export async function update(
    index: string,
    id: string,
    doc: Record<string, unknown>,
): Promise<void> {
    const res = await fetch(
        `${config.esUrl}/${index}/_update/${encodeURIComponent(id)}?refresh=true`,
        {
            method: "POST",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ doc }),
        },
    );

    if (!res.ok) {
        throw new EsError(
            `ES update failed (${res.status}): ${await res.text()}`,
            res.status,
        );
    }
}

/**
 * Run a search query and return the raw hits. Caller supplies the index and
 * request body (query, _source, size, ...).
 */
export async function search<T>(
    index: string,
    body: Record<string, unknown>,
): Promise<T[]> {
    const res = await fetch(
        `${config.esUrl}/${index}/_search`,
        {
            method: "POST",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        },
    );

    if (!res.ok) {
        throw new EsError(
            `ES search failed (${res.status}): ${await res.text()}`,
            res.status,
        );
    }

    const json = (await res.json()) as {
        hits?: { hits?: Array<{ _id: string; _source: T }> };
    };
    return (json.hits?.hits ?? []).map(hit => hit._source);
}

/**
 * Update every document matching a query via the _update_by_query endpoint.
 * Returns the number of documents updated.
 */
export async function updateByQuery(
    index: string,
    body: Record<string, unknown>,
): Promise<number> {
    const res = await fetch(
        `${config.esUrl}/${index}/_update_by_query?refresh=true&conflicts=proceed`,
        {
            method: "POST",
            headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        },
    );

    if (!res.ok) {
        throw new EsError(
            `ES update_by_query failed (${res.status}): ${await res.text()}`,
            res.status,
        );
    }

    const json = (await res.json()) as { updated?: number };
    return json.updated ?? 0;
}
