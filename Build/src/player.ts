import { Howl } from 'howler';
import { debounce } from 'lodash';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { savePlaybackPosition, loadPlaybackPosition } from './storage';

interface Track {
  id: string;
  url: string;
  title: string;
}

export function initPlayer(store: UseBoundStore<StoreApi<AppState>>) {
  let howl: Howl | null = null;
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
    if (howl) {
      if (howl.playing()) {
        howl.pause();
        store.getState().setIsPlaying(false);
      } else {
        howl.play();
        store.getState().setIsPlaying(true);
      }
    }
  });

  document.getElementById('next')?.addEventListener('click', () => {
    // Implement next track logic
  });

  document.getElementById('prev')?.addEventListener('click', () => {
    // Implement previous track logic
  });

  progressEl?.addEventListener('input', debounce(() => {
    if (howl) {
      const seek = (parseFloat(progressEl.value) / 100) * howl.duration();
      howl.seek(seek);
    }
  }, 100));

  store.subscribe((state) => {
    if (state.currentTrack && state.currentTrack !== howl?.src) {
      howl = new Howl({
        src: [state.currentTrack],
        html5: true,
        format: ['mp3', 'ogg', 'm4a'],
        onplay: () => store.getState().setIsPlaying(true),
        onpause: () => store.getState().setIsPlaying(false),
        onend: () => store.getState().setCurrentTrack(null),
      });
      const pos = loadPlaybackPosition(state.currentTrack);
      if (pos) howl.seek(pos);
      howl.play();
      setInterval(updateProgress, 100);
    }
  });
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}