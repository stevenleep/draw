import { InteractionStateHandler } from "./InteractionStateHandler";
import { DrawingEventHandler } from "./DrawingEventHandler";

export class TransformingStateHandler extends InteractionStateHandler {
  private main: DrawingEventHandler;
  constructor(main: DrawingEventHandler) {
    super();
    this.main = main;
  }
  onMouseMove(e: MouseEvent): void {
    const rect = this.main.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (this.main.activeHandle) {
      this.main.performTransform(x, y);
    }
  }
  onMouseUp(): void {
    this.main.endTransform();
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
    if (this.main.activeHandle) {
      this.main.performTransform(x, y);
    }
  }
  onTouchEnd(): void {
    this.main.endTransform();
    this.main.setInteractionState(0);
  }
}
