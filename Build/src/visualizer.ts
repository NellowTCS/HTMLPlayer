import WaveSurfer from 'wavesurfer.js';
import { StoreApi, UseBoundStore } from 'zustand';
import { AppState } from './main';
import { loadSettings, getAudioBlobUrl } from './storage';

// Types for different visualizer modes
export type VisualizerType = 
  | 'waveform' 
  | 'bars' 
  | 'circular' 
  | 'spectrum' 
  | 'mirror' 
  | 'particles';

export interface VisualizerSettings {
  type: VisualizerType;
  waveColor: string;
  progressColor: string;
  backgroundColor: string;
  height: number;
  sensitivity: number;
  smoothing: number;
  particleCount?: number;
  barCount?: number;
}

let wavesurfer: WaveSurfer | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray: Uint8Array | null = null;
let animationId: number | null = null;
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

const defaultSettings: VisualizerSettings = {
  type: 'waveform',
  waveColor: '#4a9eff',
  progressColor: '#006EE6',
  backgroundColor: '#000000',
  height: 128,
  sensitivity: 1.0,
  smoothing: 0.8,
  particleCount: 100,
  barCount: 64
};

export function initVisualizer(store: UseBoundStore<StoreApi<AppState>>) {
  const container = document.getElementById('visualizer');
  if (!container) {
    console.error('Visualizer container element not found');
    return;
  }

  // Create canvas for custom visualizers
  canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  ctx = canvas.getContext('2d');

  async function createWaveform(url: string, settings: VisualizerSettings = defaultSettings) {
    // Cleanup existing instances
    cleanup();

    if (!container) {
      console.error('Visualizer container is not available');
      return;
    }
    
    const userSettings = await loadSettings();
    const finalSettings = { ...defaultSettings, ...userSettings, ...settings };
    
    try {
      if (finalSettings.type === 'waveform') {
        await createWaveSurferVisualizer(url, finalSettings, container);
      } else {
        await createCustomVisualizer(url, finalSettings, container);
      }
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  async function createWaveSurferVisualizer(
    url: string, 
    settings: VisualizerSettings, 
    container: HTMLElement
  ) {
    wavesurfer = WaveSurfer.create({
      container: container,
      waveColor: settings.waveColor,
      progressColor: settings.progressColor,
      cursorColor: '#fff',
      height: settings.height,
      normalize: true,
      autoScroll: true,
      mediaControls: false,
      interact: true,
      fillParent: true,
      dragToSeek: true,
      renderFunction: (peaks: Array<Float32Array | number[]>, ctx: CanvasRenderingContext2D) => {
        renderWaveform(peaks, ctx, settings);
      }
    });

    setupWaveSurferEvents();
    const blobUrl = await getAudioBlobUrl(url);
    await wavesurfer.load(blobUrl);

    if (store.getState().isPlaying) {
      await wavesurfer.play();
    }
  }

  async function createCustomVisualizer(
    url: string, 
    settings: VisualizerSettings, 
    container: HTMLElement
  ) {
    // Clear container and add canvas
    container.innerHTML = '';
    if (canvas) {
      container.appendChild(canvas);
      resizeCanvas();
    }

    // Setup Web Audio API
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    analyser.fftSize = settings.barCount ? settings.barCount * 4 : 256;
    analyser.smoothingTimeConstant = settings.smoothing;
    
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    // Load and connect audio
    const blobUrl = await getAudioBlobUrl(url);
    const audio = new Audio(blobUrl);
    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);

    // Setup audio events
    audio.addEventListener('play', () => {
      if (store.getState().isPlaying !== true) {
        store.getState().setIsPlaying(true);
      }
      startAnimation(settings);
    });

    audio.addEventListener('pause', () => {
      if (store.getState().isPlaying !== false) {
        store.getState().setIsPlaying(false);
      }
      stopAnimation();
    });

    // Store audio reference for playback control
    (container as any).audioElement = audio;

    if (store.getState().isPlaying) {
      await audio.play();
    }
  }

  function renderWaveform(
    peaks: Array<Float32Array | number[]>, 
    ctx: CanvasRenderingContext2D, 
    settings: VisualizerSettings
  ) {
    const height = ctx.canvas.height;
    const width = ctx.canvas.width;
    
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = settings.waveColor;
    
    const middle = height / 2;
    const bar = width / peaks[0].length;
    
    if (peaks[0] instanceof Float32Array || Array.isArray(peaks[0])) {
      for (let i = 0; i < peaks[0].length; i++) {
        const peak = peaks[0][i];
        const h = Math.abs((peak as number) * height * settings.sensitivity);
        ctx.fillRect(i * bar, middle - h / 2, bar - 0.5, h);
      }
    }
  }

  function startAnimation(settings: VisualizerSettings) {
    if (!ctx || !canvas || !analyser || !dataArray) return;

    const animate = () => {
      if (!ctx || !canvas || !analyser || !dataArray) return;
      
      analyser.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      switch (settings.type) {
        case 'bars':
          renderBars(ctx, dataArray, settings);
          break;
        case 'circular':
          renderCircular(ctx, dataArray, settings);
          break;
        case 'spectrum':
          renderSpectrum(ctx, dataArray, settings);
          break;
        case 'mirror':
          renderMirror(ctx, dataArray, settings);
          break;
        case 'particles':
          renderParticles(ctx, dataArray, settings);
          break;
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  function stopAnimation() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }

  function renderBars(ctx: CanvasRenderingContext2D, data: Uint8Array, settings: VisualizerSettings) {
    const barCount = settings.barCount || 64;
    const barWidth = canvas!.width / barCount;
    const stepSize = Math.floor(data.length / barCount);
    
    ctx.fillStyle = settings.waveColor;
    
    for (let i = 0; i < barCount; i++) {
      const barHeight = (data[i * stepSize] / 255) * canvas!.height * settings.sensitivity;
      const x = i * barWidth;
      const y = canvas!.height - barHeight;
      
      // Add gradient effect
      const gradient = ctx.createLinearGradient(0, y, 0, canvas!.height);
      gradient.addColorStop(0, settings.progressColor);
      gradient.addColorStop(1, settings.waveColor);
      ctx.fillStyle = gradient;
      
      ctx.fillRect(x, y, barWidth - 2, barHeight);
    }
  }

  function renderCircular(ctx: CanvasRenderingContext2D, data: Uint8Array, settings: VisualizerSettings) {
    const centerX = canvas!.width / 2;
    const centerY = canvas!.height / 2;
    const radius = Math.min(centerX, centerY) * 0.3;
    const barCount = settings.barCount || 64;
    const stepSize = Math.floor(data.length / barCount);
    
    ctx.strokeStyle = settings.waveColor;
    ctx.lineWidth = 2;
    
    for (let i = 0; i < barCount; i++) {
      const angle = (i / barCount) * Math.PI * 2;
      const barHeight = (data[i * stepSize] / 255) * radius * settings.sensitivity;
      
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);
      
      // Color based on frequency
      const hue = (i / barCount) * 360;
      ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  function renderSpectrum(ctx: CanvasRenderingContext2D, data: Uint8Array, settings: VisualizerSettings) {
    const width = canvas!.width;
    const height = canvas!.height;
    
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < data.length; i++) {
      const x = (i / data.length) * width;
      const y = height - (data[i] / 255) * height * settings.sensitivity;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      // Add color gradient
      const hue = (i / data.length) * 360;
      ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
    }
    
    ctx.stroke();
  }

  function renderMirror(ctx: CanvasRenderingContext2D, data: Uint8Array, settings: VisualizerSettings) {
    const barCount = settings.barCount || 32;
    const barWidth = canvas!.width / (barCount * 2);
    const stepSize = Math.floor(data.length / barCount);
    const centerY = canvas!.height / 2;
    
    for (let i = 0; i < barCount; i++) {
      const barHeight = (data[i * stepSize] / 255) * centerY * settings.sensitivity;
      const x = i * barWidth;
      
      // Top half
      const gradient1 = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY);
      gradient1.addColorStop(0, settings.progressColor);
      gradient1.addColorStop(1, settings.waveColor);
      ctx.fillStyle = gradient1;
      ctx.fillRect(x, centerY - barHeight, barWidth - 1, barHeight);
      
      // Bottom half (mirrored)
      const gradient2 = ctx.createLinearGradient(0, centerY, 0, centerY + barHeight);
      gradient2.addColorStop(0, settings.waveColor);
      gradient2.addColorStop(1, settings.progressColor);
      ctx.fillStyle = gradient2;
      ctx.fillRect(x, centerY, barWidth - 1, barHeight);
      
      // Mirror on right side
      const mirrorX = canvas!.width - x - barWidth;
      ctx.fillStyle = gradient1;
      ctx.fillRect(mirrorX, centerY - barHeight, barWidth - 1, barHeight);
      ctx.fillStyle = gradient2;
      ctx.fillRect(mirrorX, centerY, barWidth - 1, barHeight);
    }
  }

  function renderParticles(ctx: CanvasRenderingContext2D, data: Uint8Array, settings: VisualizerSettings) {
    const particleCount = settings.particleCount || 100;
    const centerX = canvas!.width / 2;
    const centerY = canvas!.height / 2;
    
    for (let i = 0; i < particleCount && i < data.length; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const intensity = data[i] / 255 * settings.sensitivity;
      const radius = intensity * Math.min(centerX, centerY) * 0.8;
      
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      const size = intensity * 10 + 2;
      
      // Color based on intensity and position
      const hue = (intensity * 360 + i * 3) % 360;
      ctx.fillStyle = `hsla(${hue}, 70%, 60%, ${intensity})`;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function setupWaveSurferEvents() {
    if (!wavesurfer) return;

    wavesurfer.on('ready', () => {
      console.log('WaveSurfer is ready');
    });

    wavesurfer.on('play', () => {
      console.log('WaveSurfer playing');
      if (store.getState().isPlaying !== true) {
        store.getState().setIsPlaying(true);
      }
    });

    wavesurfer.on('pause', () => {
      console.log('WaveSurfer paused');
      if (store.getState().isPlaying !== false) {
        store.getState().setIsPlaying(false);
      }
    });

    wavesurfer.on('interaction', () => {
      wavesurfer?.play();
    });

    wavesurfer.on('error', (error) => {
      console.error('Wavesurfer error:', error);
    });
  }

  function resizeCanvas() {
    if (!canvas || !container) return;
    
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }

  function cleanup() {
    // Cleanup WaveSurfer
    if (wavesurfer) {
      try {
        wavesurfer.pause();
        wavesurfer.destroy();
      } catch (error) {
        console.warn('Error cleaning up wavesurfer:', error);
      }
      wavesurfer = null;
    }

    // Cleanup Web Audio API
    stopAnimation();
    if (audioContext) {
      try {
        audioContext.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
      audioContext = null;
    }
    analyser = null;
    dataArray = null;

    // Cleanup audio element
    const audioElement = (container as any)?.audioElement;
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
      (container as any).audioElement = null;
    }
  }

  // Keep track of the last track URL and settings
  let lastTrackUrl: string | null = null;
  let lastVisualizerType: VisualizerType = 'waveform';

  // Subscribe to store changes
  store.subscribe((state) => {
    const currentType = (state as any).visualizerType || 'waveform';
    
    // Handle track changes or visualizer type changes
    if (state.currentTrack !== lastTrackUrl || currentType !== lastVisualizerType) {
      lastTrackUrl = state.currentTrack;
      lastVisualizerType = currentType;
      
      if (state.currentTrack) {
        const settings = { ...defaultSettings, type: currentType };
        createWaveform(state.currentTrack, settings);
      } else {
        cleanup();
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

    // Handle custom visualizer playback
    const audioElement = (container as any)?.audioElement;
    if (audioElement) {
      try {
        if (state.isPlaying && audioElement.paused) {
          audioElement.play().catch((error: any) => {
            console.error('Error playing audio:', error);
            store.getState().setIsPlaying(false);
          });
        } else if (!state.isPlaying && !audioElement.paused) {
          audioElement.pause();
        }
      } catch (error) {
        console.error('Error controlling custom visualizer playback:', error);
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
    
    if (canvas && container) {
      resizeCanvas();
    }
  });

  // Cleanup on page unload
  window.addEventListener('beforeunload', cleanup);

  return {
    setVisualizerType: (type: VisualizerType) => {
      if (lastTrackUrl) {
        const settings = { ...defaultSettings, type };
        createWaveform(lastTrackUrl, settings);
      }
    },
    updateSettings: (newSettings: Partial<VisualizerSettings>) => {
      if (lastTrackUrl) {
        const settings = { ...defaultSettings, ...newSettings };
        createWaveform(lastTrackUrl, settings);
      }
    },
    cleanup
  };
}