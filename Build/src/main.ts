import { create } from 'zustand';
import { initPlayer } from './player';
import { initSettings } from './settings';
import { initVisualizer } from './visualizer';
import { initDatabase } from './storage';
import { initPlaylists } from './playlists';
import { initTracks } from './tracks';
import { initUI } from './ui';

// Define global state
interface AppState {
  currentTrack: string | null;
  isPlaying: boolean;
  theme: string;
  setCurrentTrack: (track: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setTheme: (theme: string) => void;
}

const useStore = create<AppState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  theme: 'default',
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setTheme: (theme) => set({ theme }),
}));

// Initialize app
async function initApp() {
  await initDatabase();
  initUI(useStore);
  initPlayer(useStore);
  initSettings(useStore);
  initVisualizer(useStore);
  initPlaylists(useStore);
  initTracks(useStore);

  // Keyboard shortcuts for accessibility
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      useStore.getState().setIsPlaying(!useStore.getState().isPlaying);
    }
  });
}

initApp();