import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { debounce } from 'lodash';
import VisualizerControls from './visualizerControls';

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

  const container = document.getElementById('visualizer-controls');
  const controls = new VisualizerControls({
    container: container!,
    currentType: 'waveform',
    onTypeChange: (type) => {
      console.log('Visualizer type changed to:', type);
    },
    onSettingsChange: (setting, value) => {
      console.log('Setting changed:', setting, '=', value);
    }
  });
}