import { DrawingObject, DrawingMode, Point, HandleType, TransformHandle } from '../core/types';
import { DrawingState } from '../state/DrawingState';
import { TextEditingState } from '../state/TextEditingState';
import { ToolManager } from '../plugins/ToolManager';

export class DrawingEventHandler {
  private canvas: HTMLCanvasElement;
  private drawingState: DrawingState;
  private textEditingState: TextEditingState;
  private toolManager: ToolManager;
  
  // 绘制状态
  private mode: DrawingMode = 'pen';
  private isDrawing = false;
  private startPoint: Point | null = null;
  private currentPoint: Point | null = null;
  private previewImageData: ImageData | null = null;
  private currentDrawingObject: DrawingObject | null = null;
  
  // 拖拽状态
  private isDragging = false;
  private dragOffset: Point = { x: 0, y: 0 };
  
  // 变换状态
  private transformHandles: TransformHandle[] = [];
  private activeHandle: TransformHandle | null = null;
  private isTransforming = false;
  private transformStartPoint: Point | null = null;
  private originalBounds: { x: number; y: number; width: number; height: number } | null = null;
  private originalTransform: any = null;
  
  // 路径状态
  private currentPath: Point[] = [];
  
  // 回调函数
  private onModeChange?: (mode: DrawingMode) => void;
  private onRedraw?: () => void;
  // 移除 inputHandler 相关声明

  constructor(
    canvas: HTMLCanvasElement,
    drawingState: DrawingState,
    textEditingState: TextEditingState,
    toolManager: ToolManager
  ) {
    this.canvas = canvas;
    this.drawingState = drawingState;
    this.textEditingState = textEditingState;
    this.toolManager = toolManager;
    this.setupEventListeners();
  }

  // 设置模式
  setMode(mode: DrawingMode): void {
    this.mode = mode;
    this.toolManager.setCurrentTool(mode);
    console.log('✏️ Mode set to:', mode);
    
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
  }

  // 设置回调
  setModeChangeCallback(callback: (mode: DrawingMode) => void): void {
    this.onModeChange = callback;
  }

  setRedrawCallback(callback: () => void): void {
    this.onRedraw = callback;
  }

  // 事件监听器设置
  private setupEventListeners(): void {
    // 设置canvas为可聚焦
    this.canvas.tabIndex = 0;
    this.canvas.style.outline = 'none';
    
    console.log('🔧 Setting up event listeners for canvas');
    
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
    // 移除 input 事件监听
    
    console.log('🔧 Event listeners set up, canvas tabIndex:', this.canvas.tabIndex);
  }

  // 鼠标事件处理
  private handleMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('🖱️ Mouse down at:', { x, y, mode: this.mode });
    
    // 检查是否点击了变换手柄
    const handle = this.getHandleAtPoint(x, y);
    if (handle) {
      this.startTransform(handle, x, y);
      return;
    }
    
      // 检查是否点击了对象
  const clickedObject = this.getObjectAtPoint(x, y);
  if (clickedObject) {
    this.drawingState.setSelectedObject(clickedObject);
    this.generateTransformHandles(clickedObject);
    
    // 如果是文本对象，进入编辑模式
    if (clickedObject.type === 'text') {
      console.log('📝 Text object clicked, entering edit mode');
      
      // 如果已经在编辑这个文本对象，不重复进入编辑模式
      if (this.textEditingState.isEditing() && this.drawingState.getSelectedObject() === clickedObject) {
        console.log('📝 Already editing this text object');
        return;
      }
      
      // 如果之前在编辑其他文本对象，先完成编辑
      if (this.textEditingState.isEditing()) {
        console.log('📝 Finishing previous text editing');
        this.finishTextEditing();
      }
      
      // 设置选择对象并进入编辑模式
      this.drawingState.setSelectedObject(clickedObject);
      this.textEditingState.startEditing(clickedObject);
      this.canvas.focus();
      
      console.log('📝 Text editing started, canvas focused');
      if (this.onRedraw) this.onRedraw();
      return;
    }
    
    // 对于其他对象，开始拖拽
    this.isDragging = true;
    this.dragOffset = {
      x: x - clickedObject.startPoint.x,
      y: y - clickedObject.startPoint.y
    };
    
    if (this.onRedraw) this.onRedraw();
    return;
  }
    
