import { ToolPlugin, Point, DrawingObject, ToolContext, DrawingMode } from './ToolPlugin';

export class TextTool extends ToolPlugin {
  constructor() {
    super(
      'text',
      'text' as DrawingMode,
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 3H12M8 3V13M6 13H10" stroke="currentColor" stroke-width="1.5" fill="none"/>
      </svg>`,
      '文字工具 (快捷键: T)'
    );
  }

  get requiresDrag(): boolean {
    return false; // 文本不需要拖拽，直接创建并进入编辑模式
  }

  startDrawing(point: Point, context: ToolContext): DrawingObject {
    console.log('🔤 TextTool startDrawing at:', point);
    
    // 创建空的文本对象，不计算占位符边界
    const obj: DrawingObject = {
      id: context.generateId(),
      type: this.type,
      startPoint: point,
      text: '', // 空文字，立即进入编辑模式
      options: { ...context.options },
      bounds: { 
        x: point.x, 
        y: point.y - context.options.fontSize / 2, 
        width: 0, 
        height: context.options.fontSize 
      }
    };

    console.log('🔤 Created text object:', obj);
    return obj;
  }

  continueDrawing(point: Point, startObject: DrawingObject, context: ToolContext): void {
    // 文本工具不需要拖拽过程
  }

  finishDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject {
    console.log('🔤 TextTool finishDrawing, triggering edit mode');
    
    // Figma风格：文本创建后立即进入编辑模式
    // 我们需要通知DrawingEngine进入编辑模式
    // 这里我们添加一个特殊标记，让DrawingEngine知道要进入编辑模式
    (startObject as any).__shouldStartEditing = true;
    
    return startObject;
  }

  render(obj: DrawingObject, context: ToolContext): void {
    context.ctx.save();
    context.ctx.font = `${obj.options.fontWeight || 'normal'} ${obj.options.fontSize}px ${obj.options.fontFamily || 'Arial'}`;
    context.ctx.textAlign = obj.options.textAlign || 'left';
    context.ctx.textBaseline = 'middle';
    context.ctx.fillStyle = obj.options.color;
    context.ctx.globalAlpha = obj.options.opacity;

    // 只渲染有内容的文本，不显示占位符
    if (obj.text && obj.text.trim()) {
      context.ctx.fillText(obj.text, obj.startPoint.x, obj.startPoint.y);
    }
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
      // 空文本时返回最小边界
      return {
        x: obj.startPoint.x,
        y: obj.startPoint.y - obj.options.fontSize / 2,
        width: 0,
        height: obj.options.fontSize
      };
    }

    // 使用实际文本计算边界
    context.ctx.save();
    context.ctx.font = `${obj.options.fontWeight || 'normal'} ${obj.options.fontSize}px ${obj.options.fontFamily || 'Arial'}`;
    const textMetrics = context.ctx.measureText(obj.text);
    const textWidth = textMetrics.width;
    const textHeight = obj.options.fontSize * 1.2;
    context.ctx.restore();

    const textAlign = obj.options.textAlign || 'left';
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
