import * as d3 from 'd3';
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

class VisualizerManager {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private animationId: number | null = null;
  private container: HTMLElement | null = null;
  private svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private currentSettings: VisualizerSettings;
  private lastTrackUrl: string | null = null;
  private lastVisualizerType: VisualizerType = 'waveform';
  private isDestroyed = false;
  private resizeObserver: ResizeObserver | null = null;
  private howlInstance: any = null;
  private waveformData: number[] = [];
  private currentTime = 0;
  private duration = 0;
  private resizeTimeoutId: number | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;

  private readonly defaultSettings: VisualizerSettings = {
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

  constructor(private store: UseBoundStore<StoreApi<AppState>>) {
    this.currentSettings = { ...this.defaultSettings };
    this.initialize();
  }

  private initialize() {
    this.container = document.getElementById('visualizer');
    if (!this.container) {
      console.error('Visualizer container element not found');
      return;
    }

    this.setupSVG();
    this.setupResizeObserver();
    this.subscribeToStore();
    this.setupCleanupHandlers();
  }

  private setupSVG() {
    if (!this.container) return;

    // Clear container
    d3.select(this.container).selectAll('*').remove();

    // Create SVG with D3
    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('display', 'block');

    this.resizeSVG();
  }

  private setupResizeObserver() {
    if (!this.container) return;

    this.resizeObserver = new ResizeObserver((entries) => {
      if (this.resizeTimeoutId) {
        clearTimeout(this.resizeTimeoutId);
      }
      
      this.resizeTimeoutId = window.setTimeout(() => {
        requestAnimationFrame(() => {
          this.handleResize();
        });
      }, 16);
    });
    
    this.resizeObserver.observe(this.container);
  }

  private handleResize() {
    if (this.isDestroyed) return;
    this.resizeSVG();
  }

  private resizeSVG() {
    if (!this.svg || !this.container) return;
    
    const rect = this.container.getBoundingClientRect();
    
    const currentWidth = parseInt(this.svg.attr('width') as string) || 0;
    const currentHeight = parseInt(this.svg.attr('height') as string) || 0;
    
    if (Math.abs(currentWidth - rect.width) > 1 || Math.abs(currentHeight - rect.height) > 1) {
      this.svg
        .attr('width', rect.width)
        .attr('height', rect.height);
    }
  }

  // Method to connect Howl instance
  public setHowlInstance(howl: any) {
    console.log('Setting Howl instance for visualizer:', howl);
    this.howlInstance = howl;
    
    if (this.lastTrackUrl) {
      this.createVisualization(this.lastTrackUrl, this.currentSettings);
    }
  }

  private async createVisualization(url: string, settings: VisualizerSettings = this.defaultSettings) {
    const prevType = this.currentSettings.type;
    const newType = settings.type;
    const typeChanged = prevType !== newType;
    const urlChanged = url !== this.lastTrackUrl;

    // Store current state before cleanup
    const playbackState = this.getCurrentPlaybackState();
    
    // Only do full cleanup if visualization type changes or URL changes
    if (typeChanged || urlChanged) {
      await this.cleanup(false);
    }

    this.currentSettings = { ...this.currentSettings, ...settings };
    this.lastTrackUrl = url;

    if (typeChanged || urlChanged) {
      if (this.currentSettings.type === 'waveform') {
        await this.setupWaveformVisualization(url);
      } else {
        await this.setupRealtimeVisualization(url);
      }
    } else {
      // Just update visualization with new settings
      if (this.currentSettings.type === 'waveform') {
        this.renderWaveform();
      } else if (this.analyser) {
        this.analyser.smoothingTimeConstant = Math.max(0, Math.min(1, this.currentSettings.smoothing));
        if (this.currentSettings.type !== 'spectrum') {
          this.analyser.fftSize = Math.max(256, (this.currentSettings.barCount || 64) * 4);
          this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        }
      }
    }
  }

  private async setupWaveformVisualization(url: string) {
    if (!this.container || !this.svg) return;

    try {
      // Load audio file and decode to get waveform data
      const blobUrl = await getAudioBlobUrl(url);
      const audioBuffer = await this.loadAudioBuffer(blobUrl);
      
      // Extract waveform data
      this.waveformData = this.extractWaveformData(audioBuffer);
      this.duration = audioBuffer.duration;

      // Render static waveform
      this.renderWaveform();

      // Start progress tracking with Howl
      this.startProgressTracking();

    } catch (error) {
      console.error('Error setting up waveform visualization:', error);
    }
  }

  private async loadAudioBuffer(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  private extractWaveformData(audioBuffer: AudioBuffer, samples = 1000): number[] {
    const rawData = audioBuffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / samples);
    const filteredData: number[] = [];

    for (let i = 0; i < samples; i++) {
      const blockStart = blockSize * i;
      let sum = 0;
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[blockStart + j]);
      }
      filteredData.push(sum / blockSize);
    }

