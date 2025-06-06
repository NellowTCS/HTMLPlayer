//this used visualizer-manager.js will have only 1 canvas active at a time. best for performance resons
class VisualizerManager {
  constructor(audio, canvasContainer) {
    this.audio = audio;
    this.canvasContainer = canvasContainer;
    this.audioContext = null;
    this.analyser = null;
    this.activeVisualizer = null; // Changed from Set to single value
    this.canvas = null; // Single canvas instance
    this.context = null; // Single context instance
    this.animationFrame = null;
  }

  initialize() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaElementSource(this.audio);
      source.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      this.analyser.fftSize = 2048;
    }
  }

  createCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.canvasContainer.clientWidth;
    canvas.height = this.canvasContainer.clientHeight;
    this.canvasContainer.appendChild(canvas);
    return canvas;
  }

  addVisualizer(type) {
    if (!spectrogramTypes[type]) return;

    this.initialize();
    
    // Remove existing visualizer if any
    if (this.activeVisualizer) {
      this.removeVisualizer(this.activeVisualizer);
    }

    // Create new canvas if needed
    if (!this.canvas) {
      this.canvas = this.createCanvas();
      this.context = this.canvas.getContext('2d');
    }

    this.activeVisualizer = type;
    if (!this.animationFrame) this.startAnimation();
  }

  removeVisualizer(type) {
    if (this.activeVisualizer !== type) return;
    
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.context = null;
    }

    this.activeVisualizer = null;
    this.stopAnimation();
  }

  startAnimation() {
    const bufferLength = this.analyser.frequencyBinCount;
    const timeDataArray = new Uint8Array(bufferLength);
    const freqDataArray = new Uint8Array(bufferLength);

    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);
      
      const visualizer = spectrogramTypes[this.activeVisualizer];
      if (visualizer) {
        visualizer.draw(
          this.analyser,
          this.canvas,
          this.context,
          bufferLength,
          this.activeVisualizer === 'oscilloscope' ? timeDataArray : freqDataArray
        );
      }
    };
    
    animate();
  }

  stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  resizeCanvas() {
    if (this.canvas) {
      this.canvas.width = this.canvasContainer.clientWidth;
      this.canvas.height = this.canvasContainer.clientHeight;
    }
  }
}
