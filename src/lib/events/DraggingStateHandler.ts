import { InteractionStateHandler } from "./InteractionStateHandler";
import { DrawingEventHandler } from "./DrawingEventHandler";

export class DraggingStateHandler extends InteractionStateHandler {
  private main: DrawingEventHandler;
  constructor(main: DrawingEventHandler) {
    super();
    this.main = main;
  }
  onMouseMove(e: MouseEvent): void {
    const rect = this.main.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.main.currentPoint = { x, y };
    if (this.main.drawingState.getSelected()) {
      this.main.moveSelectedObject(x, y);
    }
  }
  onMouseUp(): void {
    this.main.setInteractionState(0);
  }
  onTouchMove(e: TouchEvent): void {
    if (e.touches.length === 0) {
      return;
    }
    const touch = e.touches[0];
    const rect = this.main.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    if (this.main.drawingState.getSelected()) {
      this.main.moveSelectedObject(x, y);
    }
  }
  onTouchEnd(): void {
    this.main.setInteractionState(0); // Idle
  }
}