    return filteredData;
  }

  private renderWaveform() {
    if (!this.svg || !this.container) return;

    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const middle = height / 2;

    // Clear previous waveform
    this.svg.selectAll('.waveform-group').remove();

    const waveformGroup = this.svg.append('g').attr('class', 'waveform-group');

    // Create scales
    const xScale = d3.scaleLinear()
      .domain([0, this.waveformData.length - 1])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(this.waveformData) || 1])
      .range([0, middle * this.currentSettings.sensitivity]);

    // Create waveform bars
    const barWidth = width / this.waveformData.length;

    waveformGroup.selectAll('.waveform-bar')
      .data(this.waveformData)
      .enter()
      .append('rect')
      .attr('class', 'waveform-bar')
      .attr('x', (d, i) => xScale(i))
      .attr('y', d => middle - yScale(d) / 2)
      .attr('width', Math.max(1, barWidth - 0.5))
      .attr('height', d => yScale(d))
      .attr('fill', this.currentSettings.waveColor);

    // Add progress overlay
    this.updateWaveformProgress();
  }

  private updateWaveformProgress() {
    if (!this.svg || !this.duration) return;

    const rect = this.container!.getBoundingClientRect();
    const width = rect.width;
    const progressWidth = (this.currentTime / this.duration) * width;

    // Remove existing progress overlay
    this.svg.selectAll('.progress-overlay').remove();

    // Add progress overlay
    this.svg.append('rect')
      .attr('class', 'progress-overlay')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', progressWidth)
      .attr('height', '100%')
      .attr('fill', this.currentSettings.progressColor)
      .attr('opacity', 0.7)
      .style('pointer-events', 'none');
  }

  private startProgressTracking() {
    const updateProgress = () => {
      if (this.isDestroyed) return;

      if (this.howlInstance) {
        try {
          const seek = this.howlInstance.seek();
          const duration = this.howlInstance.duration();
          
          if (typeof seek === 'number' && typeof duration === 'number') {
            this.currentTime = seek;
            this.duration = duration;
            this.updateWaveformProgress();
            this.updateTimeDisplay();
          }
        } catch (error) {
          // Silently handle errors during tracking
        }
      }

      requestAnimationFrame(updateProgress);
    };

    updateProgress();
  }

  private async setupRealtimeVisualization(url: string) {
    if (!this.container || !this.svg) return;

    try {
      // Setup Web Audio API
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = Math.max(256, (this.currentSettings.barCount || 64) * 4);
      this.analyser.smoothingTimeConstant = Math.max(0, Math.min(1, this.currentSettings.smoothing));
      
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);

      // Connect to Howl's audio node if available
      if (this.howlInstance && this.howlInstance._sounds && this.howlInstance._sounds.length > 0) {
        const sound = this.howlInstance._sounds[0];
        
        // Try to get the audio node from Howl
        if (sound._node) {
          try {
            // Create source node from Howl's audio element
            this.sourceNode = this.audioContext.createMediaElementSource(sound._node);
            this.sourceNode.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            console.log('Connected to Howl audio node successfully');
          } catch (error) {
            console.warn('Could not connect to Howl audio node:', error);
            // Fallback: create a silent source for visualization
            this.createFallbackSource();
          }
        } else {
          console.warn('Howl sound node not available, using fallback');
          this.createFallbackSource();
        }
      } else {
        console.warn('Howl instance not available, using fallback');
        this.createFallbackSource();
      }

      // Start animation if playing
      if (this.store.getState().isPlaying) {
        this.startAnimation();
      }

    } catch (error) {
      console.error('Error setting up realtime visualization:', error);
    }
  }

  private createFallbackSource() {
    if (!this.audioContext || !this.analyser) return;
    
    try {
      // Create a simple oscillator as a fallback for visualization
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      gainNode.gain.value = 0; // Silent
      oscillator.frequency.value = 440;
      
      oscillator.connect(gainNode);
      gainNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
      oscillator.start();
      
      console.log('Created fallback audio source for visualization');
    } catch (error) {
      console.error('Error creating fallback source:', error);
    }
  }

  private getCurrentPlaybackState() {
    let currentTime = 0;
    let wasPlaying = false;

    if (this.howlInstance) {
      try {
        const seek = this.howlInstance.seek();
        if (typeof seek === 'number') {
          currentTime = seek;
        }
        wasPlaying = this.howlInstance.playing();
      } catch (error) {
        // Handle error silently
      }
    }

    return { currentTime, wasPlaying };
  }

  private startAnimation() {
    if (this.isDestroyed || !this.svg || !this.analyser || !this.dataArray) return;

    this.stopAnimation();

    const animate = () => {
      if (this.isDestroyed || !this.svg || !this.analyser || !this.dataArray) return;
      
      this.analyser.getByteFrequencyData(this.dataArray);
      
      // Clear and set background
      this.svg.selectAll('.visualization-group').remove();
      this.svg.style('background-color', this.currentSettings.backgroundColor);
      
      const vizGroup = this.svg.append('g').attr('class', 'visualization-group');
      
      // Render based on type
      switch (this.currentSettings.type) {
        case 'bars':
          this.renderBarsD3(vizGroup, this.dataArray);
          break;
        case 'circular':
          this.renderCircularD3(vizGroup, this.dataArray);
          break;
        case 'spectrum':
          this.renderSpectrumD3(vizGroup, this.dataArray);
          break;
        case 'mirror':
          this.renderMirrorD3(vizGroup, this.dataArray);
          break;
        case 'particles':
          this.renderParticlesD3(vizGroup, this.dataArray);
          break;
      }
      
      this.animationId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  private renderBarsD3(group: d3.Selection<SVGGElement, unknown, null, undefined>, data: Uint8Array) {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const barCount = this.currentSettings.barCount || 64;
    const barWidth = width / barCount;
    const stepSize = Math.floor(data.length / barCount);

    const barData = Array.from({ length: barCount }, (_, i) => {
      const dataIndex = Math.min(i * stepSize, data.length - 1);
      return {
        index: i,
        value: data[dataIndex],
        height: (data[dataIndex] / 255) * height * this.currentSettings.sensitivity
      };
    });

    group.selectAll('.bar')
      .data(barData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => d.index * barWidth)
      .attr('y', d => height - d.height)
      .attr('width', barWidth - 2)
      .attr('height', d => d.height)
      .attr('fill', (d, i) => {
        const intensity = d.value / 255;
        return d3.interpolateRgb(this.currentSettings.waveColor, this.currentSettings.progressColor)(intensity);
      });
  }

  private renderCircularD3(group: d3.Selection<SVGGElement, unknown, null, undefined>, data: Uint8Array) {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) * 0.3;
    const barCount = this.currentSettings.barCount || 64;
    const stepSize = Math.floor(data.length / barCount);

    const circularData = Array.from({ length: barCount }, (_, i) => {
      const dataIndex = Math.min(i * stepSize, data.length - 1);
      const angle = (i / barCount) * Math.PI * 2;
      const barHeight = (data[dataIndex] / 255) * radius * this.currentSettings.sensitivity;
      
      return {
        angle,
        barHeight,
        x1: centerX + Math.cos(angle) * radius,
        y1: centerY + Math.sin(angle) * radius,
        x2: centerX + Math.cos(angle) * (radius + barHeight),
        y2: centerY + Math.sin(angle) * (radius + barHeight),
        hue: (i / barCount) * 360
      };
    });

    group.selectAll('.circular-bar')
      .data(circularData)
      .enter()
      .append('line')
      .attr('class', 'circular-bar')
      .attr('x1', d => d.x1)
      .attr('y1', d => d.y1)
      .attr('x2', d => d.x2)
      .attr('y2', d => d.y2)
      .attr('stroke', d => `hsl(${d.hue}, 70%, 60%)`)
      .attr('stroke-width', 3);
  }

  private renderSpectrumD3(group: d3.Selection<SVGGElement, unknown, null, undefined>, data: Uint8Array) {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const lineData = Array.from(data).map((value, i) => ({
      x: (i / data.length) * width,
      y: height - (value / 255) * height * this.currentSettings.sensitivity
    }));

    const line = d3.line<{x: number, y: number}>()
      .x(d => d.x)
      .y(d => d.y)
      .curve(d3.curveCardinal);

    group.append('path')
      .datum(lineData)
      .attr('class', 'spectrum-line')
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', this.currentSettings.waveColor)
      .attr('stroke-width', 2);
  }

  private renderMirrorD3(group: d3.Selection<SVGGElement, unknown, null, undefined>, data: Uint8Array) {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const barCount = this.currentSettings.barCount || 32;
    const barWidth = width / (barCount * 2);
    const stepSize = Math.floor(data.length / barCount);
    const centerY = height / 2;

    const mirrorData = Array.from({ length: barCount }, (_, i) => {
      const dataIndex = Math.min(i * stepSize, data.length - 1);
      const barHeight = (data[dataIndex] / 255) * centerY * this.currentSettings.sensitivity;
      return {
        index: i,
        barHeight,
        x: i * barWidth,
        mirrorX: width - i * barWidth - barWidth
      };
    });

    // Draw main bars
    mirrorData.forEach(d => {
      // Top bars
      group.append('rect')
        .attr('x', d.x)
        .attr('y', centerY - d.barHeight)
        .attr('width', barWidth - 1)
        .attr('height', d.barHeight)
        .attr('fill', this.currentSettings.progressColor);

      // Bottom bars
      group.append('rect')
        .attr('x', d.x)
        .attr('y', centerY)
        .attr('width', barWidth - 1)
        .attr('height', d.barHeight)
        .attr('fill', this.currentSettings.waveColor);

      // Mirror bars
      group.append('rect')
        .attr('x', d.mirrorX)
        .attr('y', centerY - d.barHeight)
        .attr('width', barWidth - 1)
        .attr('height', d.barHeight)
        .attr('fill', this.currentSettings.progressColor);

      group.append('rect')
        .attr('x', d.mirrorX)
        .attr('y', centerY)
        .attr('width', barWidth - 1)
        .attr('height', d.barHeight)
        .attr('fill', this.currentSettings.waveColor);
    });
  }

  private renderParticlesD3(group: d3.Selection<SVGGElement, unknown, null, undefined>, data: Uint8Array) {
    if (!this.container) return;

    const rect = this.container.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const maxRadius = Math.min(centerX, centerY) * 0.8;
    const particleCount = Math.min(this.currentSettings.particleCount || 100, data.length);

    const particleData = Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * Math.PI * 2;
      const intensity = data[i] / 255 * this.currentSettings.sensitivity;
      const radius = intensity * maxRadius;
      
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        size: Math.max(1, intensity * 8 + 2),
        hue: (intensity * 360 + i * 3) % 360,
        alpha: Math.max(0.3, intensity)
      };
    });

    group.selectAll('.particle')
      .data(particleData)
      .enter()
      .append('circle')
      .attr('class', 'particle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.size)
      .attr('fill', d => `hsla(${d.hue}, 70%, 60%, ${d.alpha})`);
  }

  private stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private updateTimeDisplay() {
    const progressEl = document.getElementById('progress') as HTMLInputElement;
    const timeDisplay = document.getElementById('timeDisplay');
    
    if (progressEl && this.duration > 0) {
      progressEl.value = ((this.currentTime / this.duration) * 100).toString();
    }
    
    if (timeDisplay && this.duration > 0) {
      const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
      };
      
      timeDisplay.textContent = `${formatTime(this.currentTime)} / ${formatTime(this.duration)}`;
    }
  }

  private subscribeToStore() {
    this.store.subscribe((state) => {
      if (this.isDestroyed) return;

      const currentType = (state as any).visualizerType || 'waveform';
      
      if (state.currentTrack !== this.lastTrackUrl || currentType !== this.lastVisualizerType) {
        this.lastTrackUrl = state.currentTrack;
        this.lastVisualizerType = currentType;
        
        if (state.currentTrack) {
          const settings: VisualizerSettings = { ...this.currentSettings, type: currentType };
          this.createVisualization(state.currentTrack, settings);
        } else {
          this.cleanup(false);
        }
      }

      this.handlePlaybackStateChange(state.isPlaying);
    });
  }

  private handlePlaybackStateChange(shouldPlay: boolean) {
    if (this.currentSettings.type !== 'waveform') {
      if (shouldPlay && !this.animationId) {
        this.startAnimation();
      } else if (!shouldPlay) {
        this.stopAnimation();
      }
    }
  }

  private setupCleanupHandlers() {
    window.addEventListener('beforeunload', () => {
      this.cleanup(true);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.stopAnimation();
      } else if (this.store.getState().isPlaying && this.currentSettings.type !== 'waveform') {
        this.startAnimation();
      }
    });
  }

  private async cleanup(isDestroying = false) {
    if (isDestroying) {
      this.isDestroyed = true;
    }

    this.stopAnimation();

    if (this.resizeTimeoutId) {
      clearTimeout(this.resizeTimeoutId);
      this.resizeTimeoutId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (error) {
        console.warn('Error disconnecting source node:', error);
      }
      this.sourceNode = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        await this.audioContext.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;

    if (isDestroying && this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  // Public API methods
  public setVisualizerType(type: VisualizerType) {
    if (this.isDestroyed) return;
    
    if (this.lastTrackUrl) {
      const settings: VisualizerSettings = { ...this.currentSettings, type };
      this.createVisualization(this.lastTrackUrl, settings);
    }
  }

  public updateSettings(newSettings: Partial<VisualizerSettings>) {
    if (this.isDestroyed) return;
    
    if (this.lastTrackUrl) {
      const settings: VisualizerSettings = { ...this.currentSettings, ...newSettings } as VisualizerSettings;
      this.createVisualization(this.lastTrackUrl, settings);
    }
  }

  public destroy() {
    this.cleanup(true);
  }
}

// Export factory function to maintain API compatibility
export function initVisualizer(store: UseBoundStore<StoreApi<AppState>>) {
  return new VisualizerManager(store);
}