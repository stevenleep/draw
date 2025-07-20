import { DrawingMode, DrawingObject, DrawingOptions } from "./types";
import { DrawingState } from "../state/DrawingState";
import { TextEditingState } from "../state/TextEditingState";
import { DrawingRenderer } from "../rendering/DrawingRenderer";
import { DrawingEventHandler } from "../events/DrawingEventHandler";
import { ToolManager } from "../plugins/ToolManager";

export class DrawingEngine {
  private dirtyRects: Array<{ x: number; y: number; width: number; height: number }> = [];
  /**
   * 标记脏区，自动转换为逻辑像素
   */
  public addDirtyRect(rect: { x: number; y: number; width: number; height: number }): void {
    this.dirtyRects.push({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    });
  }

  /**
   * 标记全局为脏区，强制全量重绘
   */
  public markAllDirty(): void {
    this.dirtyRects = [{ x: 0, y: 0, width: this.canvas.width / this.dpr, height: this.canvas.height / this.dpr }];
  }
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private foregroundCanvas: HTMLCanvasElement;
  private foregroundCtx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private drawingState: DrawingState;
  private textEditingState: TextEditingState;
  private toolManager: ToolManager;
  private renderer: DrawingRenderer;
  private foregroundRenderer: DrawingRenderer;
  private offscreenRenderer: DrawingRenderer;
  private eventHandler: DrawingEventHandler;
  private mode: DrawingMode = "pen";
  private onModeChange?: (mode: DrawingMode) => void;
  private dpr: number = window.devicePixelRatio || 1;

