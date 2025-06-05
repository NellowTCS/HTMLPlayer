import DOMPurify from 'dompurify';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { saveSettings, loadSettings, getAudioCacheSize, clearAudioCache } from './storage';

interface Settings {
  theme: string;
  visualizerStyle: 'particles' | 'waveform' | 'bars';
  cacheEnabled: boolean;
}

// Default settings configuration
const DEFAULT_SETTINGS: Settings = {
  theme: 'default',
  visualizerStyle: 'particles',
  cacheEnabled: true
};

// Theme and visualizer options
const THEME_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'blue', label: 'Blue' },
  { value: 'red', label: 'Red' }
];

const VISUALIZER_OPTIONS = [
  { value: 'particles', label: 'Particles' },
  { value: 'waveform', label: 'Waveform' },
  { value: 'bars', label: 'Bars' }
];

class SettingsModal {
  private modal: HTMLElement;
  private content: HTMLElement;
  private closeBtn: HTMLElement;
  private lastActiveElement: HTMLElement | null = null;
  private isOpen = false;

  constructor(
    private store: UseBoundStore<StoreApi<AppState>>,
    private settingsManager: SettingsManager
  ) {
    this.modal = this.getElement('settingsModal');
    this.content = this.getElement('settingsContent');
    this.closeBtn = this.getElement('closeSettings');
    
    this.initializeEventListeners();
  }

  private getElement(id: string): HTMLElement {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Element with id '${id}' not found`);
    }
    return element;
  }

  private initializeEventListeners() {
    // Settings button
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      this.show();
    });

    // Close button
    this.closeBtn.addEventListener('click', () => {
      this.hide();
    });

    // Escape key handler
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hide();
      }
    });

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.hide();
      }
    });

    // Trap focus within modal
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.trapFocus(e);
      }
    });
  }

  private trapFocus(e: KeyboardEvent) {
    const focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable.focus();
        e.preventDefault();
      }
    }
  }

  show() {
    if (this.isOpen) return;
    
    this.lastActiveElement = document.activeElement as HTMLElement;
    this.modal.classList.remove('hidden');
    this.modal.setAttribute('aria-hidden', 'false');
    this.isOpen = true;
    
    // Set focus to the first focusable element
    const firstFocusable = this.modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as HTMLElement;
    
    if (firstFocusable) {
      // Small delay to ensure the modal is fully rendered
      setTimeout(() => firstFocusable.focus(), 100);
    }
  }

  hide() {
    if (!this.isOpen) return;
    
    this.modal.classList.add('hidden');
    this.modal.setAttribute('aria-hidden', 'true');
    this.isOpen = false;
    
    // Restore focus to the element that was active before opening the modal
    if (this.lastActiveElement) {
      this.lastActiveElement.focus();
    }
  }

  async render() {
    try {
      const settings = await this.settingsManager.getSettings();
      const cacheSize = await getAudioCacheSize();
      const formattedSize = this.formatBytes(cacheSize);

      this.content.innerHTML = DOMPurify.sanitize(this.generateSettingsHTML(settings, formattedSize));
      this.attachEventListeners(settings);
    } catch (error) {
      console.error('Error rendering settings:', error);
      this.content.innerHTML = DOMPurify.sanitize('<p>Error loading settings. Please try again.</p>');
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private generateSettingsHTML(settings: Settings, cacheSize: string): string {
    return `
      <div class="settings-section" role="tabpanel" aria-labelledby="settings-title">
        <h2 id="settings-title" class="sr-only">Settings</h2>
        
        <div class="setting-group">
          <label for="themeSelect" class="setting-label">
            Theme:
            <select id="themeSelect" class="setting-select" aria-describedby="theme-description">
              ${THEME_OPTIONS.map(option => 
                `<option value="${option.value}" ${settings.theme === option.value ? 'selected' : ''}>
                  ${option.label}
                </option>`
              ).join('')}
            </select>
          </label>
          <small id="theme-description" class="setting-description">Choose your preferred color theme</small>
        </div>

        <div class="setting-group">
          <label for="visualizerSelect" class="setting-label">
            Visualizer Style:
            <select id="visualizerSelect" class="setting-select" aria-describedby="visualizer-description">
              ${VISUALIZER_OPTIONS.map(option => 
                `<option value="${option.value}" ${settings.visualizerStyle === option.value ? 'selected' : ''}>
                  ${option.label}
                </option>`
              ).join('')}
            </select>
          </label>
          <small id="visualizer-description" class="setting-description">Select the audio visualization style</small>
        </div>

        <div class="cache-section setting-group">
          <h3 class="section-title">Audio Cache</h3>
          <div class="cache-info">
            <p class="cache-size">Current cache size: <strong>${cacheSize}</strong></p>
            <div class="cache-controls">
              <label class="checkbox-label">
                <input type="checkbox" id="cacheEnabled" ${settings.cacheEnabled ? 'checked' : ''} 
                       aria-describedby="cache-description">
                <span class="checkbox-text">Enable audio caching</span>
              </label>
              <small id="cache-description" class="setting-description">
                Cache audio files to improve loading times
              </small>
            </div>
            <button id="clearCache" class="btn btn-secondary" type="button" 
                    aria-describedby="clear-cache-description">
              Clear Cache
            </button>
            <small id="clear-cache-description" class="setting-description">
              Remove all cached audio files
            </small>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners(currentSettings: Settings) {
    // Theme selection
    const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;
    themeSelect?.addEventListener('change', async (e) => {
      await this.settingsManager.updateTheme((e.target as HTMLSelectElement).value, currentSettings);
    });

    // Visualizer selection
    const visualizerSelect = document.getElementById('visualizerSelect') as HTMLSelectElement;
    visualizerSelect?.addEventListener('change', async (e) => {
      const visualizerStyle = (e.target as HTMLSelectElement).value as Settings['visualizerStyle'];
      await this.settingsManager.updateVisualizerStyle(visualizerStyle, currentSettings);
    });

    // Cache enabled toggle
    const cacheEnabledCheckbox = document.getElementById('cacheEnabled') as HTMLInputElement;
    cacheEnabledCheckbox?.addEventListener('change', async (e) => {
      const cacheEnabled = (e.target as HTMLInputElement).checked;
      await this.settingsManager.updateCacheEnabled(cacheEnabled, currentSettings);
      if (!cacheEnabled) {
        await this.render(); // Refresh to show updated cache size
      }
    });

    // Clear cache button
    const clearCacheBtn = document.getElementById('clearCache') as HTMLButtonElement;
    clearCacheBtn?.addEventListener('click', async () => {
      await this.settingsManager.clearCache();
      await this.render(); // Refresh to show updated cache size
    });
  }
}

class SettingsManager {
  constructor(private store: UseBoundStore<StoreApi<AppState>>) {}

