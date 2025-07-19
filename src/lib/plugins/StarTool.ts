import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from './ToolPlugin';

export class StarTool extends ToolPlugin {
  constructor() {
    super(
      'star',
      'star' as DrawingMode,
      `<svg width=\"16\" height=\"16\" viewBox=\"0 0 16 16\"><polygon points=\"8,2 10,6 14,6.5 11,9.5 12,14 8,11.5 4,14 5,9.5 2,6.5 6,6\" fill=\"currentColor\"/></svg>`,
      '五角星工具 (快捷键: 0)'
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
      this.drawStar(ctx, obj.startPoint, obj.endPoint);
    }
    ctx.restore();
  }

  private drawStar(ctx: CanvasRenderingContext2D, start: Point, end: Point) {
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    const spikes = 5;
    const outerRadius = Math.min(rx, ry);
    const innerRadius = outerRadius * 0.5;
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += Math.PI / spikes;
      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += Math.PI / spikes;
    }
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
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