import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from './ToolPlugin';

export class TriangleTool extends ToolPlugin {
  constructor() {
    super(
      'triangle',
      'triangle' as DrawingMode,
      `<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\"><polygon points=\"8,2 14,14 2,14\" fill=\"currentColor\"/></svg>`,
      '三角形工具'
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
    startObject.bounds = {
      x: Math.min(startObject.startPoint.x, point.x),
      y: Math.min(startObject.startPoint.y, point.y),
      width: Math.abs(point.x - startObject.startPoint.x),
      height: Math.abs(point.y - startObject.startPoint.y)
    };
    context.redrawCanvas();
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
      this.drawTriangle(ctx, obj.startPoint, obj.endPoint);
    }
    ctx.restore();
  }

  private drawTriangle(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
    const x1 = start.x;
    const y1 = end.y;
    const x2 = (start.x + end.x) / 2;
    const y2 = start.y;
    const x3 = end.x;
    const y3 = end.y;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
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