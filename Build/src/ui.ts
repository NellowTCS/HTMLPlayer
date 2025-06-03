import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { debounce } from 'lodash';

export function initUI(store: UseBoundStore<StoreApi<AppState>>) {
  // Cache DOM elements
  const elements = {
    playPause: document.getElementById('playPause') as HTMLElement,
    progress: document.getElementById('progress') as HTMLInputElement,
    // Add other elements
  };

  // Update play/pause icon
  store.subscribe((state) => {
    elements.playPause.innerHTML = `<i class="fas fa-${state.isPlaying ? 'pause' : 'play'}"></i>`;
  });

  // Theme switching
  store.subscribe((state) => {
    document.documentElement.setAttribute('data-theme', state.theme);
  });
}