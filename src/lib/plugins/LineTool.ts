import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from './ToolPlugin';

export class LineTool extends ToolPlugin {
  constructor() {
    super(
      'line',
      'line' as DrawingMode,
      `<svg width="16" height="16" viewBox="0 0 16 16"><line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" stroke-width="2"/></svg>`,
      '直线工具 (快捷键: 7)'
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
    ctx.beginPath();
    if (obj.startPoint && obj.endPoint) {
      ctx.moveTo(obj.startPoint.x, obj.startPoint.y);
      ctx.lineTo(obj.endPoint.x, obj.endPoint.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  hitTest(point: Point, obj: DrawingObject, margin: number = 4): boolean {
    const { startPoint, endPoint } = obj;
    if (!startPoint || !endPoint) return false;
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return false;
    const t = ((point.x - startPoint.x) * dx + (point.y - startPoint.y) * dy) / (length * length);
    if (t < 0 || t > 1) return false;
    const projX = startPoint.x + t * dx;
    const projY = startPoint.y + t * dy;
    const dist = Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
    return dist <= margin;
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