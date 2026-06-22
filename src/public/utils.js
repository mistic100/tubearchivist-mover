export function extractId(input) {
    if (!input) {
        return "";
    }
    const value = String(input).trim();
    if (!value) {
        return "";
    }
    return value.split('/').pop();
}

export async function fetchJson(url) {
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}

export async function postJson(url, body) {
    const res =  await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
}
