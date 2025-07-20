import { DrawingObject, DrawingMode, Point, HandleType, TransformHandle, cloneDrawingObject } from "../core/types";
import { DrawingState } from "../state/DrawingState";
import { TextEditingState } from "../state/TextEditingState";
import { ToolManager } from "../plugins/ToolManager";
import { InteractionStateHandler } from "./InteractionStateHandler";
import { IdleStateHandler } from "./IdleStateHandler";
import { DrawingStateHandler } from "./DrawingStateHandler";
import { DraggingStateHandler } from "./DraggingStateHandler";
import { TransformingStateHandler } from "./TransformingStateHandler";
import { EditingTextStateHandler } from "./EditingTextStateHandler";

enum InteractionState {
  Idle,
  Drawing,
  Dragging,
  Transforming,
  EditingText,
}

export class DrawingEventHandler {
  public canvas: HTMLCanvasElement;
  public drawingState: DrawingState;
  public textEditingState: TextEditingState;
  public toolManager: ToolManager;
  public mode: DrawingMode = "pen";
  public interactionState: InteractionState = InteractionState.Idle;
  public stateHandler: InteractionStateHandler;
  public startPoint: Point | null = null;
  public currentPoint: Point | null = null;
  public previewImageData: ImageData | null = null;
  public currentDrawingObject: DrawingObject | null = null;
  public dragOffset: Point = { x: 0, y: 0 };
  public transformHandles: TransformHandle[] = [];
  public activeHandle: TransformHandle | null = null;
  public transformStartPoint: Point | null = null;
  public originalBounds: { x: number; y: number; width: number; height: number } | null = null;
  public originalTransform: any = null;
  public currentPath: Point[] = [];
  public onModeChange?: (mode: DrawingMode) => void;
  public onRedraw?: () => void;
  public addDirtyRect?: (rect: { x: number; y: number; width: number; height: number }) => void;
  public markAllDirty?: () => void;

  constructor(canvas: HTMLCanvasElement, drawingState: DrawingState, textEditingState: TextEditingState, toolManager: ToolManager) {
    this.canvas = canvas;
    this.drawingState = drawingState;
    this.textEditingState = textEditingState;
    this.toolManager = toolManager;
    this.stateHandler = new IdleStateHandler(this);
    this.setupEventListeners();
  }

  setMode(mode: DrawingMode): void {
    if (this.mode === mode) {
      return;
    }
    this.mode = mode;
    this.toolManager.setCurrentTool(mode);
  }

  setModeChangeCallback(callback: (mode: DrawingMode) => void): void {
    this.onModeChange = callback;
  }

  setRedrawCallback(callback: () => void): void {
    this.onRedraw = callback;
  }

  setAddDirtyRectCallback(callback: (rect: { x: number; y: number; width: number; height: number }) => void): void {
    this.addDirtyRect = callback;
  }

  setMarkAllDirtyCallback(callback: () => void): void {
    this.markAllDirty = callback;
  }

