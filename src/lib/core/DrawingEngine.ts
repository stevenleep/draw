import { DrawingMode, DrawingObject, DrawingOptions } from './types';
import { DrawingState } from '../state/DrawingState';
import { TextEditingState } from '../state/TextEditingState';
import { DrawingRenderer } from '../rendering/DrawingRenderer';
import { DrawingEventHandler } from '../events/DrawingEventHandler';
import { ToolManager } from '../plugins/ToolManager';

export class DrawingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private drawingState: DrawingState;
  private textEditingState: TextEditingState;
  private toolManager: ToolManager;
  private renderer: DrawingRenderer;
  private eventHandler: DrawingEventHandler;
  private mode: DrawingMode = 'pen';
  private onModeChange?: (mode: DrawingMode) => void;

  constructor(canvasElement: HTMLCanvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d')!;
    this.drawingState = new DrawingState();
    this.textEditingState = new TextEditingState();
    this.toolManager = new ToolManager();
    this.renderer = new DrawingRenderer(this.ctx, this.toolManager, this.textEditingState);
    this.eventHandler = new DrawingEventHandler(
      this.canvas,
      this.drawingState,
      this.textEditingState,
      this.toolManager
    );
    this.eventHandler.setModeChangeCallback(this.handleModeChange.bind(this));
    this.eventHandler.setRedrawCallback(this.redrawCanvas.bind(this));
    this.setMode('select');
    console.log('🎨 DrawingEngine initialized');
  }

  setMode(mode: DrawingMode): void {
    this.mode = mode;
    this.eventHandler.setMode(mode);
    console.log('✏️ Mode set to:', mode);
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
  }

  getMode(): DrawingMode {
    return this.mode;
  }

  setModeChangeCallback(callback: (mode: DrawingMode) => void): void {
    this.onModeChange = callback;
  }

  private handleModeChange(mode: DrawingMode): void {
    this.mode = mode;
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
  }

  resize(width: number, height: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.putImageData(imageData, 0, 0);
  }

  clear(): void {
    this.drawingState.clear();
    this.redrawCanvas();
  }

  redrawCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.renderer.renderObjects(this.drawingState.getObjects());
    const currentDrawingObject = this.eventHandler.getCurrentDrawingObject();
    if (currentDrawingObject) {
      this.renderer.renderObject(currentDrawingObject);
    }
    this.renderer.renderTextEditingOverlay(this.drawingState.getSelectedObject());
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject) {
      this.renderer.renderSelectionBox(selectedObject);
      this.renderer.renderTransformHandles(this.eventHandler.getTransformHandles());
    }
  }

  getObjects(): DrawingObject[] {
    return this.drawingState.getObjects();
  }

  getSelectedObject(): DrawingObject | null {
    return this.drawingState.getSelectedObject();
  }

  addObject(obj: DrawingObject): void {
    this.drawingState.addObject(obj);
    this.redrawCanvas();
  }

  removeObject(obj: DrawingObject): void {
    this.drawingState.removeObject(obj);
    this.redrawCanvas();
  }

  deleteSelected(): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject) {
      this.drawingState.removeObject(selectedObject);
      this.drawingState.setSelectedObject(null);
      this.redrawCanvas();
    }
  }

  getOptions(): DrawingOptions {
    return this.drawingState.getOptions();
  }

  setOptions(options: Partial<DrawingOptions>): void {
    this.drawingState.updateOptions(options);
  }

  undo(): void {
    if (this.drawingState.undo()) {
      this.redrawCanvas();
    }
  }

  redo(): void {
    if (this.drawingState.redo()) {
      this.redrawCanvas();
    }
  }

  canUndo(): boolean {
    return this.drawingState.canUndo();
  }

  canRedo(): boolean {
    return this.drawingState.canRedo();
  }

  startTextEditing(textObj: DrawingObject): void {
    this.textEditingState.startEditing(textObj);
    this.drawingState.setSelectedObject(textObj);
    this.redrawCanvas();
  }

  finishTextEditing(): void {
    const newText = this.textEditingState.finishEditing();
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject && selectedObject.type === 'text') {
      selectedObject.text = newText;
      this.recalculateTextBounds(selectedObject);
      this.redrawCanvas();
    }
  }

  cancelTextEditing(): void {
    this.textEditingState.cancelEditing();
    this.redrawCanvas();
  }

  isTextEditing(): boolean {
    return this.textEditingState.isEditing();
  }

  private recalculateTextBounds(textObject: DrawingObject): void {
    this.ctx.font = `${textObject.options.fontWeight || 'normal'} ${textObject.options.fontSize}px ${textObject.options.fontFamily || 'Arial'}`;
    const textMetrics = this.ctx.measureText(textObject.text || '');
    const textWidth = textMetrics.width;
    const textHeight = textObject.options.fontSize * 1.2;
    const textAlign = textObject.options.textAlign || 'left';
    let x = textObject.startPoint.x;
    if (textAlign === 'center') {
      x = textObject.startPoint.x - textWidth / 2;
    } else if (textAlign === 'right') {
      x = textObject.startPoint.x - textWidth;
    }
    textObject.bounds = {
      x: x,
      y: textObject.startPoint.y - textHeight / 2,
      width: textWidth,
      height: textHeight
    };
  }

  exportDrawing(): string {
    return this.canvas.toDataURL('image/png');
  }

  async captureWithBackground(): Promise<string> {
    return this.canvas.toDataURL('image/png');
  }

  destroy(): void {
    this.textEditingState.destroy();
    this.eventHandler.destroy();
    console.log('🗑️ DrawingEngine destroyed');
  }
} 