import { debounce } from 'lodash-es';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { 
  savePlaybackPosition, 
  loadPlaybackPosition, 
  loadTracks,
  getAudioBlobUrl,
  revokeAudioBlobUrl
} from './storage';

// Add proper Howl type declaration
declare global {
  interface Window {
    Howl: any;
    Howler: any;
  }
}

interface Track {
  id: string;
  url: string;
  title: string;
}

// Player state management
class PlayerState {
  private _isShuffleMode = false;
  private _isRepeatMode = false;

  get isShuffleMode() { return this._isShuffleMode; }
  get isRepeatMode() { return this._isRepeatMode; }

  toggleShuffle() {
    this._isShuffleMode = !this._isShuffleMode;
    this.updateButtonState('shuffleBtn', this._isShuffleMode);
    return this._isShuffleMode;
  }

  toggleRepeat() {
    this._isRepeatMode = !this._isRepeatMode;
    this.updateButtonState('repeatBtn', this._isRepeatMode);
    return this._isRepeatMode;
  }

  private updateButtonState(buttonId: string, isActive: boolean) {
    const btn = document.getElementById(buttonId);
    btn?.classList.toggle('active', isActive);
  }
}

// UI management
class PlayerUI {
  private progressEl = document.getElementById('progress') as HTMLInputElement;
  private currentTimeEl = document.getElementById('currentTime') as HTMLElement;
  private durationEl = document.getElementById('duration') as HTMLElement;
  private playIcon = document.getElementById('playIcon') as HTMLElement;
  private pauseIcon = document.getElementById('pauseIcon') as HTMLElement;

  // Refresh element references in case DOM changes
  private refreshElements() {
    this.progressEl = document.getElementById('progress') as HTMLInputElement;
    this.currentTimeEl = document.getElementById('currentTime') as HTMLElement;
    this.durationEl = document.getElementById('duration') as HTMLElement;
    this.playIcon = document.getElementById('playIcon') as HTMLElement;
    this.pauseIcon = document.getElementById('pauseIcon') as HTMLElement;
  }

  updateProgress(position: number, duration: number) {
    requestAnimationFrame(() => {
      this.refreshElements();
      
      if (this.progressEl && !isNaN(position) && !isNaN(duration) && duration > 0) {
        this.progressEl.value = ((position / duration) * 100).toString();
      }
      if (this.currentTimeEl) {
        this.currentTimeEl.textContent = this.formatTime(position);
      }
      if (this.durationEl) {
        this.durationEl.textContent = this.formatTime(duration);
      }
    });
  }

  updatePlayState(isPlaying: boolean) {
    this.refreshElements();
    
    if (this.playIcon && this.pauseIcon) {
      this.playIcon.style.display = isPlaying ? 'none' : '';
      this.pauseIcon.style.display = isPlaying ? '' : 'none';
    }
  }

  getProgressValue(): number {
    this.refreshElements();
    return this.progressEl ? parseFloat(this.progressEl.value) || 0 : 0;
  }

  private formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
}

// Track navigation logic
class TrackNavigator {
  constructor(private playerState: PlayerState) {}

  async getNextTrack(currentTrackUrl: string | null): Promise<string | null> {
    try {
      const tracks = await loadTracks();
      if (tracks.length === 0) return null;
      
      const currentIndex = tracks.findIndex(t => t.url === currentTrackUrl);
      
      if (this.playerState.isShuffleMode) {
        return this.getRandomTrack(tracks, currentTrackUrl);
      }
      
      const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % tracks.length;
      return tracks[nextIndex].url;
    } catch (error) {
      console.error('Error getting next track:', error);
      return null;
    }
  }

  async getPreviousTrack(currentTrackUrl: string | null): Promise<string | null> {
    try {
      const tracks = await loadTracks();
      if (tracks.length === 0) return null;
      
      const currentIndex = tracks.findIndex(t => t.url === currentTrackUrl);
      
      if (this.playerState.isShuffleMode) {
        return this.getRandomTrack(tracks, currentTrackUrl);
      }
      
      const prevIndex = currentIndex === -1 ? tracks.length - 1 : 
        (currentIndex - 1 + tracks.length) % tracks.length;
      return tracks[prevIndex].url;
    } catch (error) {
      console.error('Error getting previous track:', error);
      return null;
    }
  }

  private getRandomTrack(tracks: Track[], excludeUrl: string | null): string {
    if (tracks.length <= 1) return tracks[0]?.url || '';
    
    let randomTrack;
    do {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      randomTrack = tracks[randomIndex];
    } while (randomTrack.url === excludeUrl && tracks.length > 1);
    
    return randomTrack.url;
  }
}

// Main audio player class
class AudioPlayer {
  private howl: any = null; // Use any for Howl type
  private currentTrackUrl: string | null = null;
  private intervalId: number | null = null; // Use number for browser environment
  private ui = new PlayerUI();
  private playerState = new PlayerState();
  private navigator = new TrackNavigator(this.playerState);
  private isTransitioning = false;
  private unsubscribe: (() => void) | null = null;

  constructor(private store: UseBoundStore<StoreApi<AppState>>) {
    this.initializeEventListeners();
    this.subscribeToStore();
  }

  private initializeEventListeners() {
    // Play/Pause button
    document.getElementById('playPauseBtn')?.addEventListener('click', () => {
      this.handlePlayPause();
    });

    // Navigation buttons
    document.getElementById('nextBtn')?.addEventListener('click', async () => {
      await this.handleNext();
    });

    document.getElementById('prevBtn')?.addEventListener('click', async () => {
      await this.handlePrevious();
    });

    // Mode buttons
    document.getElementById('shuffleBtn')?.addEventListener('click', () => {
      this.playerState.toggleShuffle();
    });

    document.getElementById('repeatBtn')?.addEventListener('click', () => {
      this.playerState.toggleRepeat();
    });

    // Progress bar
    const progressEl = document.getElementById('progress') as HTMLInputElement;
    progressEl?.addEventListener('input', debounce(() => {
      this.handleProgressChange();
    }, 100));
  }

