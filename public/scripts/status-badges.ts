import { SlBadge } from '@shoelace-style/shoelace';
import { HealthResult } from '../../types/HealthResult';
import { fetchJson } from './utils';

class StatusBadge extends HTMLElement {
    connectedCallback() {
        this.render();
        this.load();
    }

    render() {
        this.innerHTML = `
        Status :
        <sl-badge variant="neutral" pill data-status="es">ElasticSearch API</sl-badge>
        <sl-badge variant="neutral" pill data-status="ta">TubeArchivist API</sl-badge>
        <sl-badge variant="neutral" pill data-status="data">Data directory</sl-badge>
        <sl-badge variant="neutral" pill data-status="cache">Cache directory</sl-badge>

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
                const badge = this.querySelector(`[data-status=${key}]`) as SlBadge;
                badge.variant = value ? "success" : "danger";
                badge.pulse = !value;
            }
        }
    }
}

customElements.define("status-badges", StatusBadge);
