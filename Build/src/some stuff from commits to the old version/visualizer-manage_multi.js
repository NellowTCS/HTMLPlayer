// this unused visualizer-manager.js will have multiple canvases active at once
class VisualizerManager {
  constructor(audio, canvasContainer) {
    this.audio = audio;
    this.canvasContainer = canvasContainer;
    this.audioContext = null;
    this.analyser = null;
    this.activeVisualizers = new Set();
    this.canvases = {};
    this.contexts = {};
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

  createCanvas(id) {
    const canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.width = this.canvasContainer.clientWidth;
    canvas.height = this.canvasContainer.clientHeight;
    this.canvasContainer.appendChild(canvas);
    return canvas;
  }

  addVisualizer(type) {
    if (!spectrogramTypes[type] || this.activeVisualizers.has(type)) return;

    this.initialize();
    
    if (!this.canvases[type]) {
      this.canvases[type] = this.createCanvas(type);
      this.contexts[type] = this.canvases[type].getContext('2d');
    }

    this.activeVisualizers.add(type);
    if (!this.animationFrame) this.startAnimation();
  }

  removeVisualizer(type) {
    if (!this.activeVisualizers.has(type)) return;
    
    this.activeVisualizers.delete(type);
    if (this.canvases[type]) {
      this.canvases[type].remove();
      delete this.canvases[type];
      delete this.contexts[type];
    }

    if (this.activeVisualizers.size === 0) {
      this.stopAnimation();
    }
  }

  startAnimation() {
    const bufferLength = this.analyser.frequencyBinCount;
    const timeDataArray = new Uint8Array(bufferLength);
    const freqDataArray = new Uint8Array(bufferLength);

    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);
      
      this.activeVisualizers.forEach(type => {
        const visualizer = spectrogramTypes[type];
        if (visualizer) {
          visualizer.draw(
            this.analyser,
            this.canvases[type],
            this.contexts[type],
            bufferLength,
            type === 'oscilloscope' ? timeDataArray : freqDataArray
          );
        }
      });
    };

    animate();
  }

  stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  resizeCanvases() {
    Object.entries(this.canvases).forEach(([type, canvas]) => {
      canvas.width = this.canvasContainer.clientWidth;
      canvas.height = this.canvasContainer.clientHeight;
    });
  }
}
