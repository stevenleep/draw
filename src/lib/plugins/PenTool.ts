import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from "./ToolPlugin";

export class PenTool extends ToolPlugin {
  constructor() {
    super(
      "pen",
      "pen" as DrawingMode,
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 14L14 2M14 2L11 2M14 2L14 5" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <circle cx="2" cy="14" r="1" fill="currentColor"/>
      </svg>`,
      "画笔工具 (快捷键: 1)",
    );
  }

  get requiresDrag(): boolean {
    return false;
  }

  startDrawing(point: Point, context: ToolContext): DrawingObject {
    const obj: DrawingObject = {
      id: context.generateId(),
      type: this.type,
      startPoint: point,
      points: [{ ...point }],
      options: { ...context.options },
      bounds: { x: point.x, y: point.y, width: 0, height: 0 },
    };
    return obj;
  }

  continueDrawing(point: Point, startObject: DrawingObject, context: ToolContext): void {
    if (!startObject.points) {
      return;
    }
    startObject.points.push({ ...point });
    startObject.bounds = this.calculateBounds(startObject, context);
  }

  updateDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject | null {
    if (!startObject.points) {
      return null;
    }
    startObject.points.push({ ...point });
    startObject.bounds = this.calculateBounds(startObject, context);
    return startObject;
  }

  finishDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject {
    if (startObject.points) {
      startObject.points.push({ ...point });
    }
    startObject.bounds = this.calculateBounds(startObject, context);
    return startObject;
  }

  render(obj: DrawingObject, context: ToolContext): void {
    if (!obj.points || obj.points.length === 0) {
      return;
    }
    context.ctx.save();
    context.ctx.strokeStyle = obj.options.color;
    context.ctx.lineWidth = obj.options.strokeWidth;
    context.ctx.lineCap = "round";
    context.ctx.lineJoin = "round";
    context.ctx.globalAlpha = obj.options.opacity;
    if (obj.options.lineDash && obj.options.lineDash.length > 0) {
      context.ctx.setLineDash(obj.options.lineDash);
    }
    context.ctx.beginPath();
    context.ctx.moveTo(obj.points[0].x, obj.points[0].y);
    for (let i = 1; i < obj.points.length; i++) {
      context.ctx.lineTo(obj.points[i].x, obj.points[i].y);
    }
    context.ctx.stroke();
    context.ctx.restore();
  }

  hitTest(point: Point, obj: DrawingObject, margin: number = 5): boolean {
    if (!obj.points || obj.points.length < 2) {
      return false;
    }
    for (let i = 1; i < obj.points.length; i++) {
      const distance = this.distanceToLineSegment(point, obj.points[i - 1], obj.points[i]);
      if (distance <= margin) {
        return true;
      }
    }
    return false;
  }

  calculateBounds(obj: DrawingObject, _context: ToolContext): { x: number; y: number; width: number; height: number } {
    if (!obj.points || obj.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    let minX = obj.points[0].x;
    let maxX = obj.points[0].x;
    let minY = obj.points[0].y;
    let maxY = obj.points[0].y;
    for (const point of obj.points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    const strokeWidth = obj.options.strokeWidth || 1;
    const padding = strokeWidth / 2;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + strokeWidth,
      height: maxY - minY + strokeWidth,
    };
  }

  private distanceToLineSegment(point: Point, lineStart: Point, lineEnd: Point): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    if (lenSq === 0) {
      return Math.sqrt(A * A + B * B);
    }
    const param = dot / lenSq;
    let xx: number, yy: number;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
