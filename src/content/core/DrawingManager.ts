import { DrawingEngine } from '../../lib';
import type { DrawingMode, DrawingOptions } from '../../lib';

export class DrawingManager {
  private drawingEngine: DrawingEngine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private isActive = false;
  private librariesLoaded = false;
  private currentMode: DrawingMode = 'select';
  private currentOptions: DrawingOptions = {
    color: '#ff0000',
    strokeWidth: 5,
    fontSize: 16,
    roughness: 1,
    opacity: 1,
    hasFill: false,
    strokeColor: '#ff0000',
    fontFamily: 'Arial',
    fontWeight: 'normal',
    textAlign: 'center',
    lineDash: [],
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0
  };

  constructor() {
    this.loadLibraries();
  }

  private async loadLibraries(): Promise<void> {
    if (this.librariesLoaded) return;
    try {

      this.librariesLoaded = true;
      console.log('🔧 DrawingManager: Libraries loaded successfully');
    } catch (error) {
      console.error('🔧 DrawingManager: Failed to load drawing libraries:', error);
      throw error;
    }
  }

  public async activate(): Promise<void> {
    if (this.isActive || !this.librariesLoaded) return;
    
    try {
      console.log('🔧 DrawingManager: Starting activation...');
      this.createCanvas();
      console.log('🔧 DrawingManager: Canvas created');
      

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          try {
            this.drawingEngine = new DrawingEngine(this.canvas!);
            this.drawingEngine.setMode(this.currentMode);
            this.drawingEngine.setOptions(this.currentOptions);
            console.log('🔧 DrawingManager: DrawingEngine created and configured');
            resolve();
          } catch (error) {
            console.error('🔧 DrawingManager: Failed to create DrawingEngine:', error);
            throw error;
          }
        }, 100);
      });
      
      this.isActive = true;
      console.log('🔧 DrawingManager: Activation completed successfully');
    } catch (error) {
      console.error('🔧 DrawingManager: Failed to activate drawing mode:', error);

      this.deactivate();
      throw error;
    }
  }

  public deactivate(): void {
    if (!this.isActive) return;
    
    console.log('🔧 DrawingManager: Starting deactivation...');
    
    try {
      this.safeRemoveElement(this.canvas);
      this.canvas = null;
      console.log('🔧 DrawingManager: Canvas removed');
      
      if (this.drawingEngine) {
        this.drawingEngine.destroy();
        console.log('🔧 DrawingManager: DrawingEngine destroyed');
      }
      
      this.isActive = false;
      this.drawingEngine = null;
      console.log('🔧 DrawingManager: Deactivation completed successfully');
    } catch (error) {
      console.error('🔧 DrawingManager: Error during deactivation:', error);

      this.isActive = false;
      this.drawingEngine = null;
      this.canvas = null;
    }
  }

  private createCanvas(): void {
    const oldCanvas = document.getElementById('drawing-canvas-overlay');
    this.safeRemoveElement(oldCanvas);
    
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'drawing-canvas-overlay';
    this.canvas.tabIndex = 0;
    
    const { innerWidth: width, innerHeight: height } = window;
    this.canvas.width = width;
    this.canvas.height = height;
    
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: ${width}px;
      height: ${height}px;
      z-index: 999999998;
      pointer-events: auto;
      background: transparent;
    `;

    document.body.appendChild(this.canvas);
  }

  private safeRemoveElement(element: Element | null): void {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }

  public setMode(mode: DrawingMode): void {
    this.currentMode = mode;
    this.drawingEngine?.setMode(mode);
  }

  public setOptions(options: DrawingOptions): void {
    Object.assign(this.currentOptions, options);
    this.drawingEngine?.setOptions(this.currentOptions);
  }

  public getMode(): DrawingMode {
    return this.currentMode;
  }

  public getOptions(): DrawingOptions {
    return { ...this.currentOptions };
  }

  public getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  public getDrawingEngine(): DrawingEngine | null {
    return this.drawingEngine;
  }

  public isDrawingActive(): boolean {
    return this.isActive;
  }

  public isTextEditing(): boolean {
    return this.drawingEngine?.isTextEditing() || false;
  }

  public clear(): void {
    this.drawingEngine?.clear();
  }

  public deleteSelected(): void {
    this.drawingEngine?.deleteSelected();
  }

  public undo(): void {
    this.drawingEngine?.undo();
  }

  public async capture(includeBackground: boolean = true): Promise<string> {
    if (!this.drawingEngine) throw new Error('Drawing engine not initialized');
    return includeBackground ? await this.drawingEngine.captureWithBackground() : this.drawingEngine.exportDrawing();
  }

  public async download(includeBackground: boolean = true): Promise<void> {
    const link = document.createElement('a');
    link.download = `drawing_${Date.now()}.png`;
    link.href = await this.capture(includeBackground);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => this.safeRemoveElement(link), 100);
  }

  public handleResize(): void {
    if (!this.canvas || !this.drawingEngine) return;
    
    const { innerWidth: width, innerHeight: height } = window;
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.drawingEngine.resize(width, height);
  }
} 