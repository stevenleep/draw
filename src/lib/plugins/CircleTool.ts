import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from './ToolPlugin';

export class CircleTool extends ToolPlugin {
  constructor() {
    super(
      'circle',
      'circle' as DrawingMode,
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
      '圆形工具 (快捷键: 4)'
    );
  }

  get requiresDrag(): boolean {
    return true;
  }

  startDrawing(point: Point, context: ToolContext): DrawingObject {
    const obj: DrawingObject = {
      id: context.generateId(),
      type: this.type,
      startPoint: point,
      endPoint: point,
      options: { ...context.options },
      bounds: { x: point.x, y: point.y, width: 0, height: 0 }
    };

    return obj;
  }

  continueDrawing(point: Point, startObject: DrawingObject, context: ToolContext): void {
    startObject.endPoint = { ...point };
    startObject.bounds = this.calculateBounds(startObject, context);
  }

  updateDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject | null {
    startObject.endPoint = { ...point };
    startObject.bounds = this.calculateBounds(startObject, context);
    return startObject;
  }

  finishDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject {
    startObject.endPoint = { ...point };
    startObject.bounds = this.calculateBounds(startObject, context);
    
    return startObject;
  }

  render(obj: DrawingObject, context: ToolContext): void {
    if (!obj.endPoint) return;

    context.ctx.save();
    
    context.ctx.strokeStyle = obj.options.strokeColor || obj.options.color;
    context.ctx.lineWidth = obj.options.strokeWidth;
    context.ctx.globalAlpha = obj.options.opacity;

    if (obj.options.lineDash && obj.options.lineDash.length > 0) {
      context.ctx.setLineDash(obj.options.lineDash);
    }

    if (obj.options.shadowColor && obj.options.shadowBlur) {
      context.ctx.shadowColor = obj.options.shadowColor;
      context.ctx.shadowBlur = obj.options.shadowBlur;
      context.ctx.shadowOffsetX = obj.options.shadowOffsetX || 0;
      context.ctx.shadowOffsetY = obj.options.shadowOffsetY || 0;
    }

    const centerX = (obj.startPoint.x + obj.endPoint.x) / 2;
    const centerY = (obj.startPoint.y + obj.endPoint.y) / 2;
    const radiusX = Math.abs(obj.endPoint.x - obj.startPoint.x) / 2;
    const radiusY = Math.abs(obj.endPoint.y - obj.startPoint.y) / 2;

    context.ctx.beginPath();
    context.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);

    if (obj.options.hasFill && obj.options.fillColor) {
      context.ctx.fillStyle = obj.options.fillColor;
      context.ctx.fill();
    }

    context.ctx.stroke();

    context.ctx.restore();
  }

  private renderPreview(obj: DrawingObject, context: ToolContext): void {
    if (!obj.endPoint) return;

    context.ctx.save();
    context.ctx.strokeStyle = obj.options.strokeColor || obj.options.color;
    context.ctx.lineWidth = obj.options.strokeWidth;
    context.ctx.globalAlpha = obj.options.opacity * 0.7;

    const centerX = (obj.startPoint.x + obj.endPoint.x) / 2;
    const centerY = (obj.startPoint.y + obj.endPoint.y) / 2;
    const radiusX = Math.abs(obj.endPoint.x - obj.startPoint.x) / 2;
    const radiusY = Math.abs(obj.endPoint.y - obj.startPoint.y) / 2;

    context.ctx.beginPath();
    context.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    context.ctx.stroke();

    context.ctx.restore();
  }

  hitTest(point: Point, obj: DrawingObject, margin: number = 5): boolean {
    if (!obj.endPoint) return false;

    const centerX = (obj.startPoint.x + obj.endPoint.x) / 2;
    const centerY = (obj.startPoint.y + obj.endPoint.y) / 2;
    const radiusX = Math.abs(obj.endPoint.x - obj.startPoint.x) / 2;
    const radiusY = Math.abs(obj.endPoint.y - obj.startPoint.y) / 2;

    const dx = (point.x - centerX) / (radiusX + margin);
    const dy = (point.y - centerY) / (radiusY + margin);

    return (dx * dx + dy * dy) <= 1;
  }

  calculateBounds(obj: DrawingObject, context: ToolContext): { x: number; y: number; width: number; height: number } {
    if (!obj.endPoint) {
      return { x: obj.startPoint.x, y: obj.startPoint.y, width: 0, height: 0 };
    }

    const x1 = Math.min(obj.startPoint.x, obj.endPoint.x);
    const y1 = Math.min(obj.startPoint.y, obj.endPoint.y);
    const x2 = Math.max(obj.startPoint.x, obj.endPoint.x);
    const y2 = Math.max(obj.startPoint.y, obj.endPoint.y);

    const strokeWidth = obj.options.strokeWidth || 1;
    const padding = strokeWidth / 2;

    return {
      x: x1 - padding,
      y: y1 - padding,
      width: x2 - x1 + strokeWidth,
      height: y2 - y1 + strokeWidth
    };
  }
}
