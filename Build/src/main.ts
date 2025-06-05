import { create } from 'zustand';
import { initPlayer } from './player';
import { initSettings } from './settings';
import { initVisualizer, VisualizerSettings, VisualizerType } from './visualizer';
import { initPlaylists } from './playlists';
import { initTracks } from './tracks';
import { initUI } from './ui';

interface VisualizerInstance {
  setVisualizerType: (type: VisualizerType) => void;
  updateSettings: (settings: Partial<VisualizerSettings>) => void;
}

export interface AppState {
  currentTrack: string | null;
  isPlaying: boolean;
  theme: string;
  visualizer: VisualizerInstance | null;
  setCurrentTrack: (track: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setTheme: (theme: string) => void;
  setVisualizer: (visualizer: VisualizerInstance) => void;
}

const useStore = create<AppState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  theme: 'default',
  visualizer: null,
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setTheme: (theme) => set({ theme }),
  setVisualizer: (visualizer) => set({ visualizer }),
}));

async function initApp() {
  const visualizerInstance = initVisualizer(useStore);
  if (visualizerInstance) {
    useStore.getState().setVisualizer({
      setVisualizerType: visualizerInstance.setVisualizerType,
      updateSettings: visualizerInstance.updateSettings
    });
  }
  
  initUI(useStore);
  initPlayer(useStore);
  initSettings(useStore);
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
      console.warn('Directory picker not supported, falling back to file input');
      // Fallback for browsers that don't support directory picker
      // Ensure file input accepts multiple files and audio types
      fileInput.setAttribute('multiple', 'true');
      fileInput.setAttribute('accept', 'audio/*');
      // Trigger file input click
      fileInput.click();
    }
  });
}

// Call this in initApp
initApp();
