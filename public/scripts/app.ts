import type WaTabGroup from '@awesome.me/webawesome/dist/components/tab-group/tab-group.js';

import './status-badges';
import './move-form';
import './bulk-move-form';
import './rename-channel-form';
import './import-form';
import './ta-doctor';

class TaApp extends HTMLElement {
    private tabs: WaTabGroup;

    connectedCallback() {
        this.render();
        this.tabs = this.querySelector('wa-tab-group')!;

        const resizeObserver = new ResizeObserver(() => this.onResize());
        resizeObserver.observe(document.body);

        this.onResize();
    }

    render() {
        this.innerHTML = `
        <wa-tab-group placement="top">
            <wa-tab slot="nav" panel="single">Move a single video</wa-tab>
            <wa-tab slot="nav" panel="bulk">Move an entire channel</wa-tab>
            <wa-tab slot="nav" panel="import">Manual import</wa-tab>
            <wa-tab slot="nav" panel="rename">Rename a channel</wa-tab>
            <wa-tab slot="nav" panel="doctor">Doctor</wa-tab>

            <wa-tab-panel name="single"><move-form></move-form></wa-tab-panel>
            <wa-tab-panel name="bulk"><bulk-move-form></bulk-move-form></wa-tab-panel>
            <wa-tab-panel name="import"><import-form></import-form></wa-tab-panel>
            <wa-tab-panel name="rename"><rename-channel-form></rename-channel-form></wa-tab-panel>
            <wa-tab-panel name="doctor"><ta-doctor></ta-doctor></wa-tab-panel>
        </wa-tab-group>
        `;
    }

    private onResize() {
        this.tabs.placement = document.body.offsetWidth < 800 ? 'top' : 'start';
    }
}

customElements.define('ta-app', TaApp);
