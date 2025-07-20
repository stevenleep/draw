import { InteractionStateHandler } from "./InteractionStateHandler";
import { DrawingEventHandler } from "./DrawingEventHandler";

export class IdleStateHandler extends InteractionStateHandler {
  private main: DrawingEventHandler;
  constructor(main: DrawingEventHandler) {
    super();
    this.main = main;
  }
  onMouseDown(e: MouseEvent): void {
    const rect = this.main.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const handle = this.main.getHandleAtPoint(x, y);
    if (handle) {
      this.main.startTransform(handle, x, y);
      this.main.setInteractionState(1);
      return;
    }
    const clickedObject = this.main.getObjectAtPoint(x, y);
    if (clickedObject) {
      this.main.drawingState.selectObject(clickedObject);
      this.main.generateTransformHandles(clickedObject);
      if (clickedObject.type === "text") {
        if (this.main.textEditingState.isEditing() && this.main.drawingState.getSelected() === clickedObject) {
          return;
        }
        if (this.main.textEditingState.isEditing()) {
          this.main.finishTextEditing();
        }
        this.main.drawingState.selectObject(clickedObject);
        this.main.textEditingState.startEditing(clickedObject);
        this.main.canvas.focus();
        if (this.main.onRedraw) {
          this.main.onRedraw();
        }
        this.main.setInteractionState(4);
        return;
      }
      this.main.dragOffset = { x: x - clickedObject.startPoint.x, y: y - clickedObject.startPoint.y };
      this.main.setInteractionState(2);
      if (this.main.onRedraw) {
        this.main.onRedraw();
      }
      return;
    }
    this.main.drawingState.selectObject(null);
    this.main.transformHandles = [];
    this.main.startDrawing(x, y);
    this.main.setInteractionState(1);
  }
}
