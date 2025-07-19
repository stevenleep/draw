import { ToolManager } from './plugins/ToolManager';
import type { ToolPlugin } from './plugins/ToolPlugin';

export type DrawingMode = 'select' | 'pen' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'hand-drawn' | 'line' | 'eraser' | 'highlighter' | 'star' | 'triangle';

export interface DrawingOptions {
  color: string;
  strokeColor?: string;
  strokeWidth: number;
  fontSize: number;
  roughness: number;
  opacity: number;
  fillColor?: string;
  hasFill: boolean;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  lineDash?: number[];
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface DrawingObject {
  id: string;
  type: DrawingMode;
  startPoint: { x: number; y: number };
  endPoint?: { x: number; y: number };
  points?: { x: number; y: number }[];
  text?: string;
  options: DrawingOptions;
  bounds: { x: number; y: number; width: number; height: number };
  // 变换属性
  transform?: {
    rotation: number; // 旋转角度（弧度）
    scaleX: number;   // X轴缩放
    scaleY: number;   // Y轴缩放
    translateX: number; // X轴偏移
    translateY: number; // Y轴偏移
  };
}

// 控制手柄类型
export enum HandleType {
  TOP_LEFT = 'top-left',
  TOP_RIGHT = 'top-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_RIGHT = 'bottom-right',
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
  ROTATE = 'rotate'
}

export interface TransformHandle {
  type: HandleType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export class DrawingEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mode: DrawingMode = 'pen';
  private options: DrawingOptions = {
    color: '#ff0000',
    strokeWidth: 5,
    fontSize: 16,
    roughness: 1,
    opacity: 1,
    hasFill: false,
    strokeColor: '#ff0000',
    fontFamily: 'Arial',
    fontWeight: 'normal',
    textAlign: 'center',
    lineDash: [],
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0
  };
  private isDrawing = false;
  private startPoint: { x: number; y: number } | null = null;
  private currentPoint: { x: number; y: number } | null = null;
  private previewImageData: ImageData | null = null;
  private drawingObjects: DrawingObject[] = [];
  private selectedObject: DrawingObject | null = null;
  private isDragging = false;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private isEditingText = false;
  private clipboard: DrawingObject | null = null;
  
  // 直接文本编辑相关
  private editingText = '';
  private textCursorPosition = 0;
  private textCursorVisible = true;
  private textCursorBlinkTimer: number | null = null;
  
  // 变换控制相关
  private transformHandles: TransformHandle[] = [];
  private activeHandle: TransformHandle | null = null;
  private isTransforming = false;
  private transformStartPoint: { x: number; y: number } | null = null;
  private originalBounds: { x: number; y: number; width: number; height: number } | null = null;
  private originalTransform: any = null;
  
  private currentPath: { x: number; y: number }[] = []; // 当前画笔路径
  private history: DrawingObject[][] = [];
  private historyStep: number = -1;
  private maxHistorySize: number = 50;
  
  // 插件系统相关
  private toolManager: ToolManager;
  private currentDrawingObject: DrawingObject | null = null; // 当前正在绘制的对象
  
  // 模式变化回调
  private onModeChange?: (mode: DrawingMode) => void;

  // 性能优化相关
  private redrawScheduled = false;
  private lastRedrawTime = 0;
  private redrawThrottleMs = 16; // ~60fps
  private isMouseMoving = false;
  private mouseMoveThrottleMs = 8; // ~120fps for mouse movement
  private lastMouseMoveTime = 0;

