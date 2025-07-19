import { DrawingObject, DrawingOptions, HandleType, TransformHandle } from '../core/types';
import { ToolManager } from '../plugins/ToolManager';
import { TextEditingState } from '../state/TextEditingState';

export class DrawingRenderer {
  private ctx: CanvasRenderingContext2D;
  private toolManager: ToolManager;
  private textEditingState: TextEditingState;

  constructor(ctx: CanvasRenderingContext2D, toolManager: ToolManager, textEditingState: TextEditingState) {
    this.ctx = ctx;
    this.toolManager = toolManager;
    this.textEditingState = textEditingState;
  }

  // 渲染所有对象
  renderObjects(objects: DrawingObject[]): void {
    objects.forEach(obj => {
      this.renderObject(obj);
    });
  }

  // 渲染单个对象
  public renderObject(obj: DrawingObject): void {
    this.ctx.save();
    
    // 应用变换
    this.applyTransform(obj);
    
    // 设置基本样式
    this.setBasicStyles(obj.options);
    
    // 设置线条样式
    this.setLineStyles(obj.options);
    
    // 设置阴影
    this.setShadowStyles(obj.options);
    
    // 使用插件系统渲染对象
    const tool = this.toolManager.getTool(obj.type);
    if (tool) {
      const context = {
        ctx: this.ctx,
        canvas: this.ctx.canvas,
        options: obj.options,
        generateId: () => '',
        redrawCanvas: () => {},
        saveState: () => {}
      };
      
      tool.render(obj, context);
    } else {
      // 后备方案：处理不在插件系统中的工具
      this.renderLegacyObject(obj);
    }
    
    // 重置样式
    this.resetStyles();
    
    this.ctx.restore();
  }

  // 渲染文本编辑覆盖层
  renderTextEditingOverlay(selectedObject: DrawingObject | null): void {
    if (!this.textEditingState.isEditing() || !selectedObject || selectedObject.type !== 'text') {
      return;
    }

    // 使用TextTool的光标渲染方法
    const textTool = this.toolManager.getTool('text');
    if (textTool && 'renderCursor' in textTool) {
      const context = {
        ctx: this.ctx,
        canvas: this.ctx.canvas,
        options: selectedObject.options,
        generateId: () => '',
        redrawCanvas: () => {},
        saveState: () => {}
      };
      
      // 渲染编辑中的文本
      this.ctx.save();
      this.ctx.font = `${selectedObject.options.fontWeight || 'normal'} ${selectedObject.options.fontSize}px ${selectedObject.options.fontFamily || 'Arial'}`;
      this.ctx.textAlign = selectedObject.options.textAlign || 'left';
      this.ctx.textBaseline = 'top';
      this.ctx.fillStyle = selectedObject.options.color || '#222';
      this.ctx.globalAlpha = 1;
      
      const editingText = this.textEditingState.getEditingText();
      if (editingText) {
        this.renderMultilineText(editingText, selectedObject.startPoint.x, selectedObject.startPoint.y, selectedObject.options);
      }
      this.ctx.restore();
      
      // 渲染光标
      (textTool as any).renderCursor(
        selectedObject, 
        this.textEditingState.getCursorPosition(), 
        this.textEditingState.isCursorVisible(), 
        context
      );
    }
  }

  // 渲染选择框
  renderSelectionBox(obj: DrawingObject): void {
    const padding = 10;
    this.ctx.save();
    this.ctx.strokeStyle = '#0066ff';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(
      obj.bounds.x - padding,
      obj.bounds.y - padding,
      obj.bounds.width + padding * 2,
      obj.bounds.height + padding * 2
    );
    this.ctx.restore();
  }

  // 渲染变换控制手柄
  renderTransformHandles(handles: TransformHandle[]): void {
    handles.forEach(handle => {
      this.renderTransformHandle(handle);
    });
  }

