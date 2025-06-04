import { createFocusTrap } from 'focus-trap';
const sanitize = require('sanitize-html');
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { saveSettings, loadSettings } from './storage';

interface Settings {
  theme: string;
  visualizerStyle: 'particles' | 'waveform' | 'bars';
}

export function initSettings(store: UseBoundStore<StoreApi<AppState>>) {
  const modal = document.getElementById('settingsModal') as HTMLElement;
  const content = document.getElementById('settingsContent') as HTMLElement;
  const closeBtn = document.getElementById('closeSettings') as HTMLElement;
  const focusTrap = createFocusTrap(modal, { escapeDeactivates: true });

  document.getElementById('settingsBtn')?.addEventListener('click', () => {
    modal.classList.remove('hidden');
    focusTrap.activate();
  });

  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    focusTrap.deactivate();
  });

  // Render settings UI
  const renderSettings = async () => {
    const settings = await loadSettings() || { theme: 'default', visualizerStyle: 'particles' };
    content.innerHTML = sanitize(`
      <label>Theme:
        <select id="themeSelect">
          <option value="default" ${settings.theme === 'default' ? 'selected' : ''}>Default</option>
          <option value="red" ${settings.theme === 'red' ? 'selected' : ''}>Red</option>
          <option value="orange" ${settings.theme === 'orange' ? 'selected' : ''}>Orange</option>
          <!-- Add other themes -->
        </select>
      </label>
      <label>Visualizer:
        <select id="visualizerSelect">
          <option value="particles" ${settings.visualizerStyle === 'particles' ? 'selected' : ''}>Particles</option>
          <option value="waveform" ${settings.visualizerStyle === 'waveform' ? 'selected' : ''}>Waveform</option>
          <option value="bars" ${settings.visualizerStyle === 'bars' ? 'selected' : ''}>Bars</option>
        </select>
      </label>
    `);

    document.getElementById('themeSelect')?.addEventListener('change', async (e) => {
      const theme = (e.target as HTMLSelectElement).value;
      store.getState().setTheme(theme);
      await saveSettings({ ...settings, theme });
    });

    document.getElementById('visualizerSelect')?.addEventListener('change', async (e) => {
      const visualizerStyle = (e.target as HTMLSelectElement).value as Settings['visualizerStyle'];
      await saveSettings({ ...settings, visualizerStyle });
    });
  };

  store.subscribe((state) => {
    document.documentElement.setAttribute('data-theme', state.theme);
  });

  renderSettings();
}