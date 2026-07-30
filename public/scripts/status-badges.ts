import type WaBadge from '@awesome.me/webawesome/dist/components/badge/badge.js';
import { HealthResult } from 'types/HealthResult';
import { fetchJson } from './utils';

class StatusBadge extends HTMLElement {
    connectedCallback() {
        this.render();
        this.load();
    }

    render() {
        this.innerHTML = `
        Status :
        <wa-badge variant="neutral" pill data-status="es">ElasticSearch API</wa-badge>
        <wa-badge variant="neutral" pill data-status="ta">TubeArchivist API</wa-badge>
        <wa-badge variant="neutral" pill data-status="data">Data directory</wa-badge>
        <wa-badge variant="neutral" pill data-status="cache">Cache directory</wa-badge>

        <style>
        status-badges {
            display: block;
            margin-bottom: 1em;
        }
        </style>
        `;
    }

    async load() {
        const { ok, data } = await fetchJson<HealthResult>("/api/health");
        if (!ok) {
            alert('Cannot contact backend');
        } else {
            for (const [key, value] of Object.entries(data)) {
                const badge = this.querySelector(`[data-status=${key}]`) as WaBadge;
                badge.variant = value ? "success" : "danger";
                badge.attention = value ? 'none' : 'pulse';
            }
        }
    }
}

customElements.define("status-badges", StatusBadge);
