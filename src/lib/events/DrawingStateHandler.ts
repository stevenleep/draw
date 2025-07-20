import { InteractionStateHandler } from "./InteractionStateHandler";
import { DrawingEventHandler } from "./DrawingEventHandler";

export class DrawingStateHandler extends InteractionStateHandler {
  private main: DrawingEventHandler;
  constructor(main: DrawingEventHandler) {
    super();
    this.main = main;
  }

  onMouseMove(_e: MouseEvent): void {
    const rect = this.main.canvas.getBoundingClientRect();
    const x = _e.clientX - rect.left;
    const y = _e.clientY - rect.top;
    this.main.currentPoint = { x, y };
    this.main.continueDrawing(x, y);
  }

  onMouseUp(): void {
    this.main.stopDrawing();
    this.main.setInteractionState(0);
  }

  onTouchMove(_e: TouchEvent): void {
    if (_e.touches.length === 0) {
      return;
    }
    const touch = _e.touches[0];
    const rect = this.main.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    this.main.continueDrawing(x, y);
  }
  onTouchEnd(): void {
    this.main.stopDrawing();
    this.main.setInteractionState(0);
  }
}
