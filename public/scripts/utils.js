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
    if (!res.ok && !data.message) {
        data.message = `Error ${res.status}: ${res.statusText}`;
    }
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

export function createAlert(variant, message) {
    const alert = document.createElement("sl-alert");
    alert.variant = variant;
    alert.closable = true;
    alert.open = true;
    alert.innerHTML = `
    <sl-icon slot="icon" name="${variant === "success" ? "check2-circle" : "exclamation-octagon"}"></sl-icon>${message}
    `;
    return alert;
}
