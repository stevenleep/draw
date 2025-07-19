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

  updateDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject | null {
    // 文本工具不需要更新绘制
    return null;
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
    context.ctx.textBaseline = 'top'; // 改为top对齐，便于多行文本
    context.ctx.fillStyle = obj.options.color;
    context.ctx.globalAlpha = obj.options.opacity;

    // 渲染文本内容
    if (obj.text && obj.text.trim()) {
      this.renderMultilineText(obj.text, obj.startPoint.x, obj.startPoint.y, obj.options, context);
    } else {
      // 空文本时显示占位符
      this.renderPlaceholder(obj.startPoint.x, obj.startPoint.y, obj.options, context);
    }
    
    context.ctx.restore();
  }

  // 渲染编辑状态下的光标
  renderCursor(obj: DrawingObject, cursorPosition: number, cursorVisible: boolean, context: ToolContext): void {
    if (!cursorVisible) return;
    
    context.ctx.save();
    context.ctx.font = `${obj.options.fontWeight || 'normal'} ${obj.options.fontSize}px ${obj.options.fontFamily || 'Arial'}`;
    context.ctx.textAlign = obj.options.textAlign || 'left';
    context.ctx.textBaseline = 'top';
    
    const lines = (obj.text || '').split('\n');
    const lineHeight = obj.options.fontSize * 1.2;
    let currentPos = 0;
    let cursorX = obj.startPoint.x;
    let cursorY = obj.startPoint.y;
    
    // 找到光标位置
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= cursorPosition) {
        const lineText = lines[i].substring(0, cursorPosition - currentPos);
        const textMetrics = context.ctx.measureText(lineText);
        cursorX = obj.startPoint.x + textMetrics.width;
        cursorY = obj.startPoint.y + i * lineHeight;
        break;
      }
      currentPos += lines[i].length + 1; // +1 for newline
    }
    
    // 如果光标在文本末尾
    if (cursorPosition >= (obj.text || '').length) {
      const lastLine = lines[lines.length - 1] || '';
      const textMetrics = context.ctx.measureText(lastLine);
      cursorX = obj.startPoint.x + textMetrics.width;
      cursorY = obj.startPoint.y + (lines.length - 1) * lineHeight;
    }
    
    // 根据文本对齐方式调整光标位置
    const textAlign = obj.options.textAlign || 'left';
    if (textAlign === 'center') {
      // 对于居中对齐，需要计算当前行的宽度
      const currentLineIndex = Math.min(Math.floor(cursorPosition / (lines[0]?.length || 1)), lines.length - 1);
      const currentLine = lines[currentLineIndex] || '';
      const lineWidth = context.ctx.measureText(currentLine).width;
      cursorX = obj.startPoint.x - lineWidth / 2 + context.ctx.measureText(currentLine.substring(0, cursorPosition % (currentLine.length + 1))).width;
    } else if (textAlign === 'right') {
      // 对于右对齐，需要计算当前行的宽度
      const currentLineIndex = Math.min(Math.floor(cursorPosition / (lines[0]?.length || 1)), lines.length - 1);
      const currentLine = lines[currentLineIndex] || '';
      const lineWidth = context.ctx.measureText(currentLine).width;
      cursorX = obj.startPoint.x - lineWidth + context.ctx.measureText(currentLine.substring(0, cursorPosition % (currentLine.length + 1))).width;
    }
    
    // 绘制光标
    context.ctx.strokeStyle = obj.options.color;
    context.ctx.lineWidth = 2;
    context.ctx.beginPath();
    context.ctx.moveTo(cursorX, cursorY);
    context.ctx.lineTo(cursorX, cursorY + lineHeight);
    context.ctx.stroke();
    
    context.ctx.restore();
  }

  private renderPlaceholder(x: number, y: number, options: any, context: ToolContext): void {
    context.ctx.save();
    context.ctx.fillStyle = '#999';
    context.ctx.globalAlpha = 0.5;
    context.ctx.fillText('点击输入文字', x, y);
    context.ctx.restore();
  }

  private renderMultilineText(text: string, x: number, y: number, options: any, context: ToolContext): void {
    const lines = text.split('\n');
    const lineHeight = options.fontSize * 1.2;
    
    lines.forEach((line, index) => {
      const lineY = y + index * lineHeight;
      context.ctx.fillText(line, x, lineY);
    });
  }

  hitTest(point: Point, obj: DrawingObject, margin: number = 5): boolean {
    return point.x >= obj.bounds.x - margin && 
           point.x <= obj.bounds.x + obj.bounds.width + margin &&
           point.y >= obj.bounds.y - margin && 
           point.y <= obj.bounds.y + obj.bounds.height + margin;
  }

  calculateBounds(obj: DrawingObject, context: ToolContext): { x: number; y: number; width: number; height: number } {
    context.ctx.save();
    context.ctx.font = `${obj.options.fontWeight || 'normal'} ${obj.options.fontSize}px ${obj.options.fontFamily || 'Arial'}`;
    
    // 计算最小宽度（用于空文本）
    const minWidth = context.ctx.measureText('A').width;
    const lineHeight = obj.options.fontSize * 1.2;
    
    if (!obj.text || !obj.text.trim()) {
      // 空文本时返回合理的边界，便于点击检测
      const textAlign = obj.options.textAlign || 'left';
      let x = obj.startPoint.x;
      
      if (textAlign === 'center') {
        x = obj.startPoint.x - minWidth / 2;
      } else if (textAlign === 'right') {
        x = obj.startPoint.x - minWidth;
      }
      
      context.ctx.restore();
      return {
        x: x,
        y: obj.startPoint.y - lineHeight / 2,
        width: minWidth,
        height: lineHeight
      };
    }

    // 使用实际文本计算边界（支持多行）
    const lines = obj.text.split('\n');
    let maxWidth = 0;
    const totalHeight = lines.length * lineHeight;
    
    // 计算最大行宽
    lines.forEach(line => {
      const textMetrics = context.ctx.measureText(line);
      maxWidth = Math.max(maxWidth, textMetrics.width);
    });
    
    // 确保最小宽度
    maxWidth = Math.max(maxWidth, minWidth);
    
    const textAlign = obj.options.textAlign || 'left';
    let x = obj.startPoint.x;

    if (textAlign === 'center') {
      x = obj.startPoint.x - maxWidth / 2;
    } else if (textAlign === 'right') {
      x = obj.startPoint.x - maxWidth;
    }

    context.ctx.restore();
    return {
      x: x,
      y: obj.startPoint.y - lineHeight / 2,
      width: maxWidth,
      height: totalHeight
    };
  }

  // 特殊方法：更新文本内容并重新计算边界
  updateText(obj: DrawingObject, newText: string, context: ToolContext): void {
    obj.text = newText;
    obj.bounds = this.calculateBounds(obj, context);
  }
}
