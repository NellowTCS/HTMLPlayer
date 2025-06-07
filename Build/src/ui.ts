import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { debounce } from 'lodash';
import VisualizerControls from './visualizerControls';
import { VisualizerType } from './visualizerManager';

export function initUI(store: UseBoundStore<StoreApi<AppState>>) {
  // Cache DOM elements
  const elements = {
    playPause: document.getElementById('playPauseBtn') as HTMLElement,
    progress: document.getElementById('progress') as HTMLInputElement,
    // Add other elements
  };

  // Theme switching
  store.subscribe((state) => {
    document.documentElement.setAttribute('data-theme', state.theme);
  });

  // Initialize visualizer controls
  const container = document.getElementById('visualizer-controls')!;
  const visualizerModal = document.getElementById('visualizer-controls-modal')!;
  const openVisualizerBtn = document.getElementById('openVisualizerControls');
  const visualizerInstance = store.getState().visualizer;

  // Create controls instance with callbacks to update visualizer
  const controls = new VisualizerControls({
    container,
    currentType: 'waveform',
    onTypeChange: (type) => {
      const validType = ['waveform', 'bars', 'circular', 'spectrum', 'mirror', 'particles'].includes(type) 
        ? type as VisualizerType 
        : 'waveform';
      visualizerInstance?.setVisualizerType(validType);
    },
    onSettingsChange: (setting, value) => {
      visualizerInstance?.updateSettings({ [setting]: value });
    }
  });

  // Handle modal opening
  openVisualizerBtn?.addEventListener('click', () => {
    visualizerModal.classList.remove('hidden');
  });
}