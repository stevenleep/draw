export abstract class InteractionStateHandler {
  // 空实现，子类可重写
  onMouseDown(_e: MouseEvent): void {
    /* noop */
  }
  onMouseMove(_e: MouseEvent): void {
    /* noop */
  }
  onMouseUp(_e: MouseEvent): void {
    /* noop */
  }
  onDoubleClick(_e: MouseEvent): void {
    /* noop */
  }
  onKeyDown(_e: KeyboardEvent): void {
    /* noop */
  }
  onTouchStart(_e: TouchEvent): void {
    /* noop */
  }
  onTouchMove(_e: TouchEvent): void {
    /* noop */
  }
  onTouchEnd(_e: TouchEvent): void {
    /* noop */
  }
}
