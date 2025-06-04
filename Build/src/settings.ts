import DOMPurify from 'dompurify';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { saveSettings, loadSettings, getAudioCacheSize, clearAudioCache } from './storage';

interface Settings {
  theme: string;
  visualizerStyle: 'particles' | 'waveform' | 'bars';
  cacheEnabled: boolean;
}

export function initSettings(store: UseBoundStore<StoreApi<AppState>>) {
  const modal = document.getElementById('settingsModal') as HTMLElement;
  const content = document.getElementById('settingsContent') as HTMLElement;
  const closeBtn = document.getElementById('closeSettings') as HTMLElement;
  let lastActiveElement: HTMLElement | null = null;

  // Handle modal accessibility
  function showModal() {
    lastActiveElement = document.activeElement as HTMLElement;
    modal.classList.remove('hidden');
    // Set focus to the first focusable element
    const firstFocusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') as HTMLElement;
    if (firstFocusable) {
      firstFocusable.focus();
    }
  }

  function hideModal() {
    modal.classList.add('hidden');
    // Restore focus to the element that was active before opening the modal
    if (lastActiveElement) {
      lastActiveElement.focus();
    }
  }

  document.getElementById('settingsBtn')?.addEventListener('click', showModal);
  closeBtn.addEventListener('click', hideModal);

  // Handle Escape key to close modal
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal();
    }
  });

  // Render settings UI
  const renderSettings = async () => {
    const settings = await loadSettings() || { 
      theme: 'default', 
      visualizerStyle: 'particles',
      cacheEnabled: true
    };
    const cacheSize = await getAudioCacheSize();
    const formattedSize = (cacheSize / (1024 * 1024)).toFixed(2); // Convert to MB

    content.innerHTML = DOMPurify.sanitize(`
      <div class="settings-section">
        <label>Theme:
          <select id="themeSelect">
            <option value="default" ${settings.theme === 'default' ? 'selected' : ''}>Default</option>
            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Dark</option>
            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Light</option>
            <option value="blue" ${settings.theme === 'blue' ? 'selected' : ''}>Blue</option>
            <option value="red" ${settings.theme === 'red' ? 'selected' : ''}>Red</option>
          </select>
        </label>
        <label>Visualizer Style:
          <select id="visualizerSelect">
            <option value="particles" ${settings.visualizerStyle === 'particles' ? 'selected' : ''}>Particles</option>
            <option value="waveform" ${settings.visualizerStyle === 'waveform' ? 'selected' : ''}>Waveform</option>
            <option value="bars" ${settings.visualizerStyle === 'bars' ? 'selected' : ''}>Bars</option>
          </select>
        </label>
        <div class="cache-section">
          <h3>Audio Cache</h3>
          <p>Current cache size: ${formattedSize} MB</p>
          <label>
            <input type="checkbox" id="cacheEnabled" ${settings.cacheEnabled ? 'checked' : ''}>
            Enable audio caching
          </label>
          <button id="clearCache" class="btn">Clear Cache</button>
        </div>
      </div>
    `);

    // Set up event listeners
    document.getElementById('themeSelect')?.addEventListener('change', async (e) => {
      const theme = (e.target as HTMLSelectElement).value;
      store.getState().setTheme(theme);
      await saveSettings({ ...settings, theme });
    });

    document.getElementById('visualizerSelect')?.addEventListener('change', async (e) => {
      const visualizerStyle = (e.target as HTMLSelectElement).value as Settings['visualizerStyle'];
      await saveSettings({ ...settings, visualizerStyle });
    });

    // Add cache management listeners
    document.getElementById('cacheEnabled')?.addEventListener('change', async (e) => {
      const cacheEnabled = (e.target as HTMLInputElement).checked;
      await saveSettings({ ...settings, cacheEnabled });
      if (!cacheEnabled) {
        await clearAudioCache();
        renderSettings(); // Refresh the display
      }
    });

    document.getElementById('clearCache')?.addEventListener('click', async () => {
      await clearAudioCache();
      renderSettings(); // Refresh the display
    });
  };

  store.subscribe((state) => {
    document.documentElement.setAttribute('data-theme', state.theme);
  });

  renderSettings();
}