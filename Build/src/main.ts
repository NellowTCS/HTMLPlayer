import { create } from 'zustand';
import { initPlayer } from './player';
import { initSettings } from './settings';
import { initVisualizer } from './visualizer';
import { initPlaylists } from './playlists';
import { initTracks } from './tracks';
import { initUI } from './ui';

export interface AppState {
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

async function initApp() {
  initUI(useStore);
  initPlayer(useStore);
  initSettings(useStore);
  initVisualizer(useStore);
  initPlaylists(useStore);
  initTracks(useStore);
  setupAddMusicButton();

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      const store = useStore.getState();
      store.setIsPlaying(!store.isPlaying);
    }
  });
}

// Directory picker + file input fallback for Add Music
function setupAddMusicButton() {
  const uploadBtn = document.getElementById('uploadBtn');
  const fileInput = document.getElementById('fileInput') as HTMLInputElement;

  if (!uploadBtn || !fileInput) return;

  uploadBtn.addEventListener('click', async () => {
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore
        const dirHandle = await (window as any).showDirectoryPicker();
        // Dispatch a custom event or call a handler to process the directory
        const event = new CustomEvent('music-directory-selected', { detail: dirHandle });
        window.dispatchEvent(event);
      } catch (e) {
        // User cancelled or error, fallback to file input
        fileInput.click();
      }
    } else {
      // Fallback: file input
      fileInput.click();
    }
  });
}

// Call this in initApp
initApp();
