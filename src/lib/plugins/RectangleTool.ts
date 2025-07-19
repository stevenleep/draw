import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from './ToolPlugin';

export class RectangleTool extends ToolPlugin {
  constructor() {
    super(
      'rectangle',
      'rectangle' as DrawingMode,
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
      '矩形工具 (快捷键: 3)'
    );
  }

  get requiresDrag(): boolean {
    return true; // 矩形需要拖拽来确定大小
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
    
    // 直接渲染，不需要调用renderPreview，因为DrawingEngine已经处理了预览设置
    if (startObject.endPoint) {
      const width = startObject.endPoint.x - startObject.startPoint.x;
      const height = startObject.endPoint.y - startObject.startPoint.y;
      
      // 填充
      if (startObject.options.hasFill && startObject.options.fillColor) {
        context.ctx.fillStyle = startObject.options.fillColor;
        context.ctx.fillRect(startObject.startPoint.x, startObject.startPoint.y, width, height);
      }
      
      // 描边
      context.ctx.strokeRect(startObject.startPoint.x, startObject.startPoint.y, width, height);
    }
    context.redrawCanvas();
  }

  finishDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject {
    startObject.endPoint = { ...point };
    startObject.bounds = this.calculateBounds(startObject, context);
    
    return startObject;
  }

  render(obj: DrawingObject, context: ToolContext): void {
    if (!obj.endPoint) return;

    context.ctx.save();
    
    // 设置样式
    context.ctx.strokeStyle = obj.options.strokeColor || obj.options.color;
    context.ctx.lineWidth = obj.options.strokeWidth;
    context.ctx.globalAlpha = obj.options.opacity;

    if (obj.options.lineDash && obj.options.lineDash.length > 0) {
      context.ctx.setLineDash(obj.options.lineDash);
    }

    // 设置阴影
    if (obj.options.shadowColor && obj.options.shadowBlur) {
      context.ctx.shadowColor = obj.options.shadowColor;
      context.ctx.shadowBlur = obj.options.shadowBlur;
      context.ctx.shadowOffsetX = obj.options.shadowOffsetX || 0;
      context.ctx.shadowOffsetY = obj.options.shadowOffsetY || 0;
    }

    const width = obj.endPoint.x - obj.startPoint.x;
    const height = obj.endPoint.y - obj.startPoint.y;

    // 填充
    if (obj.options.hasFill && obj.options.fillColor) {
      context.ctx.fillStyle = obj.options.fillColor;
      context.ctx.fillRect(obj.startPoint.x, obj.startPoint.y, width, height);
    }

    // 描边
    context.ctx.strokeRect(obj.startPoint.x, obj.startPoint.y, width, height);

    context.ctx.restore();
  }

  private renderPreview(obj: DrawingObject, context: ToolContext): void {
    if (!obj.endPoint) return;

    context.ctx.save();
    context.ctx.strokeStyle = obj.options.strokeColor || obj.options.color;
    context.ctx.lineWidth = obj.options.strokeWidth;
    context.ctx.globalAlpha = obj.options.opacity * 0.7; // 预览时稍微透明

    const width = obj.endPoint.x - obj.startPoint.x;
    const height = obj.endPoint.y - obj.startPoint.y;

    context.ctx.strokeRect(obj.startPoint.x, obj.startPoint.y, width, height);
    context.ctx.restore();
  }

  hitTest(point: Point, obj: DrawingObject, margin: number = 5): boolean {
    if (!obj.endPoint) return false;

    const x1 = Math.min(obj.startPoint.x, obj.endPoint.x);
    const y1 = Math.min(obj.startPoint.y, obj.endPoint.y);
    const x2 = Math.max(obj.startPoint.x, obj.endPoint.x);
    const y2 = Math.max(obj.startPoint.y, obj.endPoint.y);

    // 检查是否在边界内（包含边距）
    return point.x >= x1 - margin && 
           point.x <= x2 + margin &&
           point.y >= y1 - margin && 
           point.y <= y2 + margin;
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