  private handlePlayPause() {
    const currentTrack = this.store.getState().currentTrack;
    if (!currentTrack) {
      console.warn('No track selected');
      return;
    }

    if (!this.howl) {
      this.store.getState().setCurrentTrack(currentTrack);
      return;
    }

    if (!this.isTransitioning) {
      try {
        if (this.howl.playing()) {
          this.howl.pause();
        } else {
          this.howl.play();
        }
      } catch (error) {
        console.error('Error controlling playback:', error);
      }
    }
  }

  private async handleNext() {
    if (this.isTransitioning) return;
    
    try {
      const nextTrackUrl = await this.navigator.getNextTrack(this.currentTrackUrl);
      if (nextTrackUrl) {
        this.store.getState().setCurrentTrack(nextTrackUrl);
      }
    } catch (error) {
      console.error('Error handling next track:', error);
    }
  }

  private async handlePrevious() {
    if (this.isTransitioning) return;
    
    try {
      const prevTrackUrl = await this.navigator.getPreviousTrack(this.currentTrackUrl);
      if (prevTrackUrl) {
        this.store.getState().setCurrentTrack(prevTrackUrl);
      }
    } catch (error) {
      console.error('Error handling previous track:', error);
    }
  }

  private handleProgressChange() {
    if (this.howl && !this.isTransitioning && this.howl.duration) {
      try {
        const seek = (this.ui.getProgressValue() / 100) * this.howl.duration();
        this.howl.seek(seek);
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  }

  private updateProgress = debounce(() => {
    if (this.howl && this.howl.playing && this.howl.playing() && !this.isTransitioning) {
      try {
        const pos = this.howl.seek();
        const dur = this.howl.duration();
        
        if (typeof pos === 'number' && typeof dur === 'number' && dur > 0) {
          this.ui.updateProgress(pos, dur);
          savePlaybackPosition(this.currentTrackUrl, pos).catch(error => {
            console.error('Error saving playback position:', error);
          });
        }
      } catch (error) {
        console.error('Error updating progress:', error);
      }
    }
  }, 100);

  private async cleanupCurrentTrack() {
    this.isTransitioning = true;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.howl) {
      try {
        this.howl.stop();
        this.howl.unload();
      } catch (error) {
        console.error('Error cleaning up howl:', error);
      }
      this.howl = null;
    }

    if (this.currentTrackUrl) {
      try {
        revokeAudioBlobUrl(this.currentTrackUrl);
      } catch (error) {
        console.error('Error revoking blob URL:', error);
      }
    }
  }

  private async loadNewTrack(trackUrl: string) {
    try {
      const blobUrl = await getAudioBlobUrl(trackUrl);
      const savedPosition = await loadPlaybackPosition(trackUrl);

      // Check if Howl is available
      if (!window.Howl) {
        throw new Error('Howl.js not loaded');
      }

      this.howl = new window.Howl({
        src: [blobUrl],
        html5: true,
        format: ['mp3', 'wav', 'ogg', 'm4a'],
        preload: true,
        onload: () => {
          console.log('Track loaded successfully');
          this.isTransitioning = false;
          
          // Restore playback position
          if (savedPosition !== null && this.howl) {
            try {
              this.howl.seek(savedPosition);
            } catch (error) {
              console.error('Error seeking to saved position:', error);
            }
          }
          
          // Start playback
          try {
            this.howl?.play();
            this.intervalId = window.setInterval(this.updateProgress, 100);
          } catch (error) {
            console.error('Error starting playback:', error);
          }
        },
        onloaderror: (id: any, error: any) => {
          console.error('Error loading track:', error);
          this.isTransitioning = false;
        },
        onplay: () => {
          this.store.getState().setIsPlaying(true);
          this.ui.updatePlayState(true);
        },
        onpause: () => {
          this.store.getState().setIsPlaying(false);
          this.ui.updatePlayState(false);
        },
        onend: async () => {
          await this.handleTrackEnd();
        },
        onstop: () => {
          this.store.getState().setIsPlaying(false);
          this.ui.updatePlayState(false);
        }
      });

      this.currentTrackUrl = trackUrl;
    } catch (error) {
      console.error('Error creating Howl instance:', error);
      this.currentTrackUrl = null;
      this.howl = null;
      this.isTransitioning = false;
    }
  }

  private async handleTrackEnd() {
    try {
      if (this.playerState.isRepeatMode) {
        this.howl?.play();
      } else {
        const nextTrackUrl = await this.navigator.getNextTrack(this.currentTrackUrl);
        if (nextTrackUrl) {
          this.store.getState().setCurrentTrack(nextTrackUrl);
        } else {
          this.store.getState().setCurrentTrack(null);
          this.store.getState().setIsPlaying(false);
        }
      }
    } catch (error) {
      console.error('Error handling track end:', error);
    }
  }

  private subscribeToStore() {
    this.unsubscribe = this.store.subscribe(async (state) => {
      if (state.currentTrack !== this.currentTrackUrl) {
        await this.cleanupCurrentTrack();
        
        if (state.currentTrack) {
          await this.loadNewTrack(state.currentTrack);
        } else {
          this.currentTrackUrl = null;
          this.isTransitioning = false;
        }
      }
    });
  }

  // Public method to cleanup when component unmounts
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.cleanupCurrentTrack();
  }
}

// Factory function to maintain the same API
export function initPlayer(store: UseBoundStore<StoreApi<AppState>>) {
  return new AudioPlayer(store);
}