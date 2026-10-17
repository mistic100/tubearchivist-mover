import type WaDropdown from '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import type WaTabGroup from '@awesome.me/webawesome/dist/components/tab-group/tab-group.js';
import { version } from '../../package.json';

import './bulk-move-form';
import './components/video-selector';
import './create-channel-form';
import './edit-channel-form';
import './import-form';
import './move-form';
import './status-badges';
import './ta-doctor';
import './trim-form';

const tabs = [
   { id: 'single', component: 'move-form', title: 'Move a single video' },
   { id: 'bulk', component: 'bulk-move-form', title: 'Move an entire channel' },
   { id: 'import', component: 'import-form', title: 'Import new videos' },
   { id: 'edit', component: 'edit-channel-form', title: 'Edit a channel' },
   { id: 'create', component: 'create-channel-form', title: 'Create a channel' },
   { id: 'trim', component: 'trim-form', title: 'Trim a video' },
   { id: 'doctor', component: 'ta-doctor', title: 'Doctor' },
]

class TaApp extends HTMLElement {
    private dropdown: WaDropdown;
    private tabs: WaTabGroup;

    connectedCallback() {
        this.render();
        this.dropdown = this.querySelector('wa-dropdown')!;
        this.tabs = this.querySelector('wa-tab-group')!;

        const resizeObserver = new ResizeObserver(() => this.onResize());
        resizeObserver.observe(document.body);

        this.onResize();

        this.dropdown.addEventListener('wa-select', (e) => {
            this.tabs.active = (e as CustomEvent).detail.item.value;
        });
    }

    render() {
        this.innerHTML = `
        <main>
            <div id="content">
                <header class="wa-split">
                    <h1>TubeArchivist Mover</h1>

                    <wa-dropdown id="menu-button">
                        <wa-button variant="brand" slot="trigger" appearance="outlined">
                            <wa-icon name="bars" label="Menu"></wa-icon>
                        </wa-button>

                        ${tabs.map(({ id, title }) => `<wa-dropdown-item value="${id}">${title}</wa-dropdown-item>`).join('')}
                    </wa-dropdown>
                </header>

                <wa-tab-group placement="start">
                    ${tabs.map(({ id, title }) => `<wa-tab slot="nav" panel="${id}">${title}</wa-tab>`).join('')}

                    ${tabs.map(({ id, title, component }) => `<wa-tab-panel name="${id}"><h2>${title}</h2><${component}/></wa-tab-panel>`).join('')}
                </wa-tab-group>
            </div>
        </main>

        <footer>
            <status-badges></status-badges>
            <a href="https://github.com/mistic100/tubearchivist-mover">TubeArchivist Mover ${version}</a> - mistic100
        </footer>

        <style>
        ta-app {
            display: grid;
            grid-template-rows: 1fr auto;
            min-height: 100vh;
    
            &.smallscreen {
                wa-tab-group::part(nav) {
                    display: none;
                }
                wa-tab-group  wa-tab-panel::part(base) {
                    --padding: 0;
                }
            }
            &:not(.smallscreen) {
                wa-dropdown {
                    display: none;
                }
            }
        }

        header {
            border-bottom: 2px solid var(--accent-font-dark);
            padding-bottom: var(--wa-space-m);
            margin-bottom: var(--wa-space-m);
        }

        main {
            min-width: 0;
        }

        #content {
            max-width: 1000px;
            margin: 0 auto;
            padding: var(--wa-space-l);
        }

        footer {
            background: var(--highlight-bg);
            text-align: center;
            padding: var(--wa-space-m) 0;
        }
        </style>
        `;
    }

    private onResize() {
        if (document.body.offsetWidth < 800) {
            this.classList.add('smallscreen');
        } else {
            this.classList.remove('smallscreen');
        }
    }
}

customElements.define('ta-app', TaApp);
