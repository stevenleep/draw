import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from './ToolPlugin';

export class HandDrawnTool extends ToolPlugin {
  constructor() {
    super(
      'hand-drawn',
      'hand-drawn' as DrawingMode,
      `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"/><path d="M2 2 Q8 0 14 2 Q16 8 14 14 Q8 16 2 14 Q0 8 2 2 Z" stroke="currentColor" stroke-width="1" fill="none"/></svg>`,
      '手绘风格矩形工具 (快捷键: 6)'
    );
  }

  startDrawing(point: Point, context: ToolContext): DrawingObject {
    return {
      id: context.generateId(),
      type: this.type,
      startPoint: point,
      endPoint: point,
      options: { ...context.options },
      bounds: { x: point.x, y: point.y, width: 0, height: 0 }
    };
  }

  continueDrawing(point: Point, startObject: DrawingObject, context: ToolContext): void {
    startObject.endPoint = point;
    startObject.bounds = this.calculateBounds(startObject, context);
  }

  updateDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject | null {
    startObject.endPoint = point;
    startObject.bounds = this.calculateBounds(startObject, context);
    return startObject;
  }

  finishDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject {
    startObject.endPoint = point;
    startObject.bounds = {
      x: Math.min(startObject.startPoint.x, point.x),
      y: Math.min(startObject.startPoint.y, point.y),
      width: Math.abs(point.x - startObject.startPoint.x),
      height: Math.abs(point.y - startObject.startPoint.y)
    };
    return startObject;
  }

  render(obj: DrawingObject, context: ToolContext): void {
    const { ctx } = context;
    ctx.save();
    ctx.strokeStyle = obj.options.color;
    ctx.lineWidth = obj.options.strokeWidth;
    ctx.globalAlpha = obj.options.opacity;
    if (obj.startPoint && obj.endPoint) {
      this.drawHandRect(ctx, obj.startPoint, obj.endPoint);
    }
    ctx.restore();
  }

  // 手绘风格矩形
  private drawHandRect(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.abs(end.x - start.x);
    const h = Math.abs(end.y - start.y);
    // 画四条抖动的边
    this.drawJitterLine(ctx, x, y, x + w, y);
    this.drawJitterLine(ctx, x + w, y, x + w, y + h);
    this.drawJitterLine(ctx, x + w, y + h, x, y + h);
    this.drawJitterLine(ctx, x, y + h, x, y);
  }
  private drawJitterLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    const jitter = 2;
    ctx.beginPath();
    ctx.moveTo(x1 + Math.random() * jitter, y1 + Math.random() * jitter);
    ctx.lineTo(x2 + Math.random() * jitter, y2 + Math.random() * jitter);
    ctx.stroke();
  }

  hitTest(point: Point, obj: DrawingObject, margin: number = 4): boolean {
    const { startPoint, endPoint } = obj;
    if (!startPoint || !endPoint) return false;
    const x1 = Math.min(startPoint.x, endPoint.x);
    const y1 = Math.min(startPoint.y, endPoint.y);
    const x2 = Math.max(startPoint.x, endPoint.x);
    const y2 = Math.max(startPoint.y, endPoint.y);
    return (
      point.x >= x1 - margin && point.x <= x2 + margin &&
      point.y >= y1 - margin && point.y <= y2 + margin
    );
  }

  calculateBounds(obj: DrawingObject, context: ToolContext) {
    const { startPoint, endPoint } = obj;
    if (!startPoint || !endPoint) return { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: Math.min(startPoint.x, endPoint.x),
      y: Math.min(startPoint.y, endPoint.y),
      width: Math.abs(endPoint.x - startPoint.x),
      height: Math.abs(endPoint.y - startPoint.y)
    };
  }

  get requiresDrag(): boolean {
    return true;
  }
} 