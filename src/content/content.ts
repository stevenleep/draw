import { DrawingEngine, type DrawingMode, type DrawingOptions } from '../lib/DrawingEngine';
import html2canvas from 'html2canvas';

class ContentScript {
  private drawingEngine: DrawingEngine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private toolbar: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private isActive = false;
  private librariesLoaded = false;
  private currentMode: DrawingMode = 'select';
  
  // 安全的DOM移除方法
  private safeRemoveElement(element: Element | null): void {
    if (element && element.parentNode) {
      try {
        element.parentNode.removeChild(element);
      } catch (error) {
        console.warn('DOM移除操作失败:', error);
        // 尝试使用remove方法作为备选
        try {
          element.remove();
        } catch (fallbackError) {
          console.warn('备选移除方法也失败:', fallbackError);
        }
      }
    }
  }
  private currentOptions: DrawingOptions = {
    color: '#000000',
    strokeWidth: 2,
    fontSize: 16,
    roughness: 1,
    opacity: 1,
    hasFill: false,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    textAlign: 'left', // 改为左对齐，更符合Figma
    lineDash: [],
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0
  };

  constructor() {
    console.log('🚀 Content script initializing...', {
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    
    this.setupMessageListener();
    this.loadLibraries();
    this.notifyBackgroundScript();
    
    console.log('✅ Content script initialization complete');
  }

  private notifyBackgroundScript(): void {
    // 延迟通知，确保扩展完全加载
    setTimeout(() => {
      try {
        console.log('📤 Notifying background script...');
        chrome.runtime.sendMessage({ 
          action: 'contentScriptReady',
          timestamp: Date.now(),
          url: window.location.href
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('⚠️ Background script not ready yet:', chrome.runtime.lastError.message);
          } else {
            console.log('✅ Successfully notified background script, response:', response);
          }
        });
      } catch (error) {
        console.log('❌ Failed to notify background script:', error);
      }
    }, 100);
  }

  private async loadLibraries(): Promise<void> {
    if (this.librariesLoaded) return;

    try {
      console.log('📚 Loading drawing libraries...');
      // 库已经通过 import 加载，无需额外操作
      this.librariesLoaded = true;
      console.log('✅ Drawing libraries loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load drawing libraries:', error);
    }
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Content script received message:', message);
      
      // 异步处理消息
      this.handleMessage(message, sendResponse);
      
      // 返回 true 表示我们将异步发送响应
      return true;
    });
  }

  private async handleMessage(message: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      console.log('🔄 Processing message:', message.action);
      
      // 确保库已加载
      if (!this.librariesLoaded) {
        console.log('📚 Loading libraries...');
        await this.loadLibraries();
      }

      switch (message.action) {
        case 'toggle':
          console.log('🎨 Toggling drawing mode, current state:', this.isActive);
          await this.toggle();
          sendResponse({ 
            success: true, 
            active: this.isActive,
            message: `Drawing mode ${this.isActive ? 'activated' : 'deactivated'}` 
          });
          break;

        case 'setMode':
          console.log('🖌️ Setting drawing mode to:', message.mode);
          this.setMode(message.mode);
          sendResponse({ success: true, mode: message.mode });
          break;

        case 'setOptions':
          this.setOptions(message.options);
          sendResponse({ success: true });
          break;

        case 'clear':
          this.clear();
          sendResponse({ success: true });
          break;

        case 'deleteSelected':
          this.deleteSelected();
          sendResponse({ success: true });
          break;

        case 'undo':
          this.undo();
          sendResponse({ success: true });
          break;

        case 'capture':
          const dataUrl = await this.capture(message.includeBackground);
          sendResponse({ success: true, dataUrl });
          break;

        case 'download':
          await this.download(message.includeBackground);
          sendResponse({ success: true });
          break;

        default:
          console.warn('⚠️ Unknown message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }

    } catch (error) {
      console.error('❌ Error handling message:', error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  private async toggle(): Promise<void> {
    if (this.isActive) {
      await this.deactivate();
    } else {
      await this.activate();
    }
  }

  private async activate(): Promise<void> {
    if (this.isActive || !this.librariesLoaded) return;
    document.body.style.pointerEvents = 'none';
    try {
      // 先不创建overlay，专注Canvas问题
      // this.overlay = this.createOverlay();
      
      this.createCanvas();
      this.createToolbar();
      
        // 延迟初始化DrawingEngine，确保Canvas完全准备好
        setTimeout(() => {
          this.drawingEngine = new DrawingEngine(this.canvas!);
          
          // 强制设置初始模式和选项
          this.drawingEngine.setMode(this.currentMode);
          this.drawingEngine.setOptions(this.currentOptions);
          
          console.log('DrawingEngine created successfully');
      }, 500);
      
      this.isActive = true;
      
      this.showNotification('绘画模式已激活 🎨 现在可以在页面上绘画了！', 'success');
      
    } catch (error) {
      console.error('❌ Failed to activate drawing mode:', error);
      this.showNotification('绘画模式激活失败: ' + (error as Error).message, 'error');
    }
  }

  private deactivate(): void {
    // 安全移除canvas
    this.safeRemoveElement(this.canvas);
    this.canvas = null;
    
    // 安全移除toolbar
    this.safeRemoveElement(this.toolbar);
    this.toolbar = null;
    
    // 安全移除overlay
    this.safeRemoveElement(this.overlay);
    this.overlay = null;
    
    // 清理任何可能的文本编辑状态
    if (this.drawingEngine) {
      this.drawingEngine.destroy();
    }
    
    // 恢复页面交互
    document.body.style.pointerEvents = '';
    window.removeEventListener('resize', this.handleResize);
    this.isActive = false;
    this.drawingEngine = null;
    this.showNotification('绘图模式已关闭', 'info');
  }

  private createCanvas(): void {
    // 移除可能存在的旧Canvas
    const oldCanvas = document.getElementById('drawing-canvas-overlay');
    this.safeRemoveElement(oldCanvas);
    
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'drawing-canvas-overlay';
    this.canvas.tabIndex = 0; // 允许canvas获得焦点以接收键盘事件
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.canvas.width = width;
    this.canvas.height = height;
    
    // 直接设置style属性
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0px';
    this.canvas.style.left = '0px';
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.canvas.style.zIndex = '999999998'; // 确保低于工具栏的z-index
    this.canvas.style.pointerEvents = 'auto';
    this.canvas.style.background = 'transparent'; // 移除测试背景
    // 移除测试边框

    // 直接添加到body最后
    document.body.appendChild(this.canvas);
    
    console.log('🎨 Canvas created and added to body');
    console.log('Canvas element:', this.canvas);
    console.log('Canvas computed style:', window.getComputedStyle(this.canvas));
  }

  private preventPageEvents(e: Event): void {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }

  private createOverlay(): HTMLDivElement {
    // 创建一个完全覆盖页面的透明层来阻止所有页面交互
    const overlay = document.createElement('div');
    overlay.id = 'drawing-page-overlay';
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 2147483646 !important;
      background: transparent !important;
      pointer-events: auto !important;
      user-select: none !important;
    `;
    
    // 阻止所有页面交互事件
    ['click', 'mousedown', 'mouseup', 'mousemove', 'touchstart', 'touchmove', 'touchend', 'wheel', 'scroll', 'contextmenu', 'selectstart'].forEach(event => {
      overlay.addEventListener(event, this.preventPageEvents.bind(this), { passive: false, capture: true });
    });
    
    document.documentElement.appendChild(overlay);
    return overlay;
  }

  private createToolbar(): void {
    // 创建工具栏
    this.toolbar = document.createElement('div');
    this.toolbar.id = 'drawing-toolbar-overlay';
    this.toolbar.style.cssText =
      'position: fixed !important;'
      + 'top: 16px !important;'
      + 'left: 50% !important;'
      + 'transform: translateX(-50%) !important;'
      + 'z-index: 2147483647 !important;'
      + "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif !important;"
      + 'user-select: none !important;'
      + 'pointer-events: auto !important;'
      + 'transition: all 0.2s ease !important;'
      + 'font-size: 12px !important;';

    // Figma风格主工具栏（draw-前缀，分组+分隔线+属性区）
    this.toolbar.innerHTML = `
      <div class="draw-toolbar">
        <div class="draw-toolbar-content">
          <div class="draw-toolbar-group">
            <button class="draw-tool-btn active" data-mode="select" title="选择 (V)"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M4.5 2L11.5 9L8 14L6 9L4.5 2Z" fill="currentColor"/></svg></button>
            <button class="draw-tool-btn" data-mode="pen" title="画笔 (P)"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M12.7 3.3C13.1 2.9 13.1 2.3 12.7 1.9L12.1 1.3C11.7 0.9 11.1 0.9 10.7 1.3L2 10V14H6L14.7 5.3C15.1 4.9 15.1 4.3 14.7 3.9L14.1 3.3C13.7 2.9 13.1 2.9 12.7 3.3L4 12H4L12.7 3.3Z" fill="currentColor"/></svg></button>
            <button class="draw-tool-btn" data-mode="line" title="直线 (L)"><svg width="16" height="16" viewBox="0 0 16 16"><line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" stroke-width="2"/></svg></button>
            <button class="draw-tool-btn" data-mode="rectangle" title="矩形 (R)"><svg width="16" height="16" viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" fill="currentColor"/></svg></button>
            <button class="draw-tool-btn" data-mode="circle" title="椭圆 (O)"><svg width="16" height="16" viewBox="0 0 16 16"><ellipse cx="8" cy="8" rx="6" ry="6" fill="currentColor"/></svg></button>
            <button class="draw-tool-btn" data-mode="text" title="文字 (T)"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M2.5 3H13.5V5H9.5V13H6.5V5H2.5V3Z" fill="currentColor"/></svg></button>
          </div>
          <div class="draw-divider"></div>
          <div class="draw-toolbar-group">
            <input id="draw-color-picker" type="color" title="颜色" style="width:28px;height:28px;border:none;background:transparent;cursor:pointer;" />
            <label style="display:flex;align-items:center;gap:2px;font-size:12px;">
              <span>线宽</span>
              <input id="draw-stroke-width" type="range" min="1" max="16" value="2" style="width:48px;" />
              <span id="draw-stroke-width-value">2</span>
            </label>
            <label style="display:flex;align-items:center;gap:2px;font-size:12px;">
              <span>透明</span>
              <input id="draw-opacity" type="range" min="0.1" max="1" step="0.01" value="1" style="width:48px;" />
              <span id="draw-opacity-value">1</span>
            </label>
            <label style="display:flex;align-items:center;gap:2px;font-size:12px;">
              <span>字号</span>
              <input id="draw-font-size" type="range" min="10" max="64" value="16" style="width:48px;" />
              <span id="draw-font-size-value">16</span>
            </label>
            <div class="draw-align-group">
              <button class="draw-align-btn" data-align="left" title="左对齐">L</button>
              <button class="draw-align-btn" data-align="center" title="居中">C</button>
              <button class="draw-align-btn" data-align="right" title="右对齐">R</button>
            </div>
            <div class="draw-weight-group">
              <button class="draw-weight-btn" data-weight="normal" title="常规">常</button>
              <button class="draw-weight-btn" data-weight="bold" title="加粗">粗</button>
            </div>
          </div>
          <div class="draw-divider"></div>
          <div class="draw-toolbar-group">
            <button class="draw-tool-btn" id="undo-btn" title="撤销 (⌘Z)"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 3V1L4 5L8 9V7C10.76 7 13 9.24 13 12C13 12.65 12.87 13.26 12.64 13.83L13.92 15.12C14.58 14.22 15 13.16 15 12C15 8.14 11.86 5 8 5V3Z" fill="currentColor"/></svg></button>
            <button class="draw-tool-btn" id="delete-selected-btn" title="删除选中 (Del)"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M5 2H11V3H14V5H2V3H5V2ZM3 6H13V14H3V6ZM5 8V12H7V8H5ZM9 8V12H11V8H9Z" fill="currentColor"/></svg></button>
            <button class="draw-tool-btn" id="clear-btn" title="清空画布"><svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 2C4.7 2 2 4.7 2 8C2 11.3 4.7 14 8 14C11.3 14 14 11.3 14 8C14 4.7 11.3 2 8 2ZM8 3C10.8 3 13 5.2 13 8C13 10.8 10.8 13 8 13C5.2 13 3 10.8 3 8C3 5.2 5.2 3 8 3ZM5.7 5L5 5.7L7.3 8L5 10.3L5.7 11L8 8.7L10.3 11L11 10.3L8.7 8L11 5.7L10.3 5L8 7.3L5.7 5Z" fill="currentColor"/></svg></button>
          </div>
        </div>
      </div>
    `;
    document.documentElement.appendChild(this.toolbar);
    // 添加样式
    const style = document.createElement('style');
    style.innerHTML = `
      .draw-toolbar { background: #2C2C2C !important; border-radius: 6px !important; box-shadow: 0 2px 5px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2) !important; margin: 0 !important; padding: 6px !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important; }
      .draw-toolbar-content { display: flex !important; align-items: center !important; gap: 8px !important; }
      .draw-toolbar-group { display: flex !important; align-items: center !important; gap: 4px !important; }
      .draw-divider { width: 1px !important; height: 24px !important; background-color: #444 !important; margin: 0 4px !important; }
      .draw-tool-btn { width: 32px !important; height: 32px !important; border-radius: 2px !important; display: flex !important; align-items: center !important; justify-content: center !important; background: transparent !important; border: none !important; color: #ACACAC !important; cursor: pointer !important; padding: 0 !important; transition: background-color 0.1s ease, color 0.1s ease !important; }
      .draw-tool-btn:hover { background-color: #3E3E3E !important; color: #FFF !important; }
      .draw-tool-btn.active { background-color: #0D99FF !important; color: #FFF !important; }
      @media (max-width: 600px) { .draw-toolbar { padding: 4px !important; } .draw-tool-btn { width: 28px !important; height: 28px !important; } .draw-divider { height: 20px !important; } }
    `;
    document.head.appendChild(style);
    this.setupToolbarEvents();
    this.setupToolbarDragging();
    console.log('🎨 Toolbar created');
  }

  private setupToolbarEvents(): void {
    if (!this.toolbar) return;
    // 工具栏按钮事件
    const buttons = this.toolbar.querySelectorAll('.draw-tool-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const mode = button.dataset.mode;
        if (mode) {
          this.setModeUI(mode as DrawingMode);
        } else if (button.id === 'undo-btn') {
          this.drawingEngine?.undo();
        } else if (button.id === 'delete-selected-btn') {
          this.drawingEngine?.deleteSelected();
        } else if (button.id === 'clear-btn') {
          if (confirm('确定要清空画布吗？')) {
            this.drawingEngine?.clear();
          }
        }
      });
    });
    // 颜色选择
    const colorPicker = this.toolbar.querySelector('#draw-color-picker') as HTMLInputElement;
    if (colorPicker) {
      colorPicker.value = this.currentOptions.color;
      colorPicker.addEventListener('input', (e) => {
        this.currentOptions.color = (e.target as HTMLInputElement).value;
        this.updateOptions();
        this.updateSelectedObjectStyle({ color: this.currentOptions.color });
      });
    }
    // 线宽
    const strokeWidth = this.toolbar.querySelector('#draw-stroke-width') as HTMLInputElement;
    const strokeWidthValue = this.toolbar.querySelector('#draw-stroke-width-value') as HTMLSpanElement;
    if (strokeWidth && strokeWidthValue) {
      strokeWidth.value = this.currentOptions.strokeWidth.toString();
      strokeWidthValue.textContent = this.currentOptions.strokeWidth.toString();
      strokeWidth.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        this.currentOptions.strokeWidth = value;
        strokeWidthValue.textContent = value.toString();
        this.updateOptions();
        this.updateSelectedObjectStyle({ strokeWidth: value });
      });
    }
    // 透明度
    const opacity = this.toolbar.querySelector('#draw-opacity') as HTMLInputElement;
    const opacityValue = this.toolbar.querySelector('#draw-opacity-value') as HTMLSpanElement;
    if (opacity && opacityValue) {
      opacity.value = this.currentOptions.opacity.toString();
      opacityValue.textContent = this.currentOptions.opacity.toString();
      opacity.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.currentOptions.opacity = value;
        opacityValue.textContent = value.toString();
        this.updateOptions();
        this.updateSelectedObjectStyle({ opacity: value });
      });
    }
    // 字体大小
    const fontSize = this.toolbar.querySelector('#draw-font-size') as HTMLInputElement;
    const fontSizeValue = this.toolbar.querySelector('#draw-font-size-value') as HTMLSpanElement;
    if (fontSize && fontSizeValue) {
      fontSize.value = this.currentOptions.fontSize.toString();
      fontSizeValue.textContent = this.currentOptions.fontSize.toString();
      fontSize.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        this.currentOptions.fontSize = value;
        fontSizeValue.textContent = value.toString();
        this.updateOptions();
        this.updateSelectedObjectStyle({ fontSize: value });
      });
    }
    // 文本对齐
    const alignButtons = this.toolbar.querySelectorAll('.draw-align-btn') as NodeListOf<HTMLButtonElement>;
    alignButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        alignButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const alignType = btn.dataset.align;
        if (alignType) {
          const align = alignType as 'left' | 'center' | 'right';
          this.currentOptions.textAlign = align;
          this.updateOptions();
          this.updateSelectedObjectStyle({ textAlign: align });
        }
      });
    });
    // 字体粗细
    const weightButtons = this.toolbar.querySelectorAll('.draw-weight-btn') as NodeListOf<HTMLButtonElement>;
    weightButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        weightButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const weightType = btn.dataset.weight;
        if (weightType) {
          this.currentOptions.fontWeight = weightType as 'normal' | 'bold';
          this.updateOptions();
          this.updateSelectedObjectStyle({ fontWeight: weightType });
        }
      });
    });
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        this.drawingEngine?.undo();
      }
      if (e.key === 'v' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.setModeUI('select');
      }
      if (e.key === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.setModeUI('rectangle');
      }
      if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.setModeUI('text');
      }
    });
  }

  private initializeTextDropdownStates(): void {
    if (!this.toolbar) return;

    // 设置默认的文本对齐状态（寻找data-align="left"的按钮）
    const defaultAlignBtn = this.toolbar.querySelector('.align-btn[data-align="left"]') as HTMLButtonElement;
    if (defaultAlignBtn) {
      defaultAlignBtn.classList.add('active');
    }

    // 设置默认的字体重量状态（寻找data-weight="normal"的按钮）
    const defaultWeightBtn = this.toolbar.querySelector('.weight-btn[data-weight="normal"]') as HTMLButtonElement;
    if (defaultWeightBtn) {
      defaultWeightBtn.classList.add('active');
    }
  }

  private setupToolbarDragging(): void {
    // 工具栏拖拽功能
    if (!this.toolbar) return;
    
    const toolbar = this.toolbar;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    
    // 拖动开始
    toolbar.addEventListener('mousedown', (e: MouseEvent) => {
      // 忽略按钮点击
      if ((e.target as HTMLElement).closest('.figma-tool-button')) return;
      
      isDragging = true;
      startX = e.clientX - toolbar.offsetLeft;
      startY = e.clientY - toolbar.offsetTop;
      toolbar.style.cursor = 'grabbing';
    });
    
    // 拖动过程
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isDragging) return;
      
      const left = e.clientX - startX;
      const top = e.clientY - startY;
      toolbar.style.left = left + 'px';
      toolbar.style.top = top + 'px';
      toolbar.style.transform = 'none';
    });
    
    // 拖动结束
    document.addEventListener('mouseup', () => {
      isDragging = false;
      if (toolbar) toolbar.style.cursor = '';
    });
  }
  
  // 设置工具UI

  private setModeUI(mode: DrawingMode): void {
    console.log('🎨 Updating UI for mode:', mode);
    this.currentMode = mode;
    
    if (this.drawingEngine) {
      this.drawingEngine.setMode(mode);
    }

    if (!this.toolbar) return;

    // 更新 draw 风格按钮样式
    const toolButtons = this.toolbar.querySelectorAll('.draw-tool-btn') as NodeListOf<HTMLButtonElement>;
    toolButtons.forEach(btn => {
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  private updateOptions(): void {
    if (this.drawingEngine) {
      this.drawingEngine.setOptions(this.currentOptions);
    }
  }

  private updateSelectedObjectStyle(changes: Partial<DrawingOptions>): void {
    if (this.drawingEngine) {
      const selectedObject = this.drawingEngine.getSelectedObject();
      if (selectedObject) {
        this.drawingEngine.updateObjectProperties(selectedObject, changes);
      }
    }
  }

  private handleResize(): void {
    if (this.canvas && this.drawingEngine) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      this.canvas.width = width;
      this.canvas.height = height;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
      
      this.drawingEngine.resize(width, height);
    }
  }

  private setMode(mode: DrawingMode): void {
    console.log('🎯 Setting mode to:', mode);
    this.currentMode = mode;
    
    if (this.drawingEngine) {
      this.drawingEngine.setMode(mode);
      console.log('DrawingEngine mode updated to:', mode);
    }
    
    // 更新UI
    this.setModeUI(mode);
  }

  private setOptions(options: DrawingOptions): void {
    if (this.drawingEngine) {
      this.drawingEngine.setOptions(options);
    }
  }

  private clear(): void {
    if (this.drawingEngine) {
      this.drawingEngine.clear();
    }
  }

  private deleteSelected(): void {
    if (this.drawingEngine) {
      this.drawingEngine.deleteSelected();
    }
  }

  private undo(): void {
    if (this.drawingEngine) {
      this.drawingEngine.undo();
    }
  }

  private async capture(includeBackground: boolean = true): Promise<string> {
    if (!this.drawingEngine) {
      throw new Error('Drawing engine not initialized');
    }

    if (includeBackground) {
      return await this.drawingEngine.captureWithBackground();
    } else {
      return this.drawingEngine.exportDrawing();
    }
  }

  private async download(includeBackground: boolean = true): Promise<void> {
    const dataUrl = await this.capture(includeBackground);
    
    const link = document.createElement('a');
    link.download = `drawing_${new Date().getTime()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    
    // 安全地移除链接
    setTimeout(() => {
      this.safeRemoveElement(link);
    }, 100);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'} !important;
      color: white !important;
      padding: 12px 20px !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
      z-index: 9999999 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      opacity: 0 !important;
      transform: translateY(-10px) !important;
      transition: all 0.3s ease !important;
      max-width: 300px !important;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);

    // 动画显示
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    });

    // 自动隐藏
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        this.safeRemoveElement(notification);
      }, 300);
    }, 3000);
  }

  // 公共调试方法
  public debugToggle(): Promise<void> {
    return this.toggle();
  }

  public getStatus(): boolean {
    return this.isActive;
  }
}

// 初始化内容脚本
console.log('🎨 Drawing extension content script loading...');
const contentScript = new ContentScript();
console.log('✅ Drawing extension content script loaded successfully!');

(window as any).debugDrawing = {
  contentScript,
  activate: () => contentScript.debugToggle(),
  isActive: () => contentScript.getStatus()
};