  constructor(canvasElement: HTMLCanvasElement) {
    console.log('🎨 Creating SIMPLE native canvas drawing engine');
    
    this.canvas = canvasElement;
    const context = canvasElement.getContext('2d', { 
      willReadFrequently: true,
      alpha: true,
      desynchronized: true // 性能优化：减少同步开销
    });
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;
    
    // 性能优化：启用硬件加速
    this.canvas.style.transform = 'translateZ(0)';
    this.canvas.style.backfaceVisibility = 'hidden';
    
    // 初始化插件系统
    this.toolManager = new ToolManager();
    
    // 初始化干净的画布
    this.clear();
    
    // 保存初始状态
    this.saveState();
    
    console.log('🔴 Drawing engine ready');
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('keydown', this.handleKeyDown.bind(this));
    // 让canvas可以获取焦点
    this.canvas.tabIndex = 0;
    // canvas 获得焦点时高亮边框
    this.canvas.style.outline = 'none';
    this.canvas.addEventListener('focus', () => {
      this.canvas.style.outline = '2px solid #18a0fb';
    });
    this.canvas.addEventListener('blur', () => {
      this.canvas.style.outline = 'none';
    });
    // 编辑文本时点击画布空白处自动完成编辑
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.isEditingText) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // 如果点击不在当前文本对象区域，完成编辑
        if (!this.selectedObject || this.selectedObject.type !== 'text' || !this.isPointInObject(x, y, this.selectedObject)) {
          this.finishTextEditing();
        }
      }
    }, true);
    console.log('🎯 Event listeners attached');
  }

  private handleKeyDown(e: KeyboardEvent): void {
    console.log("=====================================")
    console.log('🔤 Key down event:', e);
    console.log("=====================================")
    
    // 如果正在编辑文本，处理文本输入
    if (this.isEditingText) {
      this.handleTextInput(e);
      return;
    }
    
    // 只有当canvas获得焦点时才处理键盘事件
    if (document.activeElement === this.canvas) {
      const isCtrl = e.ctrlKey || e.metaKey; // 支持Mac的Cmd键
      const isShift = e.shiftKey;
      
      switch (e.key.toLowerCase()) {
        case 'delete':
        case 'backspace':
          e.preventDefault();
          this.deleteSelected();
          break;
          
        case 'escape':
          e.preventDefault();
          this.selectedObject = null;
          this.redrawCanvas();
          break;
          
        case 'c':
          if (isCtrl) {
            e.preventDefault();
            this.copySelected();
          }
          break;
          
        case 'v':
          if (isCtrl) {
            e.preventDefault();
            this.paste();
          }
          break;
          
        case 'x':
          if (isCtrl) {
            e.preventDefault();
            this.cutSelected();
          }
          break;
          
        case 'd':
          if (isCtrl) {
            e.preventDefault();
            this.duplicateSelected();
          }
          break;
          
        case 'a':
          if (isCtrl) {
            e.preventDefault();
            this.selectAll();
          }
          break;
          
        case 'z':
          if (isCtrl && !isShift) {
            e.preventDefault();
            this.undo();
          } else if (isCtrl && isShift) {
            e.preventDefault();
            this.redo();
          }
          break;
          
        case 'y':
          if (isCtrl) {
            e.preventDefault();
            this.redo();
          }
          break;
          
        case 'enter':
          if (this.selectedObject && this.selectedObject.type === 'text') {
            e.preventDefault();
            this.startTextEditing(this.selectedObject);
          }
          break;
        
        // 数字键快速切换工具
        case '1':
          e.preventDefault();
          this.setMode('pen');
          break;
        case '2':
          e.preventDefault();
          this.setMode('arrow');
          break;
        case '3':
          e.preventDefault();
          this.setMode('rectangle');
          break;
        case '4':
          e.preventDefault();
          this.setMode('circle');
          break;
        case '5':
          e.preventDefault();
          this.setMode('text');
          break;
        case '6':
          e.preventDefault();
          this.setMode('hand-drawn');
          break;
        case '7':
          e.preventDefault();
          this.setMode('line');
          break;
        case '8':
          e.preventDefault();
          this.setMode('eraser');
          break;
        case '9':
          e.preventDefault();
          this.setMode('highlighter');
          break;
          
        case 'arrowup':
          e.preventDefault();
          this.moveSelectedBy(0, -1);
          break;
          
        case 'arrowdown':
          e.preventDefault();
          this.moveSelectedBy(0, 1);
          break;
          
        case 'arrowleft':
          e.preventDefault();
          this.moveSelectedBy(-1, 0);
          break;
          
        case 'arrowright':
          e.preventDefault();
          this.moveSelectedBy(1, 0);
          break;
      }
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    console.log('Mouse down event:', this.drawingObjects);
    // 检查是否点击在UI面板上，如果是则不处理绘图事件
    const target = e.target as HTMLElement;
    if (target && (
      target.closest('.figma-property-panel') ||
      target.closest('#drawing-toolbar-overlay') ||
      target.closest('.figma-toolbar-content') ||
      target.closest('.figma-toolbar-section') ||
      target.closest('.figma-toolbar-group') ||
      target.closest('.figma-toolbar-properties') ||
      target.closest('.figma-settings-panel') ||
      target.closest('.shape-dropdown') ||
      target.classList.contains('figma-tool-btn') ||
      target.classList.contains('shape-btn') ||
      target.classList.contains('props-input') ||
      target.classList.contains('props-group')
    )) {
      console.log('🔧 UI element clicked, ignoring drawing event');
      return; // 不处理UI元素上的点击
    }

    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 如果正在编辑文本，点击其他地方完成编辑
    if (this.isEditingText) {
      this.finishTextEditing();
      return;
    }
    
    // 如果有选中对象，先检查是否点击了变换手柄
    if (this.selectedObject) {
      const handle = this.getHandleAtPoint(x, y);
      if (handle) {
        this.startTransform(handle, x, y);
        this.redrawCanvas();
        return;
      }
    }
    
    // 检查是否点击了已有对象
    const clickedObject = this.getObjectAtPoint(x, y);
    
    if (clickedObject) {
      // 选中对象
      this.selectedObject = clickedObject;
      console.log('🎯 Selected object:', clickedObject.type, clickedObject.id);
      
      // 准备拖拽
      this.isDragging = true;
      this.dragOffset = {
        x: x - clickedObject.startPoint.x,
        y: y - clickedObject.startPoint.y
      };
      
      this.redrawCanvas();
    } else {
      // 开始新的绘制
      this.selectedObject = null;
      this.startDrawing(x, y);
    }
    
    console.log('🖱️ Mouse down at:', x, y);
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 性能优化：节流鼠标移动事件
    const now = performance.now();
    if (now - this.lastMouseMoveTime < this.mouseMoveThrottleMs) {
      return;
    }
    this.lastMouseMoveTime = now;
    
    // 如果正在变换操作
    if (this.isTransforming) {
      e.preventDefault();
      this.performTransform(x, y);
      return;
    }
    
    // 如果没有正在绘制或拖拽，检查鼠标悬停的手柄以更新光标
    if (!this.isDrawing && !this.isDragging && this.selectedObject) {
      const handle = this.getHandleAtPoint(x, y);
      if (handle) {
        this.updateCursor(handle.type);
      } else {
        this.canvas.style.cursor = 'default';
      }
      return;
    }
    
    if (!this.isDrawing && !this.isDragging) return;
    
    e.preventDefault();
    this.continueDrawing(x, y);
  }

  private handleMouseUp(): void {
    if (this.isTransforming) {
      this.endTransform();
    } else {
      this.stopDrawing();
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    console.log('🖱️ Double click detected!');
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log('🎯 Double click position:', { x, y });
    
    const clickedObject = this.getObjectAtPoint(x, y);
    console.log('🔍 Clicked object:', clickedObject);
    
    if (clickedObject && clickedObject.type === 'text') {
      console.log('📝 Starting text editing for:', clickedObject);
      // 编辑现有文字
      this.startTextEditing(clickedObject);
    } else if (this.mode === 'select' && !clickedObject) {
      console.log('➕ Creating new text at point (Figma style)');
      // Figma风格：在选择模式下双击空白处创建文字
      this.createTextAtPoint(x, y);
    }
  }

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

  private startDrawing(x: number, y: number): void {
    this.startPoint = { x, y };
    console.log('🎯 StartDrawing at:', x, y);
    
    // 对于select模式，不进行绘制操作
    if (this.mode === 'select') {
      console.log('🎯 Select mode - no drawing operation');
      this.isDrawing = false;
      this.startPoint = null;
      return;
    }
    
    // 开始新的绘制
    this.isDrawing = true;
    
    // 保存当前画布状态用于预览
    this.previewImageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    // 设置画笔属性
    this.ctx.strokeStyle = this.options.color;
    this.ctx.fillStyle = this.options.fillColor || this.options.color;
    this.ctx.lineWidth = this.options.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = this.options.opacity;
    
    // 设置特殊模式的合成模式
    if (this.mode === 'eraser') {
      this.ctx.globalCompositeOperation = 'destination-out';
    } else if (this.mode === 'highlighter') {
      this.ctx.globalCompositeOperation = 'multiply';
      this.ctx.globalAlpha = 0.3;
    } else {
      this.ctx.globalCompositeOperation = 'source-over';
    }
    
    console.log(`🎨 开始${this.mode}模式绘画，坐标: (${x}, ${y})`);
    
    // 使用插件系统处理开始绘制
    const tool = this.toolManager.getTool(this.mode);
    if (tool) {
      const context = {
        ctx: this.ctx,
        canvas: this.canvas,
        options: this.options,
        generateId: () => this.generateId(),
        redrawCanvas: () => this.redrawCanvas(),
        saveState: () => this.saveState()
      };
      
      const startObject = tool.startDrawing({ x, y }, context);
      if (startObject) {
        this.currentDrawingObject = startObject;
        
        // 对于不需要拖拽的工具（如文本），立即完成绘制
        if (!tool.requiresDrag) {
          console.log(`🔤 Tool ${tool.name} doesn't require drag, finishing immediately`);
          
          const finishedObject = tool.finishDrawing({ x, y }, startObject, context);
          if (finishedObject) {
            this.drawingObjects.push(finishedObject);
            
            // 检查是否是需要立即编辑的文本对象（Figma风格）
            if ((finishedObject as any).__shouldStartEditing && finishedObject.type === 'text') {
              console.log('🔤 Starting immediate text editing (Figma style)');
              delete (finishedObject as any).__shouldStartEditing; // 清理临时标记
              
              // 延迟一点点来确保对象已经完全创建
              setTimeout(() => {
                this.startTextEditing(finishedObject);
              }, 10);
            }
            
            this.saveState(); // 保存状态
            this.redrawCanvas();
          }
          
          this.currentDrawingObject = null;
          this.isDrawing = false;
          this.startPoint = null;
          return;
        }
      }
      
      // 注意：即使对于不需要拖拽的工具，我们仍然保持isDrawing=true
      // 直到鼠标抬起时才完成绘制
    } else {
      // 后备方案：处理不在插件系统中的工具
      this.handleLegacyStartDrawing(x, y);
    }
  }

  private handleLegacyStartDrawing(x: number, y: number): void {
    if (this.mode === 'pen' || this.mode === 'eraser' || this.mode === 'highlighter') {
      // 画笔模式：开始连续线条
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      
      // 初始化路径数组
      this.currentPath = [{ x, y }];
      
      // 画一个起始点，让单击也能看到效果
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.options.strokeWidth / 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // 重新开始路径用于连续线条
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
    } else if (this.mode === 'text') {
      // Figma风格文本模式：直接创建并进入编辑
      this.createTextAtPoint(x, y);
      this.isDrawing = false;
      this.startPoint = null;
    }
    // 其他模式（矩形、圆形、箭头）等待拖拽完成
  }

  private continueDrawing(x: number, y: number): void {
    this.currentPoint = { x, y }; // 记录当前位置
    
    if (this.isDragging && this.selectedObject) {
      // 拖拽选中的对象 - 性能优化：减少重绘频率
      const newX = x - this.dragOffset.x;
      const newY = y - this.dragOffset.y;
      
      this.moveObject(this.selectedObject, newX, newY);
      
      // 只在必要时重绘，避免过度重绘
      if (!this.redrawScheduled) {
        this.redrawScheduled = true;
        requestAnimationFrame(() => {
          this.performRedraw();
          this.redrawScheduled = false;
        });
      }
      return;
    }
    
    // 对于需要拖拽的工具，显示实时预览
    if (this.startPoint && this.previewImageData) {
      this.showPreview(this.startPoint, { x, y });
      return;
    }
    
    // 使用插件系统处理继续绘制（主要用于不需要拖拽的工具）
    const tool = this.toolManager.getTool(this.mode);
    if (tool && this.currentDrawingObject && !tool.requiresDrag) {
      const context = {
        ctx: this.ctx,
        canvas: this.canvas,
        options: this.options,
        generateId: () => this.generateId(),
        redrawCanvas: () => this.redrawCanvas(),
        saveState: () => this.saveState()
      };
      
      tool.continueDrawing({ x, y }, this.currentDrawingObject, context);
    } else {
      // 后备方案：处理不在插件系统中的工具
      this.handleLegacyContinueDrawing(x, y);
    }
  }

  private handleLegacyContinueDrawing(x: number, y: number): void {
    if (this.mode === 'pen' || this.mode === 'hand-drawn') {
      // 画笔模式：绘制连续线条
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      
      // 收集路径点
      this.currentPath.push({ x, y });
    } else if (this.mode === 'eraser') {
      // 橡皮擦模式
      this.ctx.save();
      this.ctx.globalCompositeOperation = 'destination-out';
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.options.strokeWidth * 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
      
      // 收集路径点
      this.currentPath.push({ x, y });
    } else if (this.mode === 'highlighter') {
      // 荧光笔模式
      this.ctx.save();
      this.ctx.globalAlpha = this.options.opacity || 0.3;
      this.ctx.strokeStyle = this.options.strokeColor || this.options.color;
      this.ctx.lineWidth = this.options.strokeWidth * 4;
      this.ctx.lineCap = 'square';
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      this.ctx.restore();
      
      // 收集路径点
      this.currentPath.push({ x, y });
    } else if (this.startPoint && this.previewImageData) {
      // 其他模式：显示实时预览
      this.showPreview(this.startPoint, { x, y });
    }
  }

  private stopDrawing(): void {
    if (this.isDragging) {
      console.log('🎯 Stop dragging');
      this.isDragging = false;
      this.saveState(); // 保存拖拽后的状态
      return;
    }
    
    if (!this.isDrawing) return;
    
    this.isDrawing = false;
    
    // 使用插件系统处理完成绘制
    const tool = this.toolManager.getTool(this.mode);
    if (tool && this.currentDrawingObject && this.currentPoint) {
      const context = {
        ctx: this.ctx,
        canvas: this.canvas,
        options: this.options,
        generateId: () => this.generateId(),
        redrawCanvas: () => this.redrawCanvas(),
        saveState: () => this.saveState()
      };
      
      const finishedObject = tool.finishDrawing(this.currentPoint, this.currentDrawingObject, context);
      if (finishedObject) {
        this.drawingObjects.push(finishedObject);
        
        // 检查是否是需要立即编辑的文本对象（Figma风格）
        if ((finishedObject as any).__shouldStartEditing && finishedObject.type === 'text') {
          console.log('🔤 Starting immediate text editing (Figma style)');
          delete (finishedObject as any).__shouldStartEditing; // 清理临时标记
          
          // 延迟一点点来确保对象已经完全创建
          setTimeout(() => {
            this.startTextEditing(finishedObject);
          }, 10);
        }
        
        this.saveState(); // 保存状态
        this.redrawCanvas();
      }
      
      this.currentDrawingObject = null;
    } else if (this.startPoint && this.currentPoint) {
      // 后备方案：处理不在插件系统中的工具
      this.handleLegacyStopDrawing();
    }
    
    this.startPoint = null;
    this.currentPoint = null;
    this.previewImageData = null;
    console.log('✅ Drawing completed');
  }

  private handleLegacyStopDrawing(): void {
    if (!this.startPoint || !this.currentPoint) return;
    
    if (this.mode !== 'pen' && this.mode !== 'text' && this.mode !== 'eraser' && this.mode !== 'highlighter' && this.mode !== 'hand-drawn') {
      // 为矩形、圆形、箭头、线条、星形、三角形等创建对象并保存
      const obj = this.createDrawingObject(this.startPoint, this.currentPoint);
      if (obj) {
        this.drawingObjects.push(obj);
        this.saveState(); // 保存状态
        this.redrawCanvas();
      }
    } else if ((this.mode === 'pen' || this.mode === 'eraser' || this.mode === 'highlighter' || this.mode === 'hand-drawn')) {
      // 为画笔、橡皮擦、荧光笔、手绘创建对象
      const obj = this.createPenObject();
      if (obj) {
        this.drawingObjects.push(obj);
        this.saveState(); // 保存状态
      }
    }
  }

  private createDrawingObject(start: {x: number, y: number}, end: {x: number, y: number}): DrawingObject | null {
    const bounds = this.calculateBounds(start, end, this.mode);
    
    const obj: DrawingObject = {
      id: this.generateId(),
      type: this.mode,
      startPoint: { ...start },
      endPoint: { ...end },
      options: { ...this.options },
      bounds: bounds
    };
    
    return obj;
  }

  private createPenObject(): DrawingObject | null {
    if (!this.startPoint || this.currentPath.length < 2) return null;
    
    // 计算路径边界
    const bounds = this.calculatePathBounds(this.currentPath);
    
    const obj: DrawingObject = {
      id: this.generateId(),
      type: 'pen',
      startPoint: { ...this.startPoint },
      points: [...this.currentPath], // 使用收集的路径点
      options: { ...this.options },
      bounds: bounds
    };
    
    // 清空当前路径
    this.currentPath = [];
    
    return obj;
  }

  private calculatePathBounds(points: { x: number; y: number }[]): { x: number; y: number; width: number; height: number } {
    if (points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    
    for (const point of points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    const margin = this.options.strokeWidth / 2;
    return {
      x: minX - margin,
      y: minY - margin,
      width: maxX - minX + margin * 2,
      height: maxY - minY + margin * 2
    };
  }

  private calculateBounds(start: {x: number, y: number}, end: {x: number, y: number}, type: DrawingMode): {x: number, y: number, width: number, height: number} {
    const minX = Math.min(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxX = Math.max(start.x, end.x);
    const maxY = Math.max(start.y, end.y);
    
    if (type === 'circle' || type === 'star') {
      const radius = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
      return {
        x: start.x - radius,
        y: start.y - radius,
        width: radius * 2,
        height: radius * 2
      };
    }
    
    if (type === 'line' || type === 'arrow') {
      // 为线条添加一些边距以便选择
      const margin = Math.max(10, this.options.strokeWidth);
      return {
        x: minX - margin,
        y: minY - margin,
        width: maxX - minX + margin * 2,
        height: maxY - minY + margin * 2
      };
    }
    
    return {
      x: minX,
      y: minY,
      width: Math.abs(maxX - minX),
      height: Math.abs(maxY - minY)
    };
  }

  private showPreview(start: {x: number, y: number}, end: {x: number, y: number}): void {
    if (!this.previewImageData) return;
    
    // 恢复原始画布状态
    this.ctx.putImageData(this.previewImageData, 0, 0);
    
    // 设置预览样式（稍微半透明）
    this.ctx.globalAlpha = 0.8;
    this.ctx.strokeStyle = this.options.color;
    this.ctx.fillStyle = this.options.color;
    this.ctx.lineWidth = this.options.strokeWidth;
    
    // 绘制预览形状
    this.drawShape(start, end);
    
    // 恢复正常透明度
    this.ctx.globalAlpha = 1.0;
  }

  private drawShape(start: {x: number, y: number}, end: {x: number, y: number}): void {
    this.ctx.strokeStyle = this.options.color;
    this.ctx.fillStyle = this.options.color;
    this.ctx.lineWidth = this.options.strokeWidth;
    
    // 直接绘制形状，不使用插件系统进行预览（避免复杂性）
    switch (this.mode) {
      case 'rectangle':
        const width = end.x - start.x;
        const height = end.y - start.y;
        this.ctx.beginPath();
        this.ctx.rect(start.x, start.y, width, height);
        if (this.options.hasFill) {
          this.ctx.fill();
        }
        this.ctx.stroke();
        break;
        
      case 'circle':
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        this.ctx.beginPath();
        this.ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        if (this.options.hasFill) {
          this.ctx.fill();
        }
        this.ctx.stroke();
        break;
        
      case 'line':
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
        break;
        
      case 'arrow':
        this.drawArrow(start.x, start.y, end.x, end.y);
        break;
        
      case 'star':
        const starRadius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        this.drawStar(start.x, start.y, starRadius, 5);
        break;
        
      case 'triangle':
        this.drawTriangle(start, end);
        break;
        
      case 'hand-drawn':
        // 手绘风格矩形
        this.drawHandDrawnRect(start, end);
        break;
        
      default:
        // 默认绘制矩形
        const defaultWidth = end.x - start.x;
        const defaultHeight = end.y - start.y;
        this.ctx.beginPath();
        this.ctx.rect(start.x, start.y, defaultWidth, defaultHeight);
        if (this.options.hasFill) {
          this.ctx.fill();
        }
        this.ctx.stroke();
        break;
    }
  }

  private drawLine(fromX: number, fromY: number, toX: number, toY: number): void {
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
  }

  private drawArrow(fromX: number, fromY: number, toX: number, toY: number): void {
    const headLength = Math.max(15, this.options.strokeWidth * 3); // 箭头大小根据线条粗细调整
    const angle = Math.atan2(toY - fromY, toX - fromX);
    
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    
    // 画箭头主线
    this.ctx.beginPath();
    this.ctx.moveTo(fromX, fromY);
    this.ctx.lineTo(toX, toY);
    this.ctx.stroke();
    
    // 画箭头头部（填充的三角形）
    this.ctx.beginPath();
    this.ctx.moveTo(toX, toY);
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    this.ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    this.ctx.closePath();
    this.ctx.fill(); // 填充箭头头部
  }

  private drawStar(centerX: number, centerY: number, radius: number, points: number): void {
    const outerRadius = radius;
    const innerRadius = radius * 0.4;
    
    this.ctx.beginPath();
    
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const r = i % 2 === 0 ? outerRadius : innerRadius;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    this.ctx.closePath();
    if (this.options.hasFill) {
      this.ctx.fill();
    }
    this.ctx.stroke();
  }

  private drawTriangle(start: { x: number; y: number }, end: { x: number; y: number }): void {
    const width = end.x - start.x;
    const height = end.y - start.y;
    
    // 等腰三角形
    this.ctx.beginPath();
    this.ctx.moveTo(start.x + width / 2, start.y); // 顶点
    this.ctx.lineTo(start.x, end.y); // 左下角
    this.ctx.lineTo(end.x, end.y); // 右下角
    this.ctx.closePath();
    
    if (this.options.hasFill) {
      this.ctx.fill();
    }
    this.ctx.stroke();
  }

  private drawHandDrawnRect(start: {x: number, y: number}, end: {x: number, y: number}): void {
    const roughness = this.options.roughness || 1;
    const deviation = roughness * 2;
    
    // 计算矩形的四个角点（带微小随机偏移）
    const points = [
      { x: start.x + this.randomOffset(deviation), y: start.y + this.randomOffset(deviation) },
      { x: end.x + this.randomOffset(deviation), y: start.y + this.randomOffset(deviation) },
      { x: end.x + this.randomOffset(deviation), y: end.y + this.randomOffset(deviation) },
      { x: start.x + this.randomOffset(deviation), y: end.y + this.randomOffset(deviation) }
    ];
    
    // 绘制手绘风格的矩形，使用稍微弯曲的线条
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      this.drawHandDrawnLine(points[i-1], points[i], deviation);
    }
    // 闭合到起始点
    this.drawHandDrawnLine(points[points.length-1], points[0], deviation);
    
    this.ctx.stroke();
  }

  private drawHandDrawnLine(from: {x: number, y: number}, to: {x: number, y: number}, deviation: number): void {
    const distance = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
    const segments = Math.max(2, Math.floor(distance / 10)); // 每10像素一个控制点
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = from.x + (to.x - from.x) * t + this.randomOffset(deviation);
      const y = from.y + (to.y - from.y) * t + this.randomOffset(deviation);
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
  }

  private randomOffset(max: number): number {
    return (Math.random() - 0.5) * max;
  }

  private addText(x: number, y: number): void {
    // 创建默认文本对象
    const defaultText = '双击编辑文字';
    
    // 计算文字边界框
    this.ctx.font = `${this.options.fontSize}px Arial`;
    const textMetrics = this.ctx.measureText(defaultText);
    const textWidth = textMetrics.width;
    const textHeight = this.options.fontSize;
    
    const obj: DrawingObject = {
      id: this.generateId(),
      type: 'text',
      startPoint: { x, y },
      text: defaultText,
      options: { ...this.options },
      bounds: { 
        x: x - textWidth / 2, 
        y: y - textHeight / 2, 
        width: textWidth, 
        height: textHeight 
      }
    };
    
    this.drawingObjects.push(obj);
    this.saveState(); // 保存状态
    this.redrawCanvas();
    
    // 立即进入编辑模式
    setTimeout(() => {
      this.startTextEditing(obj);
    }, 100);
    
    console.log(`📝 添加文字对象在 (${x}, ${y})`);
  }

  /**
   * 在指定位置创建文字（Figma风格）
   */
  private createTextAtPoint(x: number, y: number): void {
    const textObj: DrawingObject = {
      id: this.generateId(),
      type: 'text',
      startPoint: { x, y },
      text: '', // 空文字，等待用户输入
      options: { ...this.options },
      bounds: { 
        x: x, 
        y: y - this.options.fontSize / 2, 
        width: 0, 
        height: this.options.fontSize 
      }
    };
    
    this.drawingObjects.push(textObj);
    this.selectedObject = textObj;
    this.saveState();
    this.redrawCanvas();
    
    // 立即进入编辑模式
    setTimeout(() => {
      this.startTextEditing(textObj);
    }, 50);
    
    console.log(`📝 创建新文字对象在 (${x}, ${y})`);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private getObjectAtPoint(x: number, y: number): DrawingObject | null {
    console.log('🔍 Checking objects at point:', x, y, 'Total objects:', this.drawingObjects.length);
    // 从后往前查找（后绘制的在上层）
    for (let i = this.drawingObjects.length - 1; i >= 0; i--) {
      const obj = this.drawingObjects[i];
      if (this.isPointInObject(x, y, obj)) {
        console.log('🔍 Found object:', obj.type, obj.id, 'bounds:', obj.bounds);
        return obj;
      }
    }
    console.log('🔍 No object found at this point');
    return null;
  }

  private isPointInObject(x: number, y: number, obj: DrawingObject): boolean {
    const margin = Math.max(8, obj.options.strokeWidth); // 增加选择容差
    
    // 优先使用插件系统的hitTest
    const tool = this.toolManager.getTool(obj.type as DrawingMode);
    if (tool) {
      const context = {
        ctx: this.ctx,
        canvas: this.canvas,
        options: obj.options,
        generateId: () => this.generateId(),
        redrawCanvas: () => this.redrawCanvas(),
        saveState: () => this.saveState()
      };
      return tool.hitTest({ x, y }, obj, margin);
    }
    
    // 后备方案：使用旧的检测逻辑
    switch (obj.type) {
      case 'rectangle':
      case 'hand-drawn':
        return x >= obj.bounds.x - margin && 
               x <= obj.bounds.x + obj.bounds.width + margin &&
               y >= obj.bounds.y - margin && 
               y <= obj.bounds.y + obj.bounds.height + margin;
      
      case 'circle':
        const centerX = obj.startPoint.x;
        const centerY = obj.startPoint.y;
        const radius = obj.bounds.width / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        return distance <= radius + margin;
      
      case 'arrow':
        // 改进的箭头检测：检查是否接近线段
        if (obj.endPoint) {
          return this.distanceToLineSegment(x, y, obj.startPoint, obj.endPoint) <= margin;
        }
        return false;
      
      case 'text':
        return x >= obj.bounds.x - margin && 
               x <= obj.bounds.x + obj.bounds.width + margin &&
               y >= obj.bounds.y - margin && 
               y <= obj.bounds.y + obj.bounds.height + margin;
      
      case 'pen':
        // 优化的画笔路径检测：检查是否接近任何线段
        if (obj.points && obj.points.length > 1) {
          for (let i = 1; i < obj.points.length; i++) {
            const distance = this.distanceToLineSegment(x, y, obj.points[i-1], obj.points[i]);
            if (distance <= margin) return true;
          }
        }
        return false;
      
      default:
        return false;
    }
  }

  private distanceToLineSegment(px: number, py: number, p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length === 0) {
      // 线段长度为0，计算到点的距离
      return Math.sqrt((px - p1.x) ** 2 + (py - p1.y) ** 2);
    }
    
    // 计算点到线段的最短距离
    const t = Math.max(0, Math.min(1, ((px - p1.x) * dx + (py - p1.y) * dy) / (length * length)));
    const projection = {
      x: p1.x + t * dx,
      y: p1.y + t * dy
    };
    
    return Math.sqrt((px - projection.x) ** 2 + (py - projection.y) ** 2);
  }

  private moveObject(obj: DrawingObject, newX: number, newY: number): void {
    const deltaX = newX - obj.startPoint.x;
    const deltaY = newY - obj.startPoint.y;
    
    obj.startPoint.x = newX;
    obj.startPoint.y = newY;
    
    if (obj.endPoint) {
      obj.endPoint.x += deltaX;
      obj.endPoint.y += deltaY;
    }
    
    if (obj.points) {
      obj.points.forEach(point => {
        point.x += deltaX;
        point.y += deltaY;
      });
    }
    
    // 更新边界框
    obj.bounds.x += deltaX;
    obj.bounds.y += deltaY;
  }

  public redrawCanvas(): void {
    // 性能优化：避免频繁重绘
    if (this.redrawScheduled) return;
    
    const now = performance.now();
    const timeSinceLastRedraw = now - this.lastRedrawTime;
    
    // 如果距离上次重绘时间太短，延迟重绘
    if (timeSinceLastRedraw < this.redrawThrottleMs) {
      if (!this.redrawScheduled) {
        this.redrawScheduled = true;
        requestAnimationFrame(() => {
          this.performRedraw();
          this.redrawScheduled = false;
        });
      }
      return;
    }
    
    this.performRedraw();
    this.lastRedrawTime = now;
  }

  private performRedraw(): void {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 重新绘制所有对象
    this.drawingObjects.forEach(obj => {
      this.drawObject(obj);
    });
    
    // 编辑状态下渲染占位符和光标
    this.renderTextEditingOverlay();
    
    // 如果有选中的对象，绘制变换控制手柄
    if (this.selectedObject) {
      this.drawTransformHandles();
    }
  }

  // 编辑状态下渲染文本和光标
  private renderTextEditingOverlay(): void {
    if (this.isEditingText && this.selectedObject && this.selectedObject.type === 'text') {
      const opts = this.selectedObject.options;
      const x = this.selectedObject.startPoint.x;
      const y = this.selectedObject.startPoint.y;
      this.ctx.save();
      this.ctx.font = `${opts.fontWeight || 'normal'} ${opts.fontSize}px ${opts.fontFamily || 'Arial'}`;
      this.ctx.textAlign = opts.textAlign || 'left';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillStyle = opts.color || '#222';
      this.ctx.globalAlpha = 1;
      
      // 实时显示编辑的文本（只在有内容时渲染）
      if (this.editingText) {
        this.ctx.fillText(this.editingText, x, y);
      }
      
      // 绘制闪烁光标（即使文本为空也要显示）
      const textBefore = this.editingText.slice(0, this.textCursorPosition);
      let cursorX = x;
      
      // 根据文本对齐方式计算光标位置
      if (opts.textAlign === 'center') {
        const textWidth = this.ctx.measureText(this.editingText || '').width;
        const textBeforeWidth = this.ctx.measureText(textBefore || '').width;
        cursorX = x - textWidth / 2 + textBeforeWidth;
      } else if (opts.textAlign === 'right') {
        const textWidth = this.ctx.measureText(this.editingText || '').width;
        const textBeforeWidth = this.ctx.measureText(textBefore || '').width;
        cursorX = x - textWidth + textBeforeWidth;
      } else {
        // left对齐
        cursorX = x + this.ctx.measureText(textBefore || '').width;
      }
      
      // 确保光标可见（调试信息）
      console.log('🔤 Rendering cursor:', {
        editingText: this.editingText,
        cursorPosition: this.textCursorPosition,
        textBefore: textBefore,
        cursorX: cursorX,
        cursorVisible: this.textCursorVisible,
        textAlign: opts.textAlign
      });
      
      this.ctx.strokeStyle = opts.color || '#222';
      this.ctx.lineWidth = 2;
      if (this.textCursorVisible) {
        this.ctx.beginPath();
        this.ctx.moveTo(cursorX, y - opts.fontSize / 2);
        this.ctx.lineTo(cursorX, y + opts.fontSize / 2);
        this.ctx.stroke();
      }
      
      this.ctx.restore();
    }
  }

  private drawObject(obj: DrawingObject): void {
    this.ctx.save();
    
    // 应用变换
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
    
    // 设置基本样式
    this.ctx.strokeStyle = obj.options.color;
    this.ctx.fillStyle = obj.options.fillColor || obj.options.color;
    this.ctx.lineWidth = obj.options.strokeWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.globalAlpha = obj.options.opacity;
    
    // 设置线条样式
    if (obj.options.lineDash && obj.options.lineDash.length > 0) {
      this.ctx.setLineDash(obj.options.lineDash);
    } else {
      this.ctx.setLineDash([]);
    }
    
    // 设置阴影
    if (obj.options.shadowColor && obj.options.shadowColor !== 'transparent' && obj.options.shadowBlur && obj.options.shadowBlur > 0) {
      this.ctx.shadowColor = obj.options.shadowColor;
      this.ctx.shadowBlur = obj.options.shadowBlur;
      this.ctx.shadowOffsetX = obj.options.shadowOffsetX || 0;
      this.ctx.shadowOffsetY = obj.options.shadowOffsetY || 0;
    } else {
      this.ctx.shadowColor = 'transparent';
      this.ctx.shadowBlur = 0;
      this.ctx.shadowOffsetX = 0;
      this.ctx.shadowOffsetY = 0;
    }
    
    // 使用插件系统渲染对象
    const tool = this.toolManager.getTool(obj.type as DrawingMode);
    if (tool) {
      const context = {
        ctx: this.ctx,
        canvas: this.canvas,
        options: obj.options,
        generateId: () => '',
        redrawCanvas: () => this.redrawCanvas(),
        saveState: () => this.saveState()
      };
      
      tool.render(obj, context);
    } else {
      // 后备方案：处理不在插件系统中的工具
      this.renderLegacyObject(obj);
    }
    
    // 重置样式
    this.ctx.globalAlpha = 1;
    this.ctx.setLineDash([]);
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    
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

  private drawSelectionBox(obj: DrawingObject): void {
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

  setMode(mode: DrawingMode): void {
    this.mode = mode;
    // 同时设置ToolManager的当前工具
    this.toolManager.setCurrentTool(mode);
    console.log('✏️ Mode set to:', mode);
    
    // 调用模式变化回调
    if (this.onModeChange) {
      this.onModeChange(mode);
    }
  }

  setModeChangeCallback(callback: (mode: DrawingMode) => void): void {
    this.onModeChange = callback;
  }

  updateObjectProperties(object: DrawingObject, changes: Partial<DrawingOptions & { x: number; y: number; width: number; height: number }>): void {
    // 更新对象属性
    if (changes.x !== undefined || changes.y !== undefined) {
      const deltaX = (changes.x ?? object.startPoint.x) - object.startPoint.x;
      const deltaY = (changes.y ?? object.startPoint.y) - object.startPoint.y;
      
      object.startPoint.x = changes.x ?? object.startPoint.x;
      object.startPoint.y = changes.y ?? object.startPoint.y;
      
      if (object.endPoint) {
        object.endPoint.x += deltaX;
        object.endPoint.y += deltaY;
      }
      
      if (object.points) {
        object.points = object.points.map(point => ({
          x: point.x + deltaX,
          y: point.y + deltaY
        }));
      }
      
      // 更新边界框
      object.bounds.x += deltaX;
      object.bounds.y += deltaY;
    }

    // 更新样式属性
    Object.assign(object.options, changes);
    
    // 如果是文字对象，重新计算边界框
    if (object.type === 'text' && (changes.fontSize || changes.fontFamily)) {
      this.recalculateTextBounds(object);
    }
    
    this.saveState();
    this.redrawCanvas();
  }

  duplicateObject(object: DrawingObject): void {
    const newObject: DrawingObject = {
      ...object,
      id: this.generateId(),
      startPoint: { x: object.startPoint.x + 20, y: object.startPoint.y + 20 },
      endPoint: object.endPoint ? { x: object.endPoint.x + 20, y: object.endPoint.y + 20 } : undefined,
      points: object.points ? object.points.map(p => ({ x: p.x + 20, y: p.y + 20 })) : undefined,
      bounds: {
        x: object.bounds.x + 20,
        y: object.bounds.y + 20,
        width: object.bounds.width,
        height: object.bounds.height
      },
      options: { ...object.options }
    };

    this.drawingObjects.push(newObject);
    this.selectedObject = newObject;
    this.saveState();
    this.redrawCanvas();
  }

  deleteObject(object: DrawingObject): void {
    const index = this.drawingObjects.findIndex(obj => obj.id === object.id);
    if (index > -1) {
      this.drawingObjects.splice(index, 1);
      if (this.selectedObject === object) {
        this.selectedObject = null;
      }
      this.saveState();
      this.redrawCanvas();
    }
  }

  private recalculateTextBounds(textObject: DrawingObject): void {
    if (textObject.type !== 'text' || !textObject.text) return;

    this.ctx.font = `${textObject.options.fontWeight || 'normal'} ${textObject.options.fontSize}px ${textObject.options.fontFamily || 'Arial'}`;
    const textMetrics = this.ctx.measureText(textObject.text);
    const textWidth = textMetrics.width;
    const textHeight = textObject.options.fontSize;

    textObject.bounds = {
      x: textObject.startPoint.x - textWidth / 2,
      y: textObject.startPoint.y - textHeight / 2,
      width: textWidth,
      height: textHeight
    };
  }

  setOptions(options: Partial<DrawingOptions>): void {
    this.options = { ...this.options, ...options };
    console.log('⚙️ Options updated:', this.options);
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawingObjects = [];
    this.selectedObject = null;
    
    // 只显示一个小提示
    this.ctx.fillStyle = '#888888';
    this.ctx.font = '20px Arial';
    this.ctx.fillText('画布已清空，可以重新开始绘画', 50, 50);
    
    this.saveState(); // 保存清空状态
    console.log('🗑️ Canvas cleared');
  }

  deleteSelected(): void {
    if (this.selectedObject) {
      const index = this.drawingObjects.indexOf(this.selectedObject);
      if (index > -1) {
        this.drawingObjects.splice(index, 1);
        this.selectedObject = null;
        this.saveState(); // 保存删除状态
        this.redrawCanvas();
        console.log('🗑️ Selected object deleted');
      }
    }
  }

  getSelectedObject(): DrawingObject | null {
    return this.selectedObject;
  }

  private startTextEditing(textObj: DrawingObject): void {
    if (this.isEditingText) return;
    this.isEditingText = true;
    this.selectedObject = textObj;
    // 记录编辑状态
    this.editingText = textObj.text || '';
    // 将光标放到末尾（即使是空文本也要显示光标）
    this.textCursorPosition = this.editingText.length;
    this.textCursorVisible = true;
    this.startTextCursorBlink();
    this.canvas.focus();
    this.redrawCanvas();
    console.log('🔤 Text editing started, cursor position:', this.textCursorPosition, 'editing text:', this.editingText);
  }

  private finishTextEditing(): void {
    if (!this.isEditingText || !this.selectedObject) return;
    this.isEditingText = false;
    this.stopTextCursorBlink();
    
    // 获取编辑的文本（不trim，保留用户输入的内容）
    const newText = this.editingText;
    
    // 更新文本对象
    this.selectedObject.text = newText;
    
    // 重新计算边界框
    this.recalculateTextBounds(this.selectedObject);
    
    this.editingText = '';
    this.textCursorPosition = 0;
    this.saveState();
    this.redrawCanvas();
  }

  private cancelTextEditing(): void {
    if (!this.isEditingText) return;
    
    // 防止重复调用
    this.isEditingText = false;
    this.stopTextCursorBlink();
    
    // 清理编辑状态
    this.editingText = '';
    this.textCursorPosition = 0;
    
    // 重新绘制
    this.redrawCanvas();
    
    console.log('📝 Text editing cancelled');
  }

  undo(): void {
    if (this.historyStep > 0) {
      this.historyStep--;
      this.drawingObjects = this.cloneObjectArray(this.history[this.historyStep]);
      this.selectedObject = null;
      this.redrawCanvas();
      console.log('↶ Undo successful, step:', this.historyStep);
    } else {
      console.log('↶ No more undo steps');
    }
  }

  private redo(): void {
    if (this.historyStep < this.history.length - 1) {
      this.historyStep++;
      this.drawingObjects = this.cloneObjectArray(this.history[this.historyStep]);
      this.selectedObject = null;
      this.redrawCanvas();
      console.log('↷ Redo successful, step:', this.historyStep);
    } else {
      console.log('↷ No more redo steps');
    }
  }

  private saveState(): void {
    // 移除当前步骤之后的所有历史记录
    this.history = this.history.slice(0, this.historyStep + 1);
    
    // 添加新状态
    this.history.push(this.cloneObjectArray(this.drawingObjects));
    this.historyStep++;
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyStep--;
    }
    
    console.log('💾 State saved, step:', this.historyStep, 'total history:', this.history.length);
  }

  private cloneObjectArray(objects: DrawingObject[]): DrawingObject[] {
    return objects.map(obj => this.cloneObject(obj));
  }

  resize(width: number, height: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.putImageData(imageData, 0, 0);
  }

  async captureWithBackground(): Promise<string> {
    return this.canvas.toDataURL('image/png');
  }

  exportDrawing(): string {
    return this.canvas.toDataURL('image/png');
  }

  // 快捷键操作方法
  private copySelected(): void {
    if (this.selectedObject) {
      this.clipboard = this.cloneObject(this.selectedObject);
      console.log('📋 对象已复制到剪贴板');
    }
  }

  private cutSelected(): void {
    if (this.selectedObject) {
      this.clipboard = this.cloneObject(this.selectedObject);
      this.deleteSelected();
      console.log('✂️ 对象已剪切到剪贴板');
    }
  }

  private paste(): void {
    if (this.clipboard) {
      const newObj = this.cloneObject(this.clipboard);
      // 稍微偏移位置避免重叠
      newObj.startPoint.x += 20;
      newObj.startPoint.y += 20;
      if (newObj.endPoint) {
        newObj.endPoint.x += 20;
        newObj.endPoint.y += 20;
      }
      if (newObj.points) {
        newObj.points.forEach(point => {
          point.x += 20;
          point.y += 20;
        });
      }
      newObj.bounds.x += 20;
      newObj.bounds.y += 20;
      newObj.id = this.generateId(); // 生成新ID
      
      this.drawingObjects.push(newObj);
      this.selectedObject = newObj;
      this.redrawCanvas();
      console.log('📋 对象已粘贴');
    }
  }

  private duplicateSelected(): void {
    if (this.selectedObject) {
      this.clipboard = this.cloneObject(this.selectedObject);
      this.paste();
      console.log('📋 对象已复制');
    }
  }

  private selectAll(): void {
    // 简化版本：选择最后一个对象
    if (this.drawingObjects.length > 0) {
      this.selectedObject = this.drawingObjects[this.drawingObjects.length - 1];
      this.redrawCanvas();
      console.log('🎯 已选择对象');
    }
  }

  private moveSelectedBy(deltaX: number, deltaY: number): void {
    if (this.selectedObject) {
      this.moveObject(this.selectedObject, 
        this.selectedObject.startPoint.x + deltaX, 
        this.selectedObject.startPoint.y + deltaY);
      this.redrawCanvas();
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
  
  // ========= 变换控制方法 =========
  
  /**
   * 生成变换控制手柄
   */
  private generateTransformHandles(obj: DrawingObject): TransformHandle[] {
    const handles: TransformHandle[] = [];
    const bounds = obj.bounds;
    const handleSize = 8;
    const offset = handleSize / 2;

    // 四个角落的缩放手柄
    handles.push({
      type: HandleType.TOP_LEFT,
      x: bounds.x - offset,
      y: bounds.y - offset,
      width: handleSize,
      height: handleSize
    });

    handles.push({
      type: HandleType.TOP_RIGHT,
      x: bounds.x + bounds.width - offset,
      y: bounds.y - offset,
      width: handleSize,
      height: handleSize
    });

    handles.push({
      type: HandleType.BOTTOM_LEFT,
      x: bounds.x - offset,
      y: bounds.y + bounds.height - offset,
      width: handleSize,
      height: handleSize
    });

    handles.push({
      type: HandleType.BOTTOM_RIGHT,
      x: bounds.x + bounds.width - offset,
      y: bounds.y + bounds.height - offset,
      width: handleSize,
      height: handleSize
    });

    // 四边中点的缩放手柄
    handles.push({
      type: HandleType.TOP,
      x: bounds.x + bounds.width / 2 - offset,
      y: bounds.y - offset,
      width: handleSize,
      height: handleSize
    });

    handles.push({
      type: HandleType.BOTTOM,
      x: bounds.x + bounds.width / 2 - offset,
      y: bounds.y + bounds.height - offset,
      width: handleSize,
      height: handleSize
    });

    handles.push({
      type: HandleType.LEFT,
      x: bounds.x - offset,
      y: bounds.y + bounds.height / 2 - offset,
      width: handleSize,
      height: handleSize
    });

    handles.push({
      type: HandleType.RIGHT,
      x: bounds.x + bounds.width - offset,
      y: bounds.y + bounds.height / 2 - offset,
      width: handleSize,
      height: handleSize
    });

    // 旋转手柄
    handles.push({
      type: HandleType.ROTATE,
      x: bounds.x + bounds.width / 2 - offset,
      y: bounds.y - 30 - offset,
      width: handleSize,
      height: handleSize
    });

    return handles;
  }

  /**
   * 绘制变换控制手柄

   */
  private drawTransformHandles(): void {
    if (!this.selectedObject) return;

    this.transformHandles = this.generateTransformHandles(this.selectedObject);

    this.ctx.save();
    
    // 绘制选中框
    const bounds = this.selectedObject.bounds;
    this.ctx.strokeStyle = '#007acc';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // 绘制控制手柄
    this.transformHandles.forEach(handle => {
      this.ctx.fillStyle = handle.type === HandleType.ROTATE ? '#ff6b35' : '#007acc';
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([]);
      
      if (handle.type === HandleType.ROTATE) {
        // 旋转手柄绘制为圆形
        this.ctx.beginPath();
        this.ctx.arc(handle.x + handle.width / 2, handle.y + handle.height / 2, handle.width / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
        
        // 绘制旋转手柄的连接线
        this.ctx.beginPath();
        this.ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
        this.ctx.lineTo(handle.x + handle.width / 2, handle.y + handle.height / 2);
        this.ctx.stroke();
      } else {
        // 缩放手柄绘制为方形
        this.ctx.fillRect(handle.x, handle.y, handle.width, handle.height);
        this.ctx.strokeRect(handle.x, handle.y, handle.width, handle.height);
      }
    });

    this.ctx.restore();
  }

  /**
   * 检查点击是否在控制手柄上
   */
  private getHandleAtPoint(x: number, y: number): TransformHandle | null {
    for (const handle of this.transformHandles) {
      if (x >= handle.x && x <= handle.x + handle.width &&
          y >= handle.y && y <= handle.y + handle.height) {
        return handle;
      }
    }
    return null;
  }

  /**
   * 开始变换操作
   */
  private startTransform(handle: TransformHandle, x: number, y: number): void {
    this.activeHandle = handle;
    this.isTransforming = true;
    this.transformStartPoint = { x, y };
    
    if (this.selectedObject) {
      this.originalBounds = { ...this.selectedObject.bounds };
      this.originalTransform = this.selectedObject.transform ? { ...this.selectedObject.transform } : {
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        translateX: 0,
        translateY: 0
      };
    }

    // 设置对应的鼠标光标
    this.updateCursor(handle.type);
  }

  /**
   * 更新鼠标光标
   */
  private updateCursor(handleType: HandleType): void {
    const cursors = {
      [HandleType.TOP_LEFT]: 'nw-resize',
      [HandleType.TOP_RIGHT]: 'ne-resize',
      [HandleType.BOTTOM_LEFT]: 'sw-resize',
      [HandleType.BOTTOM_RIGHT]: 'se-resize',
      [HandleType.TOP]: 'n-resize',
      [HandleType.BOTTOM]: 's-resize',
      [HandleType.LEFT]: 'w-resize',
      [HandleType.RIGHT]: 'e-resize',
      [HandleType.ROTATE]: 'grab'
    };
    
    this.canvas.style.cursor = cursors[handleType] || 'default';
  }

  /**
   * 执行变换操作
   */
  private performTransform(x: number, y: number): void {
    if (!this.activeHandle || !this.selectedObject || !this.transformStartPoint || !this.originalBounds) {
      return;
    }

    const deltaX = x - this.transformStartPoint.x;
    const deltaY = y - this.transformStartPoint.y;
    
    // 确保对象有transform属性
    if (!this.selectedObject.transform) {
      this.selectedObject.transform = {
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        translateX: 0,
        translateY: 0
      };
    }

    switch (this.activeHandle.type) {
      case HandleType.TOP_LEFT:
        this.resizeObject(deltaX, deltaY, 0, 0);
        break;
      case HandleType.TOP_RIGHT:
        this.resizeObject(0, deltaY, deltaX, 0);
        break;
      case HandleType.BOTTOM_LEFT:
        this.resizeObject(deltaX, 0, 0, deltaY);
        break;
      case HandleType.BOTTOM_RIGHT:
        this.resizeObject(0, 0, deltaX, deltaY);
        break;
      case HandleType.TOP:
        this.resizeObject(0, deltaY, 0, 0);
        break;
      case HandleType.BOTTOM:
        this.resizeObject(0, 0, 0, deltaY);
        break;
      case HandleType.LEFT:
        this.resizeObject(deltaX, 0, 0, 0);
        break;
      case HandleType.RIGHT:
        this.resizeObject(0, 0, deltaX, 0);
        break;
      case HandleType.ROTATE:
        this.rotateObject(x, y);
        break;
    }

    // 性能优化：使用requestAnimationFrame进行重绘
    if (!this.redrawScheduled) {
      this.redrawScheduled = true;
      requestAnimationFrame(() => {
        this.performRedraw();
        this.redrawScheduled = false;
      });
    }
  }

  /**
   * 调整对象大小
   */
  private resizeObject(leftDelta: number, topDelta: number, rightDelta: number, bottomDelta: number): void {
    if (!this.selectedObject || !this.originalBounds) return;

    const newBounds = {
      x: this.originalBounds.x + leftDelta,
      y: this.originalBounds.y + topDelta,
      width: Math.max(10, this.originalBounds.width - leftDelta + rightDelta),
      height: Math.max(10, this.originalBounds.height - topDelta + bottomDelta)
    };

    this.selectedObject.bounds = newBounds;
    
    // 根据新的bounds更新对象的具体坐标
    this.updateObjectCoordinates(this.selectedObject, newBounds);
  }

  /**
   * 旋转对象
   */
  private rotateObject(mouseX: number, mouseY: number): void {
    if (!this.selectedObject || !this.originalBounds) return;

    const centerX = this.originalBounds.x + this.originalBounds.width / 2;
    const centerY = this.originalBounds.y + this.originalBounds.height / 2;
    
    const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
    
    if (this.selectedObject.transform) {
      this.selectedObject.transform.rotation = angle;
    }
  }

  /**
   * 根据新bounds更新对象坐标
   */
  private updateObjectCoordinates(obj: DrawingObject, newBounds: { x: number; y: number; width: number; height: number }): void {
    switch (obj.type) {
      case 'rectangle':
      case 'circle':
      case 'triangle':
      case 'star':
        obj.startPoint = { x: newBounds.x, y: newBounds.y };
        obj.endPoint = { x: newBounds.x + newBounds.width, y: newBounds.y + newBounds.height };
        break;
      case 'line':
      case 'arrow':
        if (obj.endPoint) {
          const originalLength = Math.sqrt(
            Math.pow(obj.endPoint.x - obj.startPoint.x, 2) + 
            Math.pow(obj.endPoint.y - obj.startPoint.y, 2)
          );
          const newLength = Math.sqrt(newBounds.width * newBounds.width + newBounds.height * newBounds.height);
          const scale = newLength / originalLength;
          
          obj.startPoint = { x: newBounds.x, y: newBounds.y };
          obj.endPoint = {
            x: newBounds.x + (obj.endPoint.x - obj.startPoint.x) * scale,
            y: newBounds.y + (obj.endPoint.y - obj.startPoint.y) * scale
          };
        }
        break;
      case 'text':
        obj.startPoint = { x: newBounds.x, y: newBounds.y + newBounds.height / 2 };
        break;
    }
  }

  /**
   * 结束变换操作
   */
  private endTransform(): void {
    this.activeHandle = null;
    this.isTransforming = false;
    this.transformStartPoint = null;
    this.originalBounds = null;
    this.originalTransform = null;
    this.canvas.style.cursor = 'default';
    
    // 保存状态
    this.saveState();
  }

  // ========= 公开API方法 =========
  
  /**
   * 根据新bounds更新对象坐标（公开方法）
   */
  public updateObjectCoordinatesFromBounds(obj: DrawingObject, newBounds: { x: number; y: number; width: number; height: number }): void {
    this.updateObjectCoordinates(obj, newBounds);
  }

  destroy(): void {
    // 清理文本编辑状态
    if (this.isEditingText) {
      this.cancelTextEditing();
    }
    console.log('💥 DrawingEngine destroyed');
  }

  private handleTextInput(e: KeyboardEvent): void {
    e.preventDefault();
    const isCtrl = e.ctrlKey || e.metaKey;
    switch (e.key) {
      case 'Escape':
        this.finishTextEditing();
        break;
      case 'Backspace':
        if (this.textCursorPosition > 0) {
          this.editingText = this.editingText.slice(0, this.textCursorPosition - 1) + this.editingText.slice(this.textCursorPosition);
          this.textCursorPosition--;
          this.updateTextObject();
        }
        break;
      case 'Delete':
        if (this.textCursorPosition < this.editingText.length) {
          this.editingText = this.editingText.slice(0, this.textCursorPosition) + this.editingText.slice(this.textCursorPosition + 1);
          this.updateTextObject();
        }
        break;
      case 'ArrowLeft':
        if (isCtrl) {
          // Ctrl+Left: 移动到上一个单词
          this.moveCursorToWordBoundary(false);
        } else if (this.textCursorPosition > 0) {
          this.textCursorPosition--;
          this.redrawCanvas();
        }
        break;
      case 'ArrowRight':
        if (isCtrl) {
          // Ctrl+Right: 移动到下一个单词
          this.moveCursorToWordBoundary(true);
        } else if (this.textCursorPosition < this.editingText.length) {
          this.textCursorPosition++;
          this.redrawCanvas();
        }
        break;
      case 'Home':
        this.textCursorPosition = 0;
        this.redrawCanvas();
        break;
      case 'End':
        this.textCursorPosition = this.editingText.length;
        this.redrawCanvas();
        break;
      case 'a':
        if (isCtrl) {
          // Ctrl+A: 全选文本
          this.textCursorPosition = this.editingText.length;
          this.redrawCanvas();
        } else {
          this.insertCharacter('a');
        }
        break;
      default:
        // 处理可打印字符
        if (e.key.length === 1 && !isCtrl) {
          this.insertCharacter(e.key);
        }
        break;
    }
  }

  private insertCharacter(char: string): void {
    this.editingText = this.editingText.slice(0, this.textCursorPosition) + char + this.editingText.slice(this.textCursorPosition);
    this.textCursorPosition++;
    this.updateTextObject();
  }

  private updateTextObject(): void {
    if (this.selectedObject && this.isEditingText) {
      // 实时更新文本对象
      this.selectedObject.text = this.editingText;
      // 重新计算边界框
      this.recalculateTextBounds(this.selectedObject);
      this.redrawCanvas();
    }
  }

  private moveCursorToWordBoundary(forward: boolean): void {
    if (forward) {
      // 移动到下一个单词的开始
      while (this.textCursorPosition < this.editingText.length && this.editingText[this.textCursorPosition] !== ' ') {
        this.textCursorPosition++;
      }
      while (this.textCursorPosition < this.editingText.length && this.editingText[this.textCursorPosition] === ' ') {
        this.textCursorPosition++;
      }
    } else {
      // 移动到上一个单词的开始
      if (this.textCursorPosition > 0) {
        this.textCursorPosition--;
        while (this.textCursorPosition > 0 && this.editingText[this.textCursorPosition] === ' ') {
          this.textCursorPosition--;
        }
        while (this.textCursorPosition > 0 && this.editingText[this.textCursorPosition - 1] !== ' ') {
          this.textCursorPosition--;
        }
      }
    }
    this.redrawCanvas();
  }

  private startTextCursorBlink(): void {
    if (this.textCursorBlinkTimer) {
      clearInterval(this.textCursorBlinkTimer);
    }
    
    // 性能优化：使用requestAnimationFrame替代setInterval
    let lastBlinkTime = 0;
    const blinkInterval = 500; // 500ms
    
    const blink = (currentTime: number) => {
      if (this.isEditingText) {
        if (currentTime - lastBlinkTime >= blinkInterval) {
          this.textCursorVisible = !this.textCursorVisible;
          this.redrawCanvas();
          lastBlinkTime = currentTime;
        }
        this.textCursorBlinkTimer = requestAnimationFrame(blink);
      }
    };
    
    this.textCursorBlinkTimer = requestAnimationFrame(blink);
  }

  private stopTextCursorBlink(): void {
    if (this.textCursorBlinkTimer) {
      cancelAnimationFrame(this.textCursorBlinkTimer);
      this.textCursorBlinkTimer = null;
    }
    this.textCursorVisible = false;
  }
}
