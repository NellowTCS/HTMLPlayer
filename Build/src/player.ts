import * as Howler from 'howler';
const { Howl } = Howler;
import { debounce } from 'lodash-es';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { savePlaybackPosition, loadPlaybackPosition, loadTracks } from './storage';

interface Track {
  id: string;
  url: string;
  title: string;
}

export function initPlayer(store: UseBoundStore<StoreApi<AppState>>) {
  let howl: Howl | null = null;
  let currentTrackUrl: string | null = null;
  let intervalId: NodeJS.Timeout | null = null;
  const progressEl = document.getElementById('progress') as HTMLInputElement;
  const currentTimeEl = document.getElementById('currentTime') as HTMLElement;
  const durationEl = document.getElementById('duration') as HTMLElement;

  const updateProgress = debounce(() => {
    if (howl && howl.playing()) {
      const pos = howl.seek();
      const dur = howl.duration();
      progressEl.value = ((pos / dur) * 100).toString();
      currentTimeEl.textContent = formatTime(pos);
      durationEl.textContent = formatTime(dur);
      savePlaybackPosition(store.getState().currentTrack, pos);
    }
  }, 100);

  document.getElementById('playPause')?.addEventListener('click', () => {
    if (!howl && store.getState().currentTrack) {
      // If we don't have a howl instance but we have a track, create one
      store.subscribe((state) => state.currentTrack)();
    } else if (howl) {
      if (howl.playing()) {
        howl.pause();
      } else {
        howl.play();
      }
    }
  });

  let isShuffleMode = false;
  let isRepeatMode = false;

  // Get the next track based on current state
  const getNextTrack = async () => {
    const tracks = await loadTracks();
    if (tracks.length === 0) return null;
    
    const currentTrackUrl = store.getState().currentTrack;
    const currentIndex = tracks.findIndex(t => t.url === currentTrackUrl);
    
    if (isShuffleMode) {
      const nextIndex = Math.floor(Math.random() * tracks.length);
      return tracks[nextIndex].url;
    }
    
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % tracks.length;
    return tracks[nextIndex].url;
  };

  // Get the previous track based on current state
  const getPrevTrack = async () => {
    const tracks = await loadTracks();
    if (tracks.length === 0) return null;
    
    const currentTrackUrl = store.getState().currentTrack;
    const currentIndex = tracks.findIndex(t => t.url === currentTrackUrl);
    
    if (isShuffleMode) {
      const prevIndex = Math.floor(Math.random() * tracks.length);
      return tracks[prevIndex].url;
    }
    
    const prevIndex = currentIndex === -1 ? tracks.length - 1 : 
      (currentIndex - 1 + tracks.length) % tracks.length;
    return tracks[prevIndex].url;
  };

  document.getElementById('nextBtn')?.addEventListener('click', async () => {
    const nextTrackUrl = await getNextTrack();
    if (nextTrackUrl) {
      store.getState().setCurrentTrack(nextTrackUrl);
    }
  });

  document.getElementById('prevBtn')?.addEventListener('click', async () => {
    const prevTrackUrl = await getPrevTrack();
    if (prevTrackUrl) {
      store.getState().setCurrentTrack(prevTrackUrl);
    }
  });

  document.getElementById('shuffleBtn')?.addEventListener('click', () => {
    isShuffleMode = !isShuffleMode;
    const btn = document.getElementById('shuffleBtn');
    btn?.classList.toggle('active', isShuffleMode);
  });

  document.getElementById('repeatBtn')?.addEventListener('click', () => {
    isRepeatMode = !isRepeatMode;
    const btn = document.getElementById('repeatBtn');
    btn?.classList.toggle('active', isRepeatMode);
  });

  progressEl?.addEventListener('input', debounce(() => {
    if (howl) {
      const seek = (parseFloat(progressEl.value) / 100) * howl.duration();
      howl.seek(seek);
    }
  }, 100));

  store.subscribe(async (state) => {
    if (state.currentTrack && state.currentTrack !== currentTrackUrl) {
      if (howl) {
        howl.stop();
        howl.unload();
      }
      if (intervalId) {
        clearInterval(intervalId);
      }

      // Create new Howl instance after cleanup
      currentTrackUrl = state.currentTrack;
      try {
        howl = new Howl({
          src: [state.currentTrack],
          html5: true,
          format: ['mp3', 'wav', 'ogg', 'm4a'],
          autoplay: false,
          onload: () => {
            console.log('Track loaded successfully');
          },
          onloaderror: (id, error) => {
            console.error('Error loading track:', error);
          },
          onplay: () => {
            store.getState().setIsPlaying(true);
          },
          onpause: () => {
            store.getState().setIsPlaying(false);
          },
          onend: async () => {
            if (isRepeatMode) {
              howl?.play();
            } else {
              const nextTrackUrl = await getNextTrack();
              if (nextTrackUrl) {
                store.getState().setCurrentTrack(nextTrackUrl);
              } else {
                store.getState().setCurrentTrack(null);
              }
            }
          },
          onstop: () => {
            store.getState().setIsPlaying(false);
          }
        });

        const pos = await loadPlaybackPosition(state.currentTrack);
        if (!howl) {
          console.error('Howl instance is null');
          return;
        }
        if (pos !== null) {
          howl.seek(pos);
        }
        howl.play();
        intervalId = setInterval(updateProgress, 100);
      } catch (error) {
        console.error('Error creating Howl instance:', error);
        currentTrackUrl = null;
        howl = null;
      }
      intervalId = setInterval(updateProgress, 100);
    }
  });
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}