  constructor(canvasElement: HTMLCanvasElement) {
    this.canvas = canvasElement;
    // 高分辨率支持
    this.dpr = window.devicePixelRatio || 1;
    // 设置主canvas尺寸
    const width = canvasElement.width;
    const height = canvasElement.height;
    canvasElement.style.width = `${width}px`;
    canvasElement.style.height = `${height}px`;
    canvasElement.width = width * this.dpr;
    canvasElement.height = height * this.dpr;
    const ctx = canvasElement.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context from canvas element.");
    }
    this.ctx = ctx;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // 创建前景canvas
    this.foregroundCanvas = document.createElement("canvas");
    this.foregroundCanvas.style.position = "absolute";
    this.foregroundCanvas.style.left = "0";
    this.foregroundCanvas.style.top = "0";
    this.foregroundCanvas.style.pointerEvents = "none";
    this.foregroundCanvas.style.width = `${width}px`;
    this.foregroundCanvas.style.height = `${height}px`;
    this.foregroundCanvas.width = width * this.dpr;
    this.foregroundCanvas.height = height * this.dpr;
    this.canvas.parentElement?.appendChild(this.foregroundCanvas);
    const foregroundCtx = this.foregroundCanvas.getContext("2d");
    if (!foregroundCtx) {
      throw new Error("Failed to get 2D context from foreground canvas.");
    }
    this.foregroundCtx = foregroundCtx;
    this.foregroundCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.drawingState = new DrawingState();
    this.textEditingState = new TextEditingState();
    this.toolManager = new ToolManager();
    // Create offscreen buffer
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCanvas.width = width * this.dpr;
    this.offscreenCanvas.height = height * this.dpr;
    const offscreenCtx = this.offscreenCanvas.getContext("2d");
    if (!offscreenCtx) {
      throw new Error("Failed to get 2D context from offscreen canvas.");
    }
    this.offscreenCtx = offscreenCtx;
    this.offscreenCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.renderer = new DrawingRenderer(this.ctx, this.toolManager, this.textEditingState);
    this.foregroundRenderer = new DrawingRenderer(this.foregroundCtx, this.toolManager, this.textEditingState);
    this.offscreenRenderer = new DrawingRenderer(this.offscreenCtx, this.toolManager, this.textEditingState);
    this.eventHandler = new DrawingEventHandler(this.canvas, this.drawingState, this.textEditingState, this.toolManager);
    this.eventHandler.setModeChangeCallback(this.handleModeChange.bind(this));
    this.eventHandler.setRedrawCallback(this.redrawCanvas.bind(this));
    this.setMode("select");
    this.updateStaticBuffer();
  }

  setMode(mode: DrawingMode): void {
    this.mode = mode;
    this.eventHandler.setMode(mode);
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
    // 主canvas
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // 前景canvas
    this.foregroundCanvas.style.width = `${width}px`;
    this.foregroundCanvas.style.height = `${height}px`;
    this.foregroundCanvas.width = width * this.dpr;
    this.foregroundCanvas.height = height * this.dpr;
    this.foregroundCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    // 离屏canvas
    this.offscreenCanvas.width = width * this.dpr;
    this.offscreenCanvas.height = height * this.dpr;
    this.offscreenCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.updateStaticBuffer();
    this.dirtyRects = [{ x: 0, y: 0, width, height }];
    this.redrawCanvas();
  }

  clear(): void {
    this.drawingState.clear();
    this.updateStaticBuffer();
    this.dirtyRects = [{ x: 0, y: 0, width: this.canvas.width / this.dpr, height: this.canvas.height / this.dpr }];
    this.redrawCanvas();
  }

  redrawCanvas(): void {
    // 静态层（主canvas）
    if (this.dirtyRects.length === 0) {
      this.ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
      this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      const mergedRects = this._mergeDirtyRects(this.dirtyRects);
      for (const rect of mergedRects) {
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(rect.x, rect.y, rect.width, rect.height);
        this.ctx.clip();
        this.ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
        this.ctx.drawImage(
          this.offscreenCanvas,
          rect.x * this.dpr,
          rect.y * this.dpr,
          rect.width * this.dpr,
          rect.height * this.dpr,
          rect.x * this.dpr,
          rect.y * this.dpr,
          rect.width * this.dpr,
          rect.height * this.dpr,
        );
        this.ctx.restore();
      }
    }
    // 动态层（前景canvas）
    this.foregroundCtx.clearRect(0, 0, this.foregroundCanvas.width / this.dpr, this.foregroundCanvas.height / this.dpr);
    const currentDrawingObject = this.eventHandler.getCurrentDrawingObject();
    const selectedObject = this.drawingState.getSelectedObject();
    if (currentDrawingObject) {
      this.foregroundRenderer.renderObject(currentDrawingObject);
    }
    this.foregroundRenderer.renderTextEditingOverlay(selectedObject);
    if (selectedObject) {
      this.foregroundRenderer.renderSelectionBox(selectedObject);
      this.foregroundRenderer.renderTransformHandles(this.eventHandler.getTransformHandles());
    }
    this.dirtyRects = [];
  }

  private _mergeDirtyRects(
    rects: Array<{ x: number; y: number; width: number; height: number }>,
  ): Array<{ x: number; y: number; width: number; height: number }> {
    if (rects.length <= 1) {
      return rects.slice();
    }
    // Simple O(n^2) merge for small N
    const merged: Array<{ x: number; y: number; width: number; height: number }> = [];
    const used = new Array(rects.length).fill(false);
    for (let i = 0; i < rects.length; i++) {
      if (used[i]) {
        continue;
      }
      let r = { ...rects[i] };
      for (let j = i + 1; j < rects.length; j++) {
        if (used[j]) {
          continue;
        }
        const s = rects[j];
        if (this._rectsOverlapOrTouch(r, s)) {
          r = this._rectUnion(r, s);
          used[j] = true;
        }
      }
      merged.push(r);
    }
    return merged;
  }

  private _rectsOverlapOrTouch(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number },
  ): boolean {
    return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
  }

  private _rectUnion(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
    const x1 = Math.min(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.width, b.x + b.width);
    const y2 = Math.max(a.y + a.height, b.y + b.height);
    return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
  }

  private _objectIntersectsRect(obj: DrawingObject, rect: { x: number; y: number; width: number; height: number }): boolean {
    if (!obj.bounds) {
      return false;
    }
    const ob = obj.bounds;
    return ob.x < rect.x + rect.width && ob.x + ob.width > rect.x && ob.y < rect.y + rect.height && ob.y + ob.height > rect.y;
  }

  private updateStaticBuffer(): void {
    this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width / this.dpr, this.offscreenCanvas.height / this.dpr);
    this.offscreenRenderer.renderObjects(this.drawingState.getObjects());
  }

  getObjects(): DrawingObject[] {
    return this.drawingState.getObjects();
  }

  getSelectedObject(): DrawingObject | null {
    return this.drawingState.getSelectedObject();
  }

  addObject(obj: DrawingObject): void {
    this._addOrRemoveObject(obj, true);
  }

  removeObject(obj: DrawingObject): void {
    this._addOrRemoveObject(obj, false);
  }

  deleteSelected(): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject) {
      this._addOrRemoveObject(selectedObject, false);
      this.drawingState.setSelectedObject(null);
    }
  }

  /**
   * 内部复用，添加或移除对象
   */
  private _addOrRemoveObject(obj: DrawingObject, isAdd: boolean): void {
    if (isAdd) {
      this.drawingState.addObject(obj);
    } else {
      this.drawingState.removeObject(obj);
    }
    this.updateStaticBuffer();
    if (obj.bounds) {
      this.addDirtyRect(obj.bounds);
    }
    this.redrawCanvas();
  }

  getOptions(): DrawingOptions {
    return this.drawingState.getOptions();
  }

  setOptions(options: Partial<DrawingOptions>): void {
    this.drawingState.updateOptions(options);
  }

  undo(): void {
    if (this.drawingState.undo()) {
      this.updateStaticBuffer();
      this.markAllDirty();
      this.redrawCanvas();
    }
  }

  redo(): void {
    if (this.drawingState.redo()) {
      this.updateStaticBuffer();
      this.markAllDirty();
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
    if (selectedObject && selectedObject.type === "text") {
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
    const LINE_HEIGHT_MULTIPLIER = 1.2;
    this.ctx.font = `${textObject.options.fontWeight || "normal"} ${textObject.options.fontSize}px ${textObject.options.fontFamily || "Arial"}`;
    const textMetrics = this.ctx.measureText(textObject.text || "");
    const textWidth = textMetrics.width;
    const textHeight = textObject.options.fontSize * LINE_HEIGHT_MULTIPLIER;
    const textAlign = textObject.options.textAlign || "left";
    let x = textObject.startPoint.x;
    if (textAlign === "center") {
      x = textObject.startPoint.x - textWidth / 2;
    } else if (textAlign === "right") {
      x = textObject.startPoint.x - textWidth;
    }
    textObject.bounds = {
      x,
      y: textObject.startPoint.y - textHeight / 2,
      width: textWidth,
      height: textHeight,
    };
  }

  exportDrawing(): string {
    return this.canvas.toDataURL("image/png");
  }

  async captureWithBackground(): Promise<string> {
    return this.canvas.toDataURL("image/png");
  }

  destroy(): void {
    this.textEditingState.destroy();
    this.eventHandler.destroy();
  }
}
