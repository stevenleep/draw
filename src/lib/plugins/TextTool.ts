import { ToolPlugin, Point, DrawingObject, ToolContext } from './ToolPlugin';

export class TextTool extends ToolPlugin {
  constructor() {
    super(
      'text',
      'text',
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 3H12M8 3V13M6 13H10" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
      '文字工具 (快捷键: T)'
    );
  }

  get requiresDrag(): boolean {
    return false; // 文本不需要拖拽，直接创建
  }

  startDrawing(point: Point, context: ToolContext): DrawingObject {
    // 计算占位符文本的边界框
    context.ctx.save();
    context.ctx.font = `${context.options.fontWeight || 'normal'} ${context.options.fontSize}px ${context.options.fontFamily || 'Arial'}`;
    const placeholderText = '点击编辑文字';
    const textMetrics = context.ctx.measureText(placeholderText);
    const textWidth = textMetrics.width;
    const textHeight = context.options.fontSize * 1.2;
    context.ctx.restore();

    const obj: DrawingObject = {
      id: context.generateId(),
      type: this.type,
      startPoint: point,
      text: '', // 空文字，等待用户输入
      options: { ...context.options },
      bounds: { 
        x: point.x - textWidth / 2, 
        y: point.y - textHeight / 2, 
        width: textWidth, 
        height: textHeight 
      }
    };

    return obj;
  }

  continueDrawing(point: Point, startObject: DrawingObject, context: ToolContext): void {
    // 文本工具不需要拖拽过程
  }

  finishDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject {
    return startObject;
  }

  render(obj: DrawingObject, context: ToolContext): void {
    context.ctx.save();
    context.ctx.font = `${obj.options.fontWeight || 'normal'} ${obj.options.fontSize}px ${obj.options.fontFamily || 'Arial'}`;
    context.ctx.textAlign = obj.options.textAlign || 'center';
    context.ctx.textBaseline = 'middle';
    context.ctx.fillStyle = obj.options.color;
    context.ctx.globalAlpha = obj.options.opacity;

    // 设置阴影
    if (obj.options.shadowColor && obj.options.shadowBlur) {
      context.ctx.shadowColor = obj.options.shadowColor;
      context.ctx.shadowBlur = obj.options.shadowBlur;
      context.ctx.shadowOffsetX = obj.options.shadowOffsetX || 0;
      context.ctx.shadowOffsetY = obj.options.shadowOffsetY || 0;
    }

    // 显示文本或占位符
    const displayText = (obj.text && obj.text.trim()) ? obj.text : '点击编辑文字';
    if (!obj.text || !obj.text.trim()) {
      // 空文本用灰色显示占位符
      context.ctx.save();
      context.ctx.globalAlpha = 0.5;
      context.ctx.fillStyle = '#999999';
      context.ctx.fillText(displayText, obj.startPoint.x, obj.startPoint.y);
      context.ctx.restore();
    } else {
      context.ctx.fillText(displayText, obj.startPoint.x, obj.startPoint.y);
    }

    // 恢复默认设置
    context.ctx.textAlign = 'start';
    context.ctx.textBaseline = 'alphabetic';
    context.ctx.restore();
  }

  hitTest(point: Point, obj: DrawingObject, margin: number = 5): boolean {
    return point.x >= obj.bounds.x - margin && 
           point.x <= obj.bounds.x + obj.bounds.width + margin &&
           point.y >= obj.bounds.y - margin && 
           point.y <= obj.bounds.y + obj.bounds.height + margin;
  }

  calculateBounds(obj: DrawingObject, context: ToolContext): { x: number; y: number; width: number; height: number } {
    if (!obj.text || !obj.text.trim()) {
      // 使用占位符文本计算边界
      context.ctx.save();
      context.ctx.font = `${obj.options.fontWeight || 'normal'} ${obj.options.fontSize}px ${obj.options.fontFamily || 'Arial'}`;
      const placeholderText = '点击编辑文字';
      const textMetrics = context.ctx.measureText(placeholderText);
      const textWidth = textMetrics.width;
      const textHeight = obj.options.fontSize * 1.2;
      context.ctx.restore();

      return {
        x: obj.startPoint.x - textWidth / 2,
        y: obj.startPoint.y - textHeight / 2,
        width: textWidth,
        height: textHeight
      };
    }

    // 使用实际文本计算边界
    context.ctx.save();
    context.ctx.font = `${obj.options.fontWeight || 'normal'} ${obj.options.fontSize}px ${obj.options.fontFamily || 'Arial'}`;
    const textMetrics = context.ctx.measureText(obj.text);
    const textWidth = textMetrics.width;
    const textHeight = obj.options.fontSize * 1.2;
    context.ctx.restore();

    const textAlign = obj.options.textAlign || 'center';
    let x = obj.startPoint.x;

    if (textAlign === 'center') {
      x = obj.startPoint.x - textWidth / 2;
    } else if (textAlign === 'right') {
      x = obj.startPoint.x - textWidth;
    }

    return {
      x: x,
      y: obj.startPoint.y - textHeight / 2,
      width: textWidth,
      height: textHeight
    };
  }

  // 特殊方法：更新文本内容并重新计算边界
  updateText(obj: DrawingObject, newText: string, context: ToolContext): void {
    obj.text = newText;
    obj.bounds = this.calculateBounds(obj, context);
  }
}