  async getSettings(): Promise<Settings> {
    try {
      const settings = await loadSettings();
      return this.validateAndMergeSettings(settings);
    } catch (error) {
      console.error('Error loading settings, using defaults:', error);
      return DEFAULT_SETTINGS;
    }
  }

  private validateAndMergeSettings(loadedSettings: any): Settings {
    const validatedSettings: Settings = { ...DEFAULT_SETTINGS };
    
    if (loadedSettings) {
      // Validate theme
      if (typeof loadedSettings.theme === 'string') {
        validatedSettings.theme = loadedSettings.theme;
      }
      
      // Validate visualizerStyle
      if (typeof loadedSettings.visualizerStyle === 'string' && 
          ['particles', 'waveform', 'bars'].includes(loadedSettings.visualizerStyle)) {
        validatedSettings.visualizerStyle = loadedSettings.visualizerStyle as Settings['visualizerStyle'];
      }
      
      // Validate cacheEnabled
      if (typeof loadedSettings.cacheEnabled === 'boolean') {
        validatedSettings.cacheEnabled = loadedSettings.cacheEnabled;
      }
    }
    
    return validatedSettings;
  }

  async updateTheme(theme: string, currentSettings: Settings): Promise<void> {
    try {
      this.store.getState().setTheme(theme);
      await saveSettings({ ...currentSettings, theme });
    } catch (error) {
      console.error('Error updating theme:', error);
      // Revert UI change if save failed
      this.store.getState().setTheme(currentSettings.theme);
    }
  }

  async updateVisualizerStyle(
    visualizerStyle: Settings['visualizerStyle'], 
    currentSettings: Settings
  ): Promise<void> {
    try {
      await saveSettings({ ...currentSettings, visualizerStyle });
      // Trigger visualizer update if needed
      // this.store.getState().setVisualizerStyle?.(visualizerStyle);
    } catch (error) {
      console.error('Error updating visualizer style:', error);
    }
  }

  async updateCacheEnabled(cacheEnabled: boolean, currentSettings: Settings): Promise<void> {
    try {
      await saveSettings({ ...currentSettings, cacheEnabled });
      if (!cacheEnabled) {
        await this.clearCache();
      }
    } catch (error) {
      console.error('Error updating cache setting:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      await clearAudioCache();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}

export function initSettings(store: UseBoundStore<StoreApi<AppState>>) {
  try {
    const settingsManager = new SettingsManager(store);
    const modal = new SettingsModal(store, settingsManager);

    // Subscribe to theme changes
    store.subscribe((state) => {
      document.documentElement.setAttribute('data-theme', state.theme);
    });

    // Initial render
    modal.render().catch(error => {
      console.error('Error in initial settings render:', error);
    });

    // Return cleanup function
    return () => {
      // Any cleanup logic if needed
    };
  } catch (error) {
    console.error('Error initializing settings:', error);
  }
}