    // 清除选择
    this.drawingState.setSelectedObject(null);
    this.transformHandles = [];
    
    // 开始绘制
    this.startDrawing(x, y);
  }

  private handleMouseMove(e: MouseEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    this.currentPoint = { x, y };
    
    if (this.isDragging && this.drawingState.getSelectedObject()) {
      this.moveSelectedObject(x, y);
      return;
    }
    
    if (this.isTransforming && this.activeHandle) {
      this.performTransform(x, y);
      return;
    }
    
    if (this.isDrawing) {
      this.continueDrawing(x, y);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    e.preventDefault();
    
    if (this.isDragging) {
      this.isDragging = false;
      return;
    }
    
    if (this.isTransforming) {
      this.endTransform();
      return;
    }
    
    if (this.isDrawing) {
      this.stopDrawing();
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const clickedObject = this.getObjectAtPoint(x, y);
    
    if (clickedObject && clickedObject.type === 'text') {
      this.textEditingState.startEditing(clickedObject);
      this.drawingState.setSelectedObject(clickedObject);
      this.canvas.focus(); // 确保canvas获得焦点
      if (this.onRedraw) this.onRedraw();
    } else if (this.mode === 'select' && !clickedObject) {
      this.createTextAtPoint(x, y);
    }
  }

  // 键盘事件处理
  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.textEditingState.isEditing()) {
      // 非编辑状态下处理全局快捷键
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          this.deleteSelected();
          break;
        case 'Escape':
          this.cancelTextEditing();
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
          }
          break;
        case 'c':
          if (e.ctrlKey || e.metaKey) {
            this.copySelected();
          }
          break;
        case 'v':
          if (e.ctrlKey || e.metaKey) {
            this.paste();
          }
          break;
        case 'x':
          if (e.ctrlKey || e.metaKey) {
            this.cutSelected();
          }
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            this.selectAll();
          }
          break;
      }
      return;
    }
    // 编辑状态下
    if (e.ctrlKey || e.metaKey || e.altKey) {
      // 支持快捷键
      return;
    }
    switch (e.key) {
      case 'Enter':
        if (e.shiftKey) {
          this.textEditingState.insertCharacter('\n');
          this.updateTextObject();
          this.onRedraw?.();
        } else {
          this.finishTextEditing();
        }
        e.preventDefault();
        break;
      case 'Escape':
        this.cancelTextEditing();
        e.preventDefault();
        break;
      case 'Backspace':
        this.textEditingState.deleteCharacter();
        this.updateTextObject();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case 'Delete':
        this.textEditingState.deleteCharacterForward();
        this.updateTextObject();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case 'ArrowLeft':
        this.textEditingState.moveCursorLeft();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case 'ArrowRight':
        this.textEditingState.moveCursorRight();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case 'ArrowUp':
        this.textEditingState.moveCursorUp();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case 'ArrowDown':
        this.textEditingState.moveCursorDown();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case 'Home':
        this.textEditingState.moveCursorToStart();
        this.onRedraw?.();
        e.preventDefault();
        break;
      case 'End':
        this.textEditingState.moveCursorToEnd();
        this.onRedraw?.();
        e.preventDefault();
        break;
      default:
        // 只允许英文、数字、符号
        if (e.key.length === 1 && /^[\x20-\x7E]$/.test(e.key)) {
          this.textEditingState.insertCharacter(e.key);
          this.updateTextObject();
          this.onRedraw?.();
          e.preventDefault();
        }
        // 其他情况不处理
        break;
    }
  }

  // 触摸事件处理
  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this.startDrawing(x, y);
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if ((!this.isDrawing && !this.isDragging) || e.touches.length === 0) return;
    
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    this.continueDrawing(x, y);
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    this.stopDrawing();
  }

  // 绘制相关方法
  private startDrawing(x: number, y: number): void {
    console.log('🎨 Starting drawing at:', { x, y, mode: this.mode });
    
    this.startPoint = { x, y };
    this.currentPoint = { x, y };
    this.isDrawing = true;
    this.currentPath = [{ x, y }];
    
    // 对于select模式，不进行绘制操作
    if (this.mode === 'select') {
      this.isDrawing = false;
      this.startPoint = null;
      this.currentPoint = null;
      return;
    }
    
    const tool = this.toolManager.getTool(this.mode);
    if (tool) {
      const context = {
        ctx: this.canvas.getContext('2d')!,
        canvas: this.canvas,
        options: this.drawingState.getOptions(),
        generateId: () => this.generateId(),
        redrawCanvas: () => this.onRedraw?.(),
        saveState: () => {}
      };
      
      const startObject = tool.startDrawing({ x, y }, context);
      if (startObject) {
        this.currentDrawingObject = startObject;
        console.log('🎨 Drawing object created:', startObject.type);
        
        // 对于不需要拖拽的工具，立即完成绘制
        if (!tool.requiresDrag) {
          const finishedObject = tool.finishDrawing({ x, y }, startObject, context);
          if (finishedObject) {
            this.drawingState.addObject(finishedObject);
            console.log('🎨 Object added to canvas:', finishedObject.type);
            
            // 处理文本编辑
            if (finishedObject.type === 'text' && (finishedObject as any).__shouldStartEditing) {
              console.log('📝 Starting text editing for new text object');
              this.textEditingState.startEditing(finishedObject);
              this.drawingState.setSelectedObject(finishedObject);
              this.canvas.focus(); // 确保canvas获得焦点
              this.onRedraw?.();
            }
            
            this.onRedraw?.();
          }
          
          this.currentDrawingObject = null;
          this.isDrawing = false;
          this.startPoint = null;
          this.currentPoint = null;
        }
      } else {
        console.warn('🎨 Failed to create drawing object for mode:', this.mode);
        this.isDrawing = false;
        this.startPoint = null;
        this.currentPoint = null;
      }
    } else {
      console.warn('🎨 Tool not found for mode:', this.mode);
      this.isDrawing = false;
      this.startPoint = null;
      this.currentPoint = null;
    }
  }

  private continueDrawing(x: number, y: number): void {
    if (this.isDragging && this.drawingState.getSelectedObject()) {
      this.moveSelectedObject(x, y);
      return;
    }
    
    if (!this.isDrawing || !this.currentDrawingObject || !this.startPoint) {
      return;
    }
    
    this.currentPoint = { x, y };
    this.currentPath.push({ x, y });
    
    const tool = this.toolManager.getTool(this.mode);
    if (tool) {
      const context = {
        ctx: this.canvas.getContext('2d')!,
        canvas: this.canvas,
        options: this.drawingState.getOptions(),
        generateId: () => this.generateId(),
        redrawCanvas: () => this.onRedraw?.(),
        saveState: () => {}
      };
      
      // 对于需要拖拽的工具，使用updateDrawing
      if (tool.requiresDrag) {
        const updatedObject = tool.updateDrawing({ x, y }, this.currentDrawingObject, context);
        if (updatedObject) {
          this.currentDrawingObject = updatedObject;
          this.onRedraw?.();
        }
      } else {
        // 对于不需要拖拽的工具（如画笔），使用continueDrawing来实时绘制
        tool.continueDrawing({ x, y }, this.currentDrawingObject, context);
        this.onRedraw?.();
      }
    }
  }

  private stopDrawing(): void {
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    const tool = this.toolManager.getTool(this.mode);
    if (tool && this.currentDrawingObject && this.currentPoint) {
      const context = {
        ctx: this.canvas.getContext('2d')!,
        canvas: this.canvas,
        options: this.drawingState.getOptions(),
        generateId: () => this.generateId(),
        redrawCanvas: () => this.onRedraw?.(),
        saveState: () => {}
      };
      
      const finishedObject = tool.finishDrawing(this.currentPoint, this.currentDrawingObject, context);
      if (finishedObject) {
        this.drawingState.addObject(finishedObject);
        
        if ((finishedObject as any).__shouldStartEditing && finishedObject.type === 'text') {
          delete (finishedObject as any).__shouldStartEditing;
          setTimeout(() => {
            this.textEditingState.startEditing(finishedObject);
            this.drawingState.setSelectedObject(finishedObject);
            this.canvas.focus(); // 确保canvas获得焦点
            this.onRedraw?.();
          }, 10);
        }
        
        this.onRedraw?.();
      }
    }
    
    this.currentDrawingObject = null;
    this.startPoint = null;
    this.currentPoint = null;
  }

  // 文本相关方法
  // handleTextInput 方法已删除，逻辑已整合到 handleKeyDown 中

  // 移除 handleInput 方法

  private finishTextEditing(): void {
    const newText = this.textEditingState.finishEditing();
    const selectedObject = this.drawingState.getSelectedObject();
    
    if (selectedObject && selectedObject.type === 'text') {
      selectedObject.text = newText;
      
      // 使用TextTool重新计算边界
      const tool = this.toolManager.getTool('text');
      if (tool) {
        const context = {
          ctx: this.canvas.getContext('2d')!,
          canvas: this.canvas,
          options: selectedObject.options,
          generateId: () => '',
          redrawCanvas: () => {},
          saveState: () => {}
        };
        selectedObject.bounds = tool.calculateBounds(selectedObject, context);
      } else {
        this.recalculateTextBounds(selectedObject);
      }
      
      this.onRedraw?.();
    }
  }

  private cancelTextEditing(): void {
    this.textEditingState.cancelEditing();
    this.onRedraw?.();
  }

  private updateTextObject(): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject && selectedObject.type === 'text') {
      selectedObject.text = this.textEditingState.getEditingText();
      
      // 使用TextTool重新计算边界
      const tool = this.toolManager.getTool('text');
      if (tool) {
        const context = {
          ctx: this.canvas.getContext('2d')!,
          canvas: this.canvas,
          options: selectedObject.options,
          generateId: () => '',
          redrawCanvas: () => {},
          saveState: () => {}
        };
        selectedObject.bounds = tool.calculateBounds(selectedObject, context);
      } else {
        this.recalculateTextBounds(selectedObject);
      }
    }
  }

  // 工具方法
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // isCharacterInput 方法已删除，逻辑已整合到 handleKeyDown 中

  private getObjectAtPoint(x: number, y: number): DrawingObject | null {
    const objects = this.drawingState.getObjects();
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      if (this.isPointInObject(x, y, obj)) {
        return obj;
      }
    }
    return null;
  }

  private isPointInObject(x: number, y: number, obj: DrawingObject): boolean {
    return x >= obj.bounds.x && 
           x <= obj.bounds.x + obj.bounds.width &&
           y >= obj.bounds.y && 
           y <= obj.bounds.y + obj.bounds.height;
  }

  private moveSelectedObject(x: number, y: number): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (!selectedObject) return;
    
    const newX = x - this.dragOffset.x;
    const newY = y - this.dragOffset.y;
    
    selectedObject.startPoint.x = newX;
    selectedObject.startPoint.y = newY;
    if (selectedObject.endPoint) {
      selectedObject.endPoint.x = newX + selectedObject.bounds.width;
      selectedObject.endPoint.y = newY + selectedObject.bounds.height;
    }
    
    // 对于文本对象，需要重新计算边界
    if (selectedObject.type === 'text') {
      const tool = this.toolManager.getTool('text');
      if (tool) {
        const context = {
          ctx: this.canvas.getContext('2d')!,
          canvas: this.canvas,
          options: selectedObject.options,
          generateId: () => '',
          redrawCanvas: () => {},
          saveState: () => {}
        };
        selectedObject.bounds = tool.calculateBounds(selectedObject, context);
      } else {
        // 后备方案：直接更新边界位置
        selectedObject.bounds.x = newX;
        selectedObject.bounds.y = newY;
      }
    } else {
      selectedObject.bounds.x = newX;
      selectedObject.bounds.y = newY;
    }
    
    this.onRedraw?.();
  }

  private createTextAtPoint(x: number, y: number): void {
    const textObject: DrawingObject = {
      id: this.generateId(),
      type: 'text',
      startPoint: { x, y },
      text: '',
      options: this.drawingState.getOptions(),
      bounds: {
        x: x,
        y: y - this.drawingState.getOptions().fontSize / 2,
        width: 0,
        height: this.drawingState.getOptions().fontSize
      }
    };
    
    this.drawingState.addObject(textObject);
    this.textEditingState.startEditing(textObject);
    this.drawingState.setSelectedObject(textObject);
    this.canvas.focus(); // 确保canvas获得焦点
    this.onRedraw?.();
  }

  private recalculateTextBounds(textObject: DrawingObject): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.font = `${textObject.options.fontWeight || 'normal'} ${textObject.options.fontSize}px ${textObject.options.fontFamily || 'Arial'}`;
    const textMetrics = ctx.measureText(textObject.text || '');
    const textWidth = textMetrics.width;
    const textHeight = textObject.options.fontSize * 1.2;
    
    const textAlign = textObject.options.textAlign || 'left';
    let x = textObject.startPoint.x;
    
    if (textAlign === 'center') {
      x = textObject.startPoint.x - textWidth / 2;
    } else if (textAlign === 'right') {
      x = textObject.startPoint.x - textWidth;
    }
    
    textObject.bounds = {
      x: x,
      y: textObject.startPoint.y - textHeight / 2,
      width: textWidth,
      height: textHeight
    };
  }

  // 变换相关方法
  private generateTransformHandles(obj: DrawingObject): void {
    const handleSize = 8;
    const padding = 5;
    
    this.transformHandles = [
      { type: HandleType.TOP_LEFT, x: obj.bounds.x - padding, y: obj.bounds.y - padding, width: handleSize, height: handleSize },
      { type: HandleType.TOP_RIGHT, x: obj.bounds.x + obj.bounds.width + padding - handleSize, y: obj.bounds.y - padding, width: handleSize, height: handleSize },
      { type: HandleType.BOTTOM_LEFT, x: obj.bounds.x - padding, y: obj.bounds.y + obj.bounds.height + padding - handleSize, width: handleSize, height: handleSize },
      { type: HandleType.BOTTOM_RIGHT, x: obj.bounds.x + obj.bounds.width + padding - handleSize, y: obj.bounds.y + obj.bounds.height + padding - handleSize, width: handleSize, height: handleSize },
      { type: HandleType.TOP, x: obj.bounds.x + obj.bounds.width / 2 - handleSize / 2, y: obj.bounds.y - padding, width: handleSize, height: handleSize },
      { type: HandleType.BOTTOM, x: obj.bounds.x + obj.bounds.width / 2 - handleSize / 2, y: obj.bounds.y + obj.bounds.height + padding - handleSize, width: handleSize, height: handleSize },
      { type: HandleType.LEFT, x: obj.bounds.x - padding, y: obj.bounds.y + obj.bounds.height / 2 - handleSize / 2, width: handleSize, height: handleSize },
      { type: HandleType.RIGHT, x: obj.bounds.x + obj.bounds.width + padding - handleSize, y: obj.bounds.y + obj.bounds.height / 2 - handleSize / 2, width: handleSize, height: handleSize },
      { type: HandleType.ROTATE, x: obj.bounds.x + obj.bounds.width / 2 - handleSize / 2, y: obj.bounds.y - 30, width: handleSize, height: handleSize }
    ];
  }

  private getHandleAtPoint(x: number, y: number): TransformHandle | null {
    return this.transformHandles.find(handle => 
      x >= handle.x && x <= handle.x + handle.width &&
      y >= handle.y && y <= handle.y + handle.height
    ) || null;
  }

  private startTransform(handle: TransformHandle, x: number, y: number): void {
    this.activeHandle = handle;
    this.isTransforming = true;
    this.transformStartPoint = { x, y };
    
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject) {
      this.originalBounds = { ...selectedObject.bounds };
      this.originalTransform = selectedObject.transform ? { ...selectedObject.transform } : null;
    }
  }

  private performTransform(x: number, y: number): void {
    if (!this.activeHandle || !this.transformStartPoint || !this.drawingState.getSelectedObject()) return;
    
    const selectedObject = this.drawingState.getSelectedObject()!;
    const deltaX = x - this.transformStartPoint.x;
    const deltaY = y - this.transformStartPoint.y;
    
    // 根据手柄类型执行不同的变换
    switch (this.activeHandle.type) {
      case HandleType.TOP_LEFT:
        this.resizeObject(-deltaX, -deltaY, 0, 0);
        break;
      case HandleType.TOP_RIGHT:
        this.resizeObject(0, -deltaY, deltaX, 0);
        break;
      case HandleType.BOTTOM_LEFT:
        this.resizeObject(-deltaX, 0, 0, deltaY);
        break;
      case HandleType.BOTTOM_RIGHT:
        this.resizeObject(0, 0, deltaX, deltaY);
        break;
      case HandleType.ROTATE:
        this.rotateObject(x, y);
        break;
    }
    
    this.transformStartPoint = { x, y };
    this.onRedraw?.();
  }

  private endTransform(): void {
    this.isTransforming = false;
    this.activeHandle = null;
    this.transformStartPoint = null;
    this.originalBounds = null;
    this.originalTransform = null;
  }

  private resizeObject(leftDelta: number, topDelta: number, rightDelta: number, bottomDelta: number): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (!selectedObject || !this.originalBounds) return;
    
    const newBounds = {
      x: this.originalBounds.x + leftDelta,
      y: this.originalBounds.y + topDelta,
      width: this.originalBounds.width + rightDelta - leftDelta,
      height: this.originalBounds.height + bottomDelta - topDelta
    };
    
    selectedObject.bounds = newBounds;
    selectedObject.startPoint.x = newBounds.x;
    selectedObject.startPoint.y = newBounds.y;
    if (selectedObject.endPoint) {
      selectedObject.endPoint.x = newBounds.x + newBounds.width;
      selectedObject.endPoint.y = newBounds.y + newBounds.height;
    }
  }

  private rotateObject(mouseX: number, mouseY: number): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (!selectedObject) return;
    
    const centerX = selectedObject.bounds.x + selectedObject.bounds.width / 2;
    const centerY = selectedObject.bounds.y + selectedObject.bounds.height / 2;
    
    const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    
    if (!selectedObject.transform) {
      selectedObject.transform = { rotation: 0, scaleX: 1, scaleY: 1, translateX: 0, translateY: 0 };
    }
    
    selectedObject.transform.rotation = angle;
  }

  // 预览方法
  private showPreview(start: Point, end: Point): void {
    // 实现预览逻辑
  }

  // 操作方法
  private deleteSelected(): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject) {
      this.drawingState.removeObject(selectedObject);
      this.drawingState.setSelectedObject(null);
      this.transformHandles = [];
      this.onRedraw?.();
    }
  }

  private undo(): void {
    if (this.drawingState.undo()) {
      this.onRedraw?.();
    }
  }

  private redo(): void {
    if (this.drawingState.redo()) {
      this.onRedraw?.();
    }
  }

  private copySelected(): void {
    const selectedObject = this.drawingState.getSelectedObject();
    if (selectedObject) {
      this.drawingState.setClipboard(this.cloneObject(selectedObject));
    }
  }

  private paste(): void {
    const clipboard = this.drawingState.getClipboard();
    if (clipboard) {
      const newObj = this.cloneObject(clipboard);
      newObj.startPoint.x += 20;
      newObj.startPoint.y += 20;
      newObj.bounds.x += 20;
      newObj.bounds.y += 20;
      newObj.id = this.generateId();
      
      this.drawingState.addObject(newObj);
      this.drawingState.setSelectedObject(newObj);
      this.onRedraw?.();
    }
  }

  private cutSelected(): void {
    this.copySelected();
    this.deleteSelected();
  }

  private selectAll(): void {
    const objects = this.drawingState.getObjects();
    if (objects.length > 0) {
      this.drawingState.setSelectedObject(objects[objects.length - 1]);
      this.onRedraw?.();
    }
  }

  private cloneObject(obj: DrawingObject): DrawingObject {
    return {
      id: obj.id,
      type: obj.type,
      startPoint: { ...obj.startPoint },
      endPoint: obj.endPoint ? { ...obj.endPoint } : undefined,
      points: obj.points ? obj.points.map(p => ({ ...p })) : undefined,
      text: obj.text,
      options: { ...obj.options },
      bounds: { ...obj.bounds },
      transform: obj.transform ? { ...obj.transform } : undefined
    };
  }

  // 获取状态
  getTransformHandles(): TransformHandle[] {
    return this.transformHandles;
  }

  getCurrentDrawingObject(): DrawingObject | null {
    return this.currentDrawingObject;
  }

  isTextEditing(): boolean {
    return this.textEditingState.isEditing();
  }

  // 清理资源
  destroy(): void {
    this.textEditingState.destroy();
    // 移除 input 事件监听相关代码
  }
} 