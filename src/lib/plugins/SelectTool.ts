import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from "./ToolPlugin";

export class SelectTool extends ToolPlugin {
  constructor() {
    super(
      "select",
      "select" as DrawingMode,
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 2L14 2L14 14L2 14L2 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M6 6L10 6L10 10L6 10L6 6Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
      "选择工具 (快捷键: V)",
    );
  }

  get requiresDrag(): boolean {
    return false;
  }

  startDrawing(_point: Point, _context: ToolContext): DrawingObject | null {
    return null;
  }

  continueDrawing(_point: Point, _startObject: DrawingObject, _context: ToolContext): void {
    // intentionally empty
  }

  updateDrawing(_point: Point, _startObject: DrawingObject, _context: ToolContext): DrawingObject | null {
    return null;
  }

  finishDrawing(_point: Point, startObject: DrawingObject, _context: ToolContext): DrawingObject {
    return startObject;
  }

  render(_obj: DrawingObject, _context: ToolContext): void {
    // intentionally empty
  }

  hitTest(point: Point, obj: DrawingObject, margin: number = 5): boolean {
    return (
      point.x >= obj.bounds.x - margin &&
      point.x <= obj.bounds.x + obj.bounds.width + margin &&
      point.y >= obj.bounds.y - margin &&
      point.y <= obj.bounds.y + obj.bounds.height + margin
    );
  }

  calculateBounds(obj: DrawingObject, _context: ToolContext): { x: number; y: number; width: number; height: number } {
    return obj.bounds;
  }
}
