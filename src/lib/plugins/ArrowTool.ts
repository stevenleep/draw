import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from './ToolPlugin';

export class ArrowTool extends ToolPlugin {
  constructor() {
    super(
      'arrow',
      'arrow' as DrawingMode,
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 16L16 2M16 2L16 9M16 2L9 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
      '箭头工具 (快捷键: 2)'
    );
  }

  get requiresDrag(): boolean {
    return true; // 箭头需要拖拽来确定方向和长度
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
    
    // 直接绘制箭头，不需要调用renderPreview
    if (startObject.endPoint) {
      // 绘制箭头线
      context.ctx.beginPath();
      context.ctx.moveTo(startObject.startPoint.x, startObject.startPoint.y);
      context.ctx.lineTo(startObject.endPoint.x, startObject.endPoint.y);
      context.ctx.stroke();

      // 绘制箭头头部
      this.drawArrowHead(startObject.startPoint, startObject.endPoint, context);
    }
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
    context.ctx.fillStyle = obj.options.strokeColor || obj.options.color;
    context.ctx.lineWidth = obj.options.strokeWidth;
    context.ctx.globalAlpha = obj.options.opacity;
    context.ctx.lineCap = 'round';
    context.ctx.lineJoin = 'round';

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

    // 绘制箭头线
    context.ctx.beginPath();
    context.ctx.moveTo(obj.startPoint.x, obj.startPoint.y);
    context.ctx.lineTo(obj.endPoint.x, obj.endPoint.y);
    context.ctx.stroke();

    // 绘制箭头头部
    this.drawArrowHead(obj.startPoint, obj.endPoint, context);

    context.ctx.restore();
  }

  private renderPreview(obj: DrawingObject, context: ToolContext): void {
    if (!obj.endPoint) return;

    context.ctx.save();
    context.ctx.strokeStyle = obj.options.strokeColor || obj.options.color;
    context.ctx.fillStyle = obj.options.strokeColor || obj.options.color;
    context.ctx.lineWidth = obj.options.strokeWidth;
    context.ctx.globalAlpha = obj.options.opacity * 0.7;
    context.ctx.lineCap = 'round';

    // 绘制箭头线
    context.ctx.beginPath();
    context.ctx.moveTo(obj.startPoint.x, obj.startPoint.y);
    context.ctx.lineTo(obj.endPoint.x, obj.endPoint.y);
    context.ctx.stroke();

    // 绘制箭头头部
    this.drawArrowHead(obj.startPoint, obj.endPoint, context);

    context.ctx.restore();
  }

  private drawArrowHead(start: Point, end: Point, context: ToolContext): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) return;

    const arrowLength = Math.min(20, length / 3);
    const arrowWidth = arrowLength * 0.6;

    // 单位向量
    const ux = dx / length;
    const uy = dy / length;

    // 箭头头部的三个点
    const p1 = {
      x: end.x,
      y: end.y
    };
    
    const p2 = {
      x: end.x - arrowLength * ux + arrowWidth * uy,
      y: end.y - arrowLength * uy - arrowWidth * ux
    };
    
    const p3 = {
      x: end.x - arrowLength * ux - arrowWidth * uy,
      y: end.y - arrowLength * uy + arrowWidth * ux
    };

    // 绘制箭头头部
    context.ctx.beginPath();
    context.ctx.moveTo(p1.x, p1.y);
    context.ctx.lineTo(p2.x, p2.y);
    context.ctx.lineTo(p3.x, p3.y);
    context.ctx.closePath();
    context.ctx.fill();
  }

  hitTest(point: Point, obj: DrawingObject, margin: number = 5): boolean {
    if (!obj.endPoint) return false;

    // 检查是否接近箭头线
    const distance = this.distanceToLineSegment(point, obj.startPoint, obj.endPoint);
    return distance <= margin;
  }

  calculateBounds(obj: DrawingObject, context: ToolContext): { x: number; y: number; width: number; height: number } {
    if (!obj.endPoint) {
      return { x: obj.startPoint.x, y: obj.startPoint.y, width: 0, height: 0 };
    }

    const x1 = Math.min(obj.startPoint.x, obj.endPoint.x);
    const y1 = Math.min(obj.startPoint.y, obj.endPoint.y);
    const x2 = Math.max(obj.startPoint.x, obj.endPoint.x);
    const y2 = Math.max(obj.startPoint.y, obj.endPoint.y);

    const arrowLength = 20; // 箭头头部长度
    const strokeWidth = obj.options.strokeWidth || 1;
    const padding = Math.max(arrowLength, strokeWidth);

    return {
      x: x1 - padding,
      y: y1 - padding,
      width: x2 - x1 + padding * 2,
      height: y2 - y1 + padding * 2
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