  // 私有方法
  private applyTransform(obj: DrawingObject): void {
    if (obj.transform && (obj.transform.rotation !== 0 || obj.transform.scaleX !== 1 || obj.transform.scaleY !== 1 || obj.transform.translateX !== 0 || obj.transform.translateY !== 0)) {
      const centerX = obj.bounds.x + obj.bounds.width / 2;
      const centerY = obj.bounds.y + obj.bounds.height / 2;
      
      // 平移到中心点
      this.ctx.translate(centerX, centerY);
      
      // 应用旋转
      if (obj.transform.rotation !== 0) {
        this.ctx.rotate(obj.transform.rotation);
      }
      
      // 应用缩放
      if (obj.transform.scaleX !== 1 || obj.transform.scaleY !== 1) {
        this.ctx.scale(obj.transform.scaleX, obj.transform.scaleY);
      }
      
      // 平移回原点
      this.ctx.translate(-centerX, -centerY);
      
      // 应用额外的平移
      if (obj.transform.translateX !== 0 || obj.transform.translateY !== 0) {
        this.ctx.translate(obj.transform.translateX, obj.transform.translateY);
      }
    }
  }

  private setBasicStyles(options: DrawingOptions): void {
    this.ctx.strokeStyle = options.color;
    this.ctx.fillStyle = options.fillColor || options.color;
    this.ctx.lineWidth = options.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = options.opacity;
  }

  private setLineStyles(options: DrawingOptions): void {
    if (options.lineDash && options.lineDash.length > 0) {
      this.ctx.setLineDash(options.lineDash);
    } else {
      this.ctx.setLineDash([]);
    }
  }

  private setShadowStyles(options: DrawingOptions): void {
    if (options.shadowColor && options.shadowColor !== 'transparent' && options.shadowBlur && options.shadowBlur > 0) {
      this.ctx.shadowColor = options.shadowColor;
      this.ctx.shadowBlur = options.shadowBlur;
      this.ctx.shadowOffsetX = options.shadowOffsetX || 0;
      this.ctx.shadowOffsetY = options.shadowOffsetY || 0;
    } else {
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }
  }

  private resetStyles(): void {
    this.ctx.globalAlpha = 1;
    this.ctx.setLineDash([]);
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }

  private renderMultilineText(text: string, x: number, y: number, opts: DrawingOptions): void {
    const lines = text.split('\n');
    const lineHeight = opts.fontSize * 1.2;
    
    lines.forEach((line, index) => {
      const lineY = y + index * lineHeight;
      this.ctx.fillText(line, x, lineY);
    });
  }



  private renderTransformHandle(handle: TransformHandle): void {
    this.ctx.save();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#0066ff';
    this.ctx.lineWidth = 2;
    
    // 绘制手柄
    this.ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
    this.ctx.strokeRect(handle.x, handle.y, handle.width, handle.height);
    
    this.ctx.restore();
  }

  private renderLegacyObject(obj: DrawingObject): void {
    switch (obj.type) {
      case 'line':
        if (obj.endPoint) {
          this.ctx.beginPath();
          this.ctx.moveTo(obj.startPoint.x, obj.startPoint.y);
          this.ctx.lineTo(obj.endPoint.x, obj.endPoint.y);
          this.ctx.stroke();
        }
        break;
      
      case 'star':
        if (obj.endPoint) {
          const radius = Math.sqrt((obj.endPoint.x - obj.startPoint.x) ** 2 + (obj.endPoint.y - obj.startPoint.y) ** 2);
          this.drawStar(obj.startPoint.x, obj.startPoint.y, radius, 5);
        }
        break;
      
      case 'triangle':
        if (obj.endPoint) {
          this.drawTriangle(obj.startPoint, obj.endPoint);
        }
        break;
      
      case 'hand-drawn':
      case 'eraser':
      case 'highlighter':
        if (obj.points && obj.points.length > 0) {
          this.ctx.beginPath();
          this.ctx.moveTo(obj.points[0].x, obj.points[0].y);
          for (let i = 1; i < obj.points.length; i++) {
            this.ctx.lineTo(obj.points[i].x, obj.points[i].y);
          }
          this.ctx.stroke();
        }
        break;
    }
  }

  private drawStar(centerX: number, centerY: number, radius: number, points: number): void {
    this.ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const r = i % 2 === 0 ? radius : radius * 0.5;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }

  private drawTriangle(start: { x: number; y: number }, end: { x: number; y: number }): void {
    const width = end.x - start.x;
    const height = end.y - start.y;
    
    this.ctx.beginPath();
    this.ctx.moveTo(start.x + width / 2, start.y);
    this.ctx.lineTo(start.x, end.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.closePath();
    this.ctx.stroke();
  }
} 