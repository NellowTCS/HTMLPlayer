import WaveSurfer from 'wavesurfer.js';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { loadSettings, getAudioBlobUrl } from './storage';

let wavesurfer: WaveSurfer | null = null;

export function initVisualizer(store: UseBoundStore<StoreApi<AppState>>) {
  const container = document.getElementById('visualizer');
  if (!container) {
    console.error('Visualizer container element not found');
    return;
  }

  async function createWaveform(url: string) {
    // Cleanup existing instance first
    if (wavesurfer) {
      try {
        wavesurfer.pause();
        wavesurfer.destroy();
      } catch (error) {
        console.warn('Error cleaning up wavesurfer:', error);
      }
      wavesurfer = null;
    }

    if (!container) {
      console.error('Visualizer container is not available');
      return;
    }
    
    const settings = await loadSettings();
    const containerHeight = container.clientHeight;
    
    try {
      wavesurfer = WaveSurfer.create({
        container: container as HTMLElement,
        waveColor: '#4a9eff',
        progressColor: '#006EE6',
        cursorColor: '#fff',
        barWidth: 2,
        barGap: 1,
        height: Math.min(containerHeight, 128),
        normalize: true,
        autoScroll: true,
        mediaControls: false,
        minPxPerSec: 50,
        interact: true
      });

      // Set up event handlers before loading
      wavesurfer.on('play', () => {
        if (store.getState().isPlaying !== true) {
          store.getState().setIsPlaying(true);
        }
      });

      wavesurfer.on('pause', () => {
        if (store.getState().isPlaying !== false) {
          store.getState().setIsPlaying(false);
        }
      });

      wavesurfer.on('error', (error) => {
        console.error('Wavesurfer error:', error);
      });

      // Get the blob URL and load the audio file
      const blobUrl = await getAudioBlobUrl(url);
      await wavesurfer.load(blobUrl);

      // Only start playing if the store says we should be playing
      if (store.getState().isPlaying) {
        await wavesurfer.play();
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  // Keep track of the last track URL to avoid unnecessary reloads
  let lastTrackUrl: string | null = null;

  // Subscribe to store changes
  store.subscribe((state) => {
    // Handle track changes
    if (state.currentTrack !== lastTrackUrl) {
      lastTrackUrl = state.currentTrack;
      if (state.currentTrack) {
        createWaveform(state.currentTrack);
      } else if (wavesurfer) {
        wavesurfer.pause();
        wavesurfer.destroy();
        wavesurfer = null;
      }
    }

    // Handle play/pause state changes
    if (wavesurfer) {
      try {
        const isCurrentlyPlaying = wavesurfer.isPlaying();
        if (state.isPlaying && !isCurrentlyPlaying) {
          wavesurfer.play().catch(error => {
            console.error('Error playing audio:', error);
            store.getState().setIsPlaying(false);
          });
        } else if (!state.isPlaying && isCurrentlyPlaying) {
          wavesurfer.pause();
        }
      } catch (error) {
        console.error('Error controlling playback:', error);
      }
    }
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    if (wavesurfer && container) {
      const containerHeight = container.clientHeight;
      wavesurfer.setOptions({
        height: Math.min(containerHeight, 128)
      });
    }
  });
}
