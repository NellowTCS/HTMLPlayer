import { create } from 'zustand';
import { initPlayer } from './player';
import { initSettings } from './settings';
import { initPlaylists } from './playlists';
import { initTracks } from './tracks';
import { initUI } from './ui';
import { VisualizerManager } from './visualizerManager';

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

// Enhanced visualizer wrapper to work with Howl.js
class HowlVisualizerAdapter {
  private visualizerManager: any = null; // VisualizerManager instance
  private howlInstance: any = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaElementAudioSourceNode | null = null;

  constructor(canvasContainer: HTMLElement) {
    // We'll initialize the visualizer manager when we get a Howl instance
    this.setupCanvasContainer(canvasContainer);
  }

  private setupCanvasContainer(container: HTMLElement) {
    // Ensure container has proper styling for visualizer
    if (!container.style.position) {
      container.style.position = 'relative';
    }
  }

  public setHowlInstance(howl: any) {
    this.howlInstance = howl;
    this.setupVisualizerConnection();
  }

  public setupVisualizerConnection() {
    if (!this.howlInstance) return;

    try {
      // Get the underlying HTML audio element from Howl
      const audioElement = this.getAudioElementFromHowl();
      
      if (audioElement && !this.visualizerManager) {
        const canvasContainer = document.getElementById('visualizer-container');
        if (canvasContainer) {
          // Now we can create the VisualizerManager with the audio element
          this.visualizerManager = new VisualizerManager(audioElement, canvasContainer);
          console.log('Visualizer manager would be created here with audio element');
          
          // For now, let's set up Web Audio API connection manually
          // this.setupWebAudioConnection(audioElement);
        }
      }
    } catch (error) {
      console.error('Error setting up visualizer connection:', error);
    }
  }

  private getAudioElementFromHowl(): HTMLAudioElement | null {
    try {
      // Access the internal HTML audio element from Howl
      if (this.howlInstance && this.howlInstance._sounds && this.howlInstance._sounds[0]) {
        return this.howlInstance._sounds[0]._node;
      }
    } catch (error) {
      console.error('Error accessing audio element from Howl:', error);
    }
    return null;
  }

  private setupWebAudioConnection(audioElement: HTMLAudioElement) {
    try {
      // Use Howler's existing audio context if available
      this.audioContext = (window as any).Howler?.ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (!this.analyser) {
        if (!this.audioContext) {
          console.error('AudioContext is not available');
          return;
        }
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        
        // Create source from audio element
        this.source = this.audioContext.createMediaElementSource(audioElement);
        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
        
        console.log('Web Audio API connection established for visualizer');
      }
    } catch (error) {
      console.error('Error setting up Web Audio API:', error);
    }
  }

  public setVisualizerType(type: string) {
    if (this.visualizerManager) {
      this.visualizerManager.addVisualizer(type);
    } else {
      console.warn('Visualizer manager not initialized yet');
    }
  }

  public updateSettings(settings: any) {
    // Handle visualizer settings updates
    console.log('Updating visualizer settings:', settings);
  }

  public getAnalyserNode(): AnalyserNode | null {
    return this.analyser;
  }

  public getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  public destroy() {
    if (this.visualizerManager) {
      // Clean up visualizer manager
      this.visualizerManager = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
  }
}

async function initApp() {
  // Initialize other components first
  initUI(useStore);
  initSettings(useStore);
  initPlaylists(useStore);
  initTracks(useStore);
  
  // Initialize player
  const playerInstance = initPlayer(useStore);
  
  // Initialize visualizer adapter
  const visualizerContainer = document.getElementById('visualizer-container');
  if (visualizerContainer && playerInstance) {
    const visualizerAdapter = new HowlVisualizerAdapter(visualizerContainer);
    
    // Connect the visualizer adapter to the player
    if (typeof playerInstance.setVisualizerInstance === 'function') {
      playerInstance.setVisualizerInstance(visualizerAdapter);
      console.log('Visualizer adapter connected to audio player');
    }
    
    // Set up visualizer controls
    setupVisualizerControls(visualizerAdapter);
  }
  
  setupAddMusicButton();

  // Keyboard controls
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      const playPauseBtn = document.getElementById('playPauseBtn');
      if (playPauseBtn) {
        playPauseBtn.click();
      }
    }
  });
  
  // Handle window resize for visualizer
  window.addEventListener('resize', () => {
    // If you have a visualizer manager, call its resize method
    // visualizerManager?.resizeCanvas();
  });
}

function setupVisualizerControls(visualizerAdapter: HowlVisualizerAdapter) {
  // Example: Add buttons to switch visualizer types
  const visualizerButtons = document.querySelectorAll('[data-visualizer-type]');
  
  visualizerButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const type = target.dataset.visualizerType;
      if (type) {
        visualizerAdapter.setVisualizerType(type);
        
        // Update button states
        visualizerButtons.forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');
      }
    });
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
        const dirHandle = await (window as any).showDirectoryPicker();
        const event = new CustomEvent('music-directory-selected', { detail: dirHandle });
        window.dispatchEvent(event);
      } catch (e) {
        fileInput.click();
      }
    } else {
      console.warn('Directory picker not supported, falling back to file input');
      fileInput.setAttribute('multiple', 'true');
      fileInput.setAttribute('accept', 'audio/*');
      fileInput.click();
    }
  });
}

// Initialize the app
initApp();