  private setupEventListeners(): void {
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = "none";
    this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));
    this.canvas.addEventListener("dblclick", this.onDoubleClick.bind(this));
    this.canvas.addEventListener("keydown", this.onKeyDown.bind(this));
    this.canvas.addEventListener("touchstart", this.onTouchStart.bind(this));
    this.canvas.addEventListener("touchmove", this.onTouchMove.bind(this));
    this.canvas.addEventListener("touchend", this.onTouchEnd.bind(this));
  }

  public setInteractionState(state: InteractionState) {
    this.setInteractionStateImpl(state);
  }

  private setInteractionStateImpl(state: InteractionState) {
    this.interactionState = state;
    switch (state) {
      case InteractionState.Idle:
        this.stateHandler = new IdleStateHandler(this);
        break;
      case InteractionState.Drawing:
        this.stateHandler = new DrawingStateHandler(this);
        break;
      case InteractionState.Dragging:
        this.stateHandler = new DraggingStateHandler(this);
        break;
      case InteractionState.Transforming:
        this.stateHandler = new TransformingStateHandler(this);
        break;
      case InteractionState.EditingText:
        this.stateHandler = new EditingTextStateHandler(this);
        break;
      default:
        this.stateHandler = new IdleStateHandler(this);
        break;
    }
  }

  private onMouseDown(e: MouseEvent): void {
    this.stateHandler.onMouseDown(e);
  }

  private onMouseMove(e: MouseEvent): void {
    this.stateHandler.onMouseMove(e);
  }

  private onMouseUp(e: MouseEvent): void {
    this.stateHandler.onMouseUp(e);
  }

  private onDoubleClick(e: MouseEvent): void {
    this.stateHandler.onDoubleClick(e);
  }

  private onKeyDown(e: KeyboardEvent): void {
    this.stateHandler.onKeyDown(e);
  }

  private onTouchStart(e: TouchEvent): void {
    this.stateHandler.onTouchStart(e);
  }

  private onTouchMove(e: TouchEvent): void {
    this.stateHandler.onTouchMove(e);
  }

  private onTouchEnd(e: TouchEvent): void {
    this.stateHandler.onTouchEnd(e);
  }

  public startDrawing(x: number, y: number): void {
    this.startPoint = { x, y };
    this.currentPoint = { x, y };
    this.currentPath = [{ x, y }];
    if (this.mode === "select") {
      this.setInteractionState(InteractionState.Idle);
      return;
    }
    const tool = this.toolManager.getTool(this.mode);
    if (!tool) {
      this.setInteractionState(InteractionState.Idle);
      return;
    }
    const context = this.createToolContext();
    const startObject = tool.startDrawing({ x, y }, context);
    if (!startObject) {
      this.setInteractionState(InteractionState.Idle);
      return;
    }
    this.currentDrawingObject = startObject;
    if (tool.requiresDrag) {
      return;
    }
    const finishedObject = tool.finishDrawing({ x, y }, startObject, context);
    if (!finishedObject) {
      this.currentDrawingObject = null;
      this.setInteractionState(InteractionState.Idle);
      return;
    }
    this.drawingState.addObject(finishedObject);
    if (finishedObject.type === "text" && (finishedObject as any).__shouldStartEditing) {
      this.textEditingState.startEditing(finishedObject);
      this.drawingState.selectObject(finishedObject);
      this.canvas.focus();
    }
    this.onRedraw?.();
    this.currentDrawingObject = null;
    this.setInteractionState(InteractionState.Idle);
  }

  public continueDrawing(x: number, y: number): void {
    if (this.interactionState === InteractionState.Dragging && this.drawingState.getSelected()) {
      this.moveSelectedObject(x, y);
      return;
    }
    if (this.interactionState !== InteractionState.Drawing || !this.currentDrawingObject || !this.startPoint) {
      return;
    }
    this.currentPoint = { x, y };
    this.currentPath.push({ x, y });
    const tool = this.toolManager.getTool(this.mode);
    if (!tool) {
      return;
    }
    const context = this.createToolContext();
    if (tool.requiresDrag) {
      const updatedObject = tool.updateDrawing({ x, y }, this.currentDrawingObject, context);
      if (updatedObject) {
        this.currentDrawingObject = updatedObject;
      }
    } else {
      tool.continueDrawing({ x, y }, this.currentDrawingObject, context);
    }
    this.onRedraw?.();
  }

  public stopDrawing(): void {
    if (this.interactionState !== InteractionState.Drawing) {
      return;
    }
    this.setInteractionState(InteractionState.Idle);
    const tool = this.toolManager.getTool(this.mode);
    if (!tool || !this.currentDrawingObject || !this.currentPoint) {
      this.currentDrawingObject = null;
      this.startPoint = null;
      this.currentPoint = null;
      return;
    }
    const context = this.createToolContext();
    const finishedObject = tool.finishDrawing(this.currentPoint, this.currentDrawingObject, context);
    if (finishedObject) {
      this.drawingState.addObject(finishedObject);
      if ((finishedObject as any).__shouldStartEditing && finishedObject.type === "text") {
        delete (finishedObject as any).__shouldStartEditing;
        setTimeout(() => {
          this.textEditingState.startEditing(finishedObject);
          this.drawingState.selectObject(finishedObject);
          this.canvas.focus();
          this.onRedraw?.();
        }, DrawingEventHandler.TEXT_EDIT_DELAY);
      }
      this.onRedraw?.();
    }
    this.currentDrawingObject = null;
    this.startPoint = null;
    this.currentPoint = null;
  }

  public updateTextObject(): void {
    const selectedObject = this.drawingState.getSelected();
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

  public finishTextEditing(): void {
    const newText = this.textEditingState.finishEditing();
    const selectedObject = this.drawingState.getSelected();
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

  public cancelTextEditing(): void {
    this.textEditingState.cancelEditing();
    this.onRedraw?.();
  }

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

  private generateId(): string {
    return Date.now().toString(DrawingEventHandler.ID_RADIX) + Math.random().toString(DrawingEventHandler.ID_RADIX).substr(2);
  }

  public getObjectAtPoint(x: number, y: number): DrawingObject | null {
    const objects = this.drawingState.getObjects();
    for (let i = objects.length - 1; i >= 0; i--) {
      if (this.isPointInObject(x, y, objects[i])) {
        return objects[i];
      }
    }
    return null;
  }

  private isPointInObject(x: number, y: number, obj: DrawingObject): boolean {
    return x >= obj.bounds.x && x <= obj.bounds.x + obj.bounds.width && y >= obj.bounds.y && y <= obj.bounds.y + obj.bounds.height;
  }

  public moveSelectedObject(x: number, y: number): void {
    const selectedObject = this.drawingState.getSelected();
    if (!selectedObject) {
      return;
    }
    const oldBounds = selectedObject.bounds ? { ...selectedObject.bounds } : null;
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
    if (this.addDirtyRect && oldBounds) {
      this.addDirtyRect(oldBounds);
      this.addDirtyRect(selectedObject.bounds);
    } else if (this.markAllDirty) {
      this.markAllDirty();
    }
    this.onRedraw?.();
  }

  public createTextAtPoint(x: number, y: number): void {
    // const textObject: DrawingObject = {
    //   id: this.generateId(),
    //   type: "text",
    //   text: this.textEditingState.getText(),
    //   startPoint: { x, y },
    //   options: this.textEditingState.getOptions(),
    // };
    // this.drawingState.addObject(textObject);
    // this.onRedraw?.();
    console.log("createTextAtPoint called, but not implemented in DrawingEventHandler");
    console.log(`Coordinates: (${x}, ${y})`);
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

  public generateTransformHandles(obj: DrawingObject): void {
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

  public getHandleAtPoint(x: number, y: number): TransformHandle | null {
    return (
      this.transformHandles.find((handle) => x >= handle.x && x <= handle.x + handle.width && y >= handle.y && y <= handle.y + handle.height) || null
    );
  }

  public startTransform(handle: TransformHandle, x: number, y: number): void {
    this.activeHandle = handle;
    this.transformStartPoint = { x, y };
    const selectedObject = this.drawingState.getSelected();
    if (selectedObject) {
      this.originalBounds = { ...selectedObject.bounds };
      this.originalTransform = selectedObject.transform ? { ...selectedObject.transform } : null;
    }
  }

  public performTransform(x: number, y: number): void {
    const selectedObject = this.drawingState.getSelected();
    if (!this.activeHandle || !this.transformStartPoint || !selectedObject) {
      return;
    }
    if (!this.originalBounds) {
      this.originalBounds = { ...selectedObject.bounds };
    }
    const deltaX = x - this.transformStartPoint.x;
    const deltaY = y - this.transformStartPoint.y;
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

  public endTransform(): void {
    this.activeHandle = null;
    this.transformStartPoint = null;
    this.originalBounds = null;
    this.originalTransform = null;
  }

  private resizeObject(leftDelta: number, topDelta: number, rightDelta: number, bottomDelta: number): void {
    const selectedObject = this.drawingState.getSelected();
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

  private static readonly HANDLE_SIZE = 8;
  private static readonly HANDLE_PADDING = 5;
  private static readonly ROTATE_HANDLE_OFFSET = 30;
  private static readonly PASTE_OFFSET = 20;
  private static readonly TEXT_HEIGHT_MULTIPLIER = 1.2;
  private static readonly ID_RADIX = 36;
  private static readonly TEXT_EDIT_DELAY = 0;
  private static readonly DEFAULT_TRANSFORM = { rotation: 0, scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 };

  private ensureTransform(obj: DrawingObject): asserts obj is DrawingObject & { transform: typeof DrawingEventHandler.DEFAULT_TRANSFORM } {
    if (!obj.transform) {
      obj.transform = { ...DrawingEventHandler.DEFAULT_TRANSFORM };
    }
  }

  private rotateObject(mouseX: number, mouseY: number): void {
    const selectedObject = this.drawingState.getSelected();
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
    const selectedObject = this.drawingState.getSelected();
    if (selectedObject) {
      this.drawingState.removeObject(selectedObject);
      this.drawingState.selectObject(null);
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
    const selectedObject = this.drawingState.getSelected();
    if (selectedObject) {
      this.drawingState.setClipboardObject(this.cloneObject(selectedObject));
    }
  }

  private paste(): void {
    const clipboard = this.drawingState.getClipboardObject();
    if (clipboard) {
      const newObj = this.cloneObject(clipboard);
      newObj.startPoint.x += DrawingEventHandler.PASTE_OFFSET;
      newObj.startPoint.y += DrawingEventHandler.PASTE_OFFSET;
      newObj.bounds.x += DrawingEventHandler.PASTE_OFFSET;
      newObj.bounds.y += DrawingEventHandler.PASTE_OFFSET;
      newObj.id = this.generateId();
      this.drawingState.addObject(newObj);
      this.drawingState.selectObject(newObj);
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
    this.drawingState.selectObject(objects[objects.length - 1]);
    this.onRedraw?.();
  }

  private cloneObject(obj: DrawingObject): DrawingObject {
    return cloneDrawingObject(obj);
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
