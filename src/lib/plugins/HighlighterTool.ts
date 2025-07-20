import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from "./ToolPlugin";

export class HighlighterTool extends ToolPlugin {
  constructor() {
    super(
      "highlighter",
      "highlighter" as DrawingMode,
      '<svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="10" width="12" height="4" fill="#FFD600" opacity="0.5"/><rect x="2" y="2" width="12" height="8" fill="#FFD600"/></svg>',
      "荧光笔工具 (快捷键: 9)",
    );
  }

  startDrawing(point: Point, context: ToolContext): DrawingObject {
    return {
      id: context.generateId(),
      type: this.type,
      points: [point],
      startPoint: point,
      options: { ...context.options },
      bounds: { x: point.x, y: point.y, width: 0, height: 0 },
    };
  }

  continueDrawing(point: Point, startObject: DrawingObject, _context: ToolContext): void {
    if (!startObject.points) {
      startObject.points = [];
    }
    startObject.points.push(point);
    const xs = startObject.points.map((p) => p.x);
    const ys = startObject.points.map((p) => p.y);
    startObject.bounds = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  updateDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject | null {
    if (!startObject.points) {
      startObject.points = [];
    }
    startObject.points.push(point);
    startObject.bounds = this.calculateBounds(startObject, context);
    return startObject;
  }

  finishDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject {
    this.continueDrawing(point, startObject, context);
    return startObject;
  }

  render(obj: DrawingObject, context: ToolContext): void {
    const { ctx } = context;
    ctx.save();
    ctx.globalAlpha = 0.3 * (obj.options.opacity || 1);
    ctx.globalCompositeOperation = "multiply";
    ctx.strokeStyle = obj.options.color || "#FFD600";
    ctx.lineWidth = obj.options.strokeWidth || 16;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (obj.points && obj.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(obj.points[0].x, obj.points[0].y);
      for (let i = 1; i < obj.points.length; i++) {
        ctx.lineTo(obj.points[i].x, obj.points[i].y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  hitTest(point: Point, obj: DrawingObject, margin: number = 8): boolean {
    if (!obj.points) {
      return false;
    }
    return obj.points.some((p) => Math.abs(p.x - point.x) <= margin && Math.abs(p.y - point.y) <= margin);
  }

  calculateBounds(obj: DrawingObject, _context: ToolContext) {
    if (!obj.points || obj.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    const xs = obj.points.map((p) => p.x);
    const ys = obj.points.map((p) => p.y);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }

  get requiresDrag(): boolean {
    return true;
  }
}
