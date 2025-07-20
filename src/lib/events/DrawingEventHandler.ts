import { DrawingObject, DrawingMode, Point, HandleType, TransformHandle } from "../core/types";
import { DrawingState } from "../state/DrawingState";
import { TextEditingState } from "../state/TextEditingState";
import { ToolManager } from "../plugins/ToolManager";

export class DrawingEventHandler {
  private createToolContext(options?: any) {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D context not available");
    }
    return {
      ctx,
      canvas: this.canvas,
      options: options || this.drawingState.getOptions(),
      generateId: () => this.generateId(),
      redrawCanvas: () => this.onRedraw?.(),
      saveState: () => {},
    };
  }

  private static readonly HANDLE_SIZE = 8;
  private static readonly HANDLE_PADDING = 5;
  private static readonly ROTATE_HANDLE_OFFSET = 30;
  private static readonly PASTE_OFFSET = 20;
  private static readonly TEXT_HEIGHT_MULTIPLIER = 1.2;
  private static readonly ID_RADIX = 36;
  private static readonly TEXT_EDIT_DELAY = 0;
  private canvas: HTMLCanvasElement;
  private drawingState: DrawingState;
  private textEditingState: TextEditingState;
  private toolManager: ToolManager;
  private mode: DrawingMode = "pen";
  private isDrawing = false;
  private isDragging = false;
  private isTransforming = false;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private previewImageData: ImageData | null = null;
  private currentDrawingObject: DrawingObject | null = null;
  private dragOffset: Point = { x: 0, y: 0 };
  private transformHandles: TransformHandle[] = [];
  private activeHandle: TransformHandle | null = null;
  private transformStartPoint: Point | null = null;
  private originalBounds: { x: number; y: number; width: number; height: number } | null = null;
  private originalTransform: any = null;
  private currentPath: Point[] = [];
  private onModeChange?: (mode: DrawingMode) => void;
  private onRedraw?: () => void;
  constructor(canvas: HTMLCanvasElement, drawingState: DrawingState, textEditingState: TextEditingState, toolManager: ToolManager) {
    this.canvas = canvas;
    this.drawingState = drawingState;
    this.textEditingState = textEditingState;
    this.toolManager = toolManager;
    this.setupEventListeners();
  }

  setMode(mode: DrawingMode): void {
    this.mode = mode;
    this.toolManager.setCurrentTool(mode);

    if (this.onModeChange) {
      this.onModeChange(mode);
    }
  }

  setModeChangeCallback(callback: (mode: DrawingMode) => void): void {
    this.onModeChange = callback;
  }

  setRedrawCallback(callback: () => void): void {
    this.onRedraw = callback;
  }

  private setupEventListeners(): void {
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = "none";
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("dblclick", this.handleDoubleClick.bind(this));
    this.canvas.addEventListener("keydown", this.handleKeyDown.bind(this));
    this.canvas.addEventListener("touchstart", this.handleTouchStart.bind(this));
    this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this));
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 检查是否点击了变换手柄
    const handle = this.getHandleAtPoint(x, y);
    if (handle) {
      this.startTransform(handle, x, y);
      return;
    }

    const clickedObject = this.getObjectAtPoint(x, y);
    if (clickedObject) {
      this.drawingState.setSelectedObject(clickedObject);
      this.generateTransformHandles(clickedObject);

      if (clickedObject.type === "text") {
        if (this.textEditingState.isEditing() && this.drawingState.getSelectedObject() === clickedObject) {
          return;
        }

        if (this.textEditingState.isEditing()) {
          this.finishTextEditing();
        }

        this.drawingState.setSelectedObject(clickedObject);
        this.textEditingState.startEditing(clickedObject);
        this.canvas.focus();
        if (this.onRedraw) {
          this.onRedraw();
        }
        return;
      }

      this.isDragging = true;
      this.dragOffset = {
        x: x - clickedObject.startPoint.x,
        y: y - clickedObject.startPoint.y,
      };

      if (this.onRedraw) {
        this.onRedraw();
      }
      return;
    }

    this.drawingState.setSelectedObject(null);
    this.transformHandles = [];

    this.startDrawing(x, y);
  }

  private handleMouseMove(e: MouseEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.currentPoint = { x, y };

    if (this.isDragging && this.drawingState.getSelectedObject()) {
      this.moveSelectedObject(x, y);
      return;
    }

    if (this.isTransforming && this.activeHandle) {
      this.performTransform(x, y);
      return;
    }

    if (this.isDrawing) {
      this.continueDrawing(x, y);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    e.preventDefault();

    if (this.isDragging) {
      this.isDragging = false;
      return;
    }

    if (this.isTransforming) {
      this.endTransform();
      return;
    }

    if (this.isDrawing) {
      this.stopDrawing();
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedObject = this.getObjectAtPoint(x, y);

    if (clickedObject && clickedObject.type === "text") {
      this.textEditingState.startEditing(clickedObject);
      this.drawingState.setSelectedObject(clickedObject);
      this.canvas.focus();
      if (this.onRedraw) {
        this.onRedraw();
      }
    } else if (this.mode === "select" && !clickedObject) {
      this.createTextAtPoint(x, y);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.textEditingState.isEditing()) {
      switch (e.key) {
        case "Delete":
        case "Backspace":
          this.deleteSelected();
          break;
        case "Escape":
          this.cancelTextEditing();
          break;
        case "z":
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
          }
          break;
        case "c":
          if (e.ctrlKey || e.metaKey) {
            this.copySelected();
          }
          break;
        case "v":
          if (e.ctrlKey || e.metaKey) {
            this.paste();
          }
          break;
        case "x":
          if (e.ctrlKey || e.metaKey) {
            this.cutSelected();
          }
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) {
            this.selectAll();
          }
          break;
        default:
          break;
      }
      return;
    }
    // 编辑状态下
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // 支持快捷键
      return;
    }
    switch (e.key) {
      case "Enter":
        if (e.shiftKey) {
          this.textEditingState.insertCharacter("\n");
          this.updateTextObject();
          this.onRedraw?.();
        } else {
          this.finishTextEditing();
        }
        e.preventDefault();
        break;
      case "Escape":
        this.cancelTextEditing();
        e.preventDefault();
        break;
      case "Backspace":
        this.textEditingState.deleteCharacter();
        this.updateTextObject();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case "Delete":
        this.textEditingState.deleteCharacterForward();
        this.updateTextObject();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case "ArrowLeft":
        this.textEditingState.moveCursorLeft();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case "ArrowRight":
        this.textEditingState.moveCursorRight();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case "ArrowUp":
        this.textEditingState.moveCursorUp();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case "ArrowDown":
        this.textEditingState.moveCursorDown();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case "Home":
        this.textEditingState.moveCursorToStart();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case "End":
        this.textEditingState.moveCursorToEnd();
        this.onRedraw?.();
        e.preventDefault();
        break;
      default:
        if (e.key.length === 1 && /^[\x20-\x7E]$/.test(e.key)) {
          this.textEditingState.insertCharacter(e.key);
          this.updateTextObject();
          this.onRedraw?.();
          e.preventDefault();
        }
        break;
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) {
      return;
    }

    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.startDrawing(x, y);
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if ((!this.isDrawing && !this.isDragging) || e.touches.length === 0) {
      return;
    }

    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.continueDrawing(x, y);
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.stopDrawing();
  }

  private startDrawing(x: number, y: number): void {
    this.startPoint = { x, y };
    this.currentPoint = { x, y };
    this.isDrawing = true;
    this.currentPath = [{ x, y }];

    if (this.mode === "select") {
      this.isDrawing = false;
      this.startPoint = null;
      this.currentPoint = null;
      return;
    }

    const tool = this.toolManager.getTool(this.mode);
    if (tool) {
      const context = this.createToolContext();

      const startObject = tool.startDrawing({ x, y }, context);
      if (startObject) {
        this.currentDrawingObject = startObject;
        if (!tool.requiresDrag) {
          const finishedObject = tool.finishDrawing({ x, y }, startObject, context);
          if (finishedObject) {
            this.drawingState.addObject(finishedObject);
            if (finishedObject.type === "text" && (finishedObject as any).__shouldStartEditing) {
              this.textEditingState.startEditing(finishedObject);
              this.drawingState.setSelectedObject(finishedObject);
              this.canvas.focus();
              this.onRedraw?.();
            }
            this.onRedraw?.();
          }

          this.currentDrawingObject = null;
          this.isDrawing = false;
          this.startPoint = null;
          this.currentPoint = null;
        }
      } else {
        this.isDrawing = false;
        this.startPoint = null;
        this.currentPoint = null;
      }
    } else {
      this.isDrawing = false;
      this.startPoint = null;
      this.currentPoint = null;
    }
  }

  private continueDrawing(x: number, y: number): void {
    if (this.isDragging && this.drawingState.getSelectedObject()) {
      this.moveSelectedObject(x, y);
      return;
    }

    if (!this.isDrawing || !this.currentDrawingObject || !this.startPoint) {
      return;
    }

    this.currentPoint = { x, y };
    this.currentPath.push({ x, y });

    const tool = this.toolManager.getTool(this.mode);
    if (tool) {
      const context = this.createToolContext();
      if (tool.requiresDrag) {
        const updatedObject = tool.updateDrawing({ x, y }, this.currentDrawingObject, context);
        if (updatedObject) {
          this.currentDrawingObject = updatedObject;
          this.onRedraw?.();
        }
      } else {
        tool.continueDrawing({ x, y }, this.currentDrawingObject, context);
        this.onRedraw?.();
      }
    }
  }

  private stopDrawing(): void {
    if (!this.isDrawing) {
      return;
    }

    this.isDrawing = false;

    const tool = this.toolManager.getTool(this.mode);
    if (tool && this.currentDrawingObject && this.currentPoint) {
      const context = this.createToolContext();

      const finishedObject = tool.finishDrawing(this.currentPoint, this.currentDrawingObject, context);
      if (finishedObject) {
        this.drawingState.addObject(finishedObject);

        if ((finishedObject as any).__shouldStartEditing && finishedObject.type === "text") {
          delete (finishedObject as any).__shouldStartEditing;
          setTimeout(() => {
            this.textEditingState.startEditing(finishedObject);
            this.drawingState.setSelectedObject(finishedObject);
            this.canvas.focus();
            this.onRedraw?.();
          }, DrawingEventHandler.TEXT_EDIT_DELAY);
        }

        this.onRedraw?.();
      }
    }

    this.currentDrawingObject = null;
    this.startPoint = null;
    this.currentPoint = null;
  }

  private finishTextEditing(): void {
    const newText = this.textEditingState.finishEditing();
    const selectedObject = this.drawingState.getSelectedObject();

    if (selectedObject && selectedObject.type === "text") {
      selectedObject.text = newText;

      const tool = this.toolManager.getTool("text");
      if (tool) {
        const context = this.createToolContext(selectedObject.options);
        selectedObject.bounds = tool.calculateBounds(selectedObject, context);
      } else {
        this.recalculateTextBounds(selectedObject);
      }

      this.onRedraw?.();
    }
  }

  private cancelTextEditing(): void {
    this.textEditingState.cancelEditing();
    this.onRedraw?.();
  }

  private updateTextObject(): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject && selectedObject.type === "text") {
      selectedObject.text = this.textEditingState.getEditingText();
      const tool = this.toolManager.getTool("text");
      if (tool) {
        const context = this.createToolContext(selectedObject.options);
        selectedObject.bounds = tool.calculateBounds(selectedObject, context);
      } else {
        this.recalculateTextBounds(selectedObject);
      }
    }
  }

  private generateId(): string {
    return Date.now().toString(DrawingEventHandler.ID_RADIX) + Math.random().toString(DrawingEventHandler.ID_RADIX).substr(2);
  }

  private getObjectAtPoint(x: number, y: number): DrawingObject | null {
    const objects = this.drawingState.getObjects();
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (this.isPointInObject(x, y, obj)) {
        return obj;
      }
    }
    return null;
  }

  private isPointInObject(x: number, y: number, obj: DrawingObject): boolean {
    return x >= obj.bounds.x && x <= obj.bounds.x + obj.bounds.width && y >= obj.bounds.y && y <= obj.bounds.y + obj.bounds.height;
  }

  private moveSelectedObject(x: number, y: number): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (!selectedObject) {
      return;
    }

    const newX = x - this.dragOffset.x;
    const newY = y - this.dragOffset.y;

    selectedObject.startPoint.x = newX;
    selectedObject.startPoint.y = newY;
    if (selectedObject.endPoint) {
      selectedObject.endPoint.x = newX + selectedObject.bounds.width;
      selectedObject.endPoint.y = newY + selectedObject.bounds.height;
    }

    if (selectedObject.type === "text") {
      const tool = this.toolManager.getTool("text");
      if (tool) {
        const context = this.createToolContext(selectedObject.options);
        selectedObject.bounds = tool.calculateBounds(selectedObject, context);
      } else {
        selectedObject.bounds.x = newX;
        selectedObject.bounds.y = newY;
      }
    } else {
      selectedObject.bounds.x = newX;
      selectedObject.bounds.y = newY;
    }

    this.onRedraw?.();
  }

  private createTextAtPoint(x: number, y: number): void {
    const fontSize = this.drawingState.getOptions().fontSize;
    const textObject: DrawingObject = {
      id: this.generateId(),
      type: "text",
      startPoint: { x, y },
      text: "",
      options: this.drawingState.getOptions(),
      bounds: {
        x,
        y: y - fontSize / 2,
        width: 0,
        height: fontSize,
      },
    };

    this.drawingState.addObject(textObject);
    this.textEditingState.startEditing(textObject);
    this.drawingState.setSelectedObject(textObject);
    this.canvas.focus();
    this.onRedraw?.();
  }

  private recalculateTextBounds(textObject: DrawingObject): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("2D context not available");
    }
    ctx.font = `${textObject.options.fontWeight || "normal"} ${textObject.options.fontSize}px ${textObject.options.fontFamily || "Arial"}`;
    const textMetrics = ctx.measureText(textObject.text || "");
    const textWidth = textMetrics.width;
    const textHeight = textObject.options.fontSize * DrawingEventHandler.TEXT_HEIGHT_MULTIPLIER;

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

  private generateTransformHandles(obj: DrawingObject): void {
    const handleSize = DrawingEventHandler.HANDLE_SIZE;
    const padding = DrawingEventHandler.HANDLE_PADDING;
    const rotateOffset = DrawingEventHandler.ROTATE_HANDLE_OFFSET;

    this.transformHandles = [
      { type: HandleType.TOP_LEFT, x: obj.bounds.x - padding, y: obj.bounds.y - padding, width: handleSize, height: handleSize },
      {
        type: HandleType.TOP_RIGHT,
        x: obj.bounds.x + obj.bounds.width + padding - handleSize,
        y: obj.bounds.y - padding,
        width: handleSize,
        height: handleSize,
      },
      {
        type: HandleType.BOTTOM_LEFT,
        x: obj.bounds.x - padding,
        y: obj.bounds.y + obj.bounds.height + padding - handleSize,
        width: handleSize,
        height: handleSize,
      },
      {
        type: HandleType.BOTTOM_RIGHT,
        x: obj.bounds.x + obj.bounds.width + padding - handleSize,
        y: obj.bounds.y + obj.bounds.height + padding - handleSize,
        width: handleSize,
        height: handleSize,
      },
      {
        type: HandleType.TOP,
        x: obj.bounds.x + obj.bounds.width / 2 - handleSize / 2,
        y: obj.bounds.y - padding,
        width: handleSize,
        height: handleSize,
      },
      {
        type: HandleType.BOTTOM,
        x: obj.bounds.x + obj.bounds.width / 2 - handleSize / 2,
        y: obj.bounds.y + obj.bounds.height + padding - handleSize,
        width: handleSize,
        height: handleSize,
      },
      {
        type: HandleType.LEFT,
        x: obj.bounds.x - padding,
        y: obj.bounds.y + obj.bounds.height / 2 - handleSize / 2,
        width: handleSize,
        height: handleSize,
      },
      {
        type: HandleType.RIGHT,
        x: obj.bounds.x + obj.bounds.width + padding - handleSize,
        y: obj.bounds.y + obj.bounds.height / 2 - handleSize / 2,
        width: handleSize,
        height: handleSize,
      },
      {
        type: HandleType.ROTATE,
        x: obj.bounds.x + obj.bounds.width / 2 - handleSize / 2,
        y: obj.bounds.y - rotateOffset,
        width: handleSize,
        height: handleSize,
      },
    ];
  }

  private getHandleAtPoint(x: number, y: number): TransformHandle | null {
    return (
      this.transformHandles.find((handle) => x >= handle.x && x <= handle.x + handle.width && y >= handle.y && y <= handle.y + handle.height) || null
    );
  }

  private startTransform(handle: TransformHandle, x: number, y: number): void {
    this.activeHandle = handle;
    this.isTransforming = true;
    this.transformStartPoint = { x, y };

    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject) {
      this.originalBounds = { ...selectedObject.bounds };
      this.originalTransform = selectedObject.transform ? { ...selectedObject.transform } : null;
    }
  }

  private performTransform(x: number, y: number): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (!this.activeHandle || !this.transformStartPoint || !selectedObject) {
      return;
    }

    if (!this.originalBounds) {
      this.originalBounds = { ...selectedObject.bounds };
    }

    const deltaX = x - this.transformStartPoint.x;
    const deltaY = y - this.transformStartPoint.y;

    // 根据手柄类型执行不同的变换
    switch (this.activeHandle.type) {
      case HandleType.TOP_LEFT:
        this.resizeObject(-deltaX, -deltaY, 0, 0);
        break;
      case HandleType.TOP_RIGHT:
        this.resizeObject(0, -deltaY, deltaX, 0);
        break;
      case HandleType.BOTTOM_LEFT:
        this.resizeObject(-deltaX, 0, 0, deltaY);
        break;
      case HandleType.BOTTOM_RIGHT:
        this.resizeObject(0, 0, deltaX, deltaY);
        break;
      case HandleType.ROTATE:
        this.rotateObject(x, y);
        break;
      default:
        break;
    }

    this.transformStartPoint = { x, y };
    this.onRedraw?.();
  }

  private endTransform(): void {
    this.isTransforming = false;
    this.activeHandle = null;
    this.transformStartPoint = null;
    this.originalBounds = null;
    this.originalTransform = null;
  }

  private resizeObject(leftDelta: number, topDelta: number, rightDelta: number, bottomDelta: number): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (!selectedObject || !this.originalBounds) {
      return;
    }

    const newBounds = {
      x: this.originalBounds.x + leftDelta,
      y: this.originalBounds.y + topDelta,
      width: this.originalBounds.width + rightDelta - leftDelta,
      height: this.originalBounds.height + bottomDelta - topDelta,
    };

    selectedObject.bounds = newBounds;
    selectedObject.startPoint.x = newBounds.x;
    selectedObject.startPoint.y = newBounds.y;
    if (selectedObject.endPoint) {
      selectedObject.endPoint.x = newBounds.x + newBounds.width;
      selectedObject.endPoint.y = newBounds.y + newBounds.height;
    }
  }

  private static readonly DEFAULT_TRANSFORM = { rotation: 0, scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 };

  private ensureTransform(obj: DrawingObject): asserts obj is DrawingObject & { transform: typeof DrawingEventHandler.DEFAULT_TRANSFORM } {
    if (!obj.transform) {
      obj.transform = { ...DrawingEventHandler.DEFAULT_TRANSFORM };
    }
  }

  private rotateObject(mouseX: number, mouseY: number): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (!selectedObject) {
      return;
    }
    const centerX = selectedObject.bounds.x + selectedObject.bounds.width / 2;
    const centerY = selectedObject.bounds.y + selectedObject.bounds.height / 2;
    const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    this.ensureTransform(selectedObject);
    selectedObject.transform.rotation = angle;
  }

  private deleteSelected(): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject) {
      this.drawingState.removeObject(selectedObject);
      this.drawingState.setSelectedObject(null);
      this.transformHandles = [];
      this.onRedraw?.();
    }
  }

  private undo(): void {
    if (this.drawingState.undo()) {
      this.onRedraw?.();
    }
  }

  private redo(): void {
    if (this.drawingState.redo()) {
      this.onRedraw?.();
    }
  }

  private copySelected(): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject) {
      this.drawingState.setClipboard(this.cloneObject(selectedObject));
    }
  }

  private paste(): void {
    const clipboard = this.drawingState.getClipboard();
    if (clipboard) {
      const newObj = this.cloneObject(clipboard);
      newObj.startPoint.x += DrawingEventHandler.PASTE_OFFSET;
      newObj.startPoint.y += DrawingEventHandler.PASTE_OFFSET;
      newObj.bounds.x += DrawingEventHandler.PASTE_OFFSET;
      newObj.bounds.y += DrawingEventHandler.PASTE_OFFSET;
      newObj.id = this.generateId();

      this.drawingState.addObject(newObj);
      this.drawingState.setSelectedObject(newObj);
      this.onRedraw?.();
    }
  }

  private cutSelected(): void {
    this.copySelected();
    this.deleteSelected();
  }

  private selectAll(): void {
    const objects = this.drawingState.getObjects();
    if (objects.length === 0) {
      return;
    }
    this.drawingState.setSelectedObject(objects[objects.length - 1]);
    this.onRedraw?.();
  }

  private cloneObject(obj: DrawingObject): DrawingObject {
    return {
      id: obj.id,
      type: obj.type,
      startPoint: { ...obj.startPoint },
      endPoint: obj.endPoint ? { ...obj.endPoint } : undefined,
      points: obj.points ? obj.points.map((p) => ({ ...p })) : undefined,
      text: obj.text,
      options: { ...obj.options },
      bounds: { ...obj.bounds },
      transform: obj.transform ? { ...obj.transform } : undefined,
    };
  }

  getTransformHandles(): TransformHandle[] {
    return this.transformHandles;
  }

  getCurrentDrawingObject(): DrawingObject | null {
    return this.currentDrawingObject;
  }

  isTextEditing(): boolean {
    return this.textEditingState.isEditing();
  }

  destroy(): void {
    this.textEditingState.destroy();
  }
}
