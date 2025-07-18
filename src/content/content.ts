import { DrawingEngine, type DrawingMode, type DrawingOptions } from '../lib/DrawingEngine';
import { PropertyPanel, type PropertyChangeEvent } from './PropertyPanel';
import { FigmaStylePropertyPanel } from './ui/FigmaStylePropertyPanel';
import html2canvas from 'html2canvas';

class ContentScript {
  private drawingEngine: DrawingEngine | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private toolbar: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private propertyPanel: PropertyPanel | null = null;
  private figmaPropertyPanel: FigmaStylePropertyPanel | null = null;
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
    textAlign: 'center',
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

    console.log('🎨 Activating drawing mode...');
    
    try {
      // 先不创建overlay，专注Canvas问题
      // this.overlay = this.createOverlay();
      
      this.createCanvas();
      
      // 检查Canvas是否真的在页面上
      console.log('Canvas in DOM:', document.contains(this.canvas));
      console.log('Canvas style:', this.canvas?.style.cssText);
      console.log('Canvas rect:', this.canvas?.getBoundingClientRect());
      
      this.createToolbar();
      
        // 延迟初始化DrawingEngine，确保Canvas完全准备好
        setTimeout(() => {
          this.drawingEngine = new DrawingEngine(this.canvas!);
          
          // 创建Figma风格属性面板
          this.figmaPropertyPanel = new FigmaStylePropertyPanel({
            onPropertyChange: this.handleFigmaPropertyChange.bind(this),
            onClose: () => this.figmaPropertyPanel?.hide()
          });
          
          // 设置对象编辑回调
          this.drawingEngine.setObjectEditCallback((object, position) => {
            this.figmaPropertyPanel?.show(object, position);
          });
          
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
    // 隐藏属性面板
    this.propertyPanel?.hide();
    this.figmaPropertyPanel?.hide();
    
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
    this.canvas.style.zIndex = '999999999';
    this.canvas.style.pointerEvents = 'auto';
    this.canvas.style.background = 'rgba(0,255,0,0.1)'; // 绿色背景测试
    this.canvas.style.border = '5px solid red';

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
    this.toolbar = document.createElement('div');
    this.toolbar.id = 'drawing-toolbar-overlay';
    this.toolbar.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: rgba(20, 20, 20, 0.88) !important;
      backdrop-filter: blur(24px) saturate(180%) !important;
      border-radius: 20px !important;
      padding: 8px !important;
      box-shadow: 
        0 16px 40px rgba(0, 0, 0, 0.12),
        0 8px 16px rgba(0, 0, 0, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif !important;
      user-select: none !important;
      pointer-events: auto !important;
      color: white !important;
      cursor: move !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      max-width: min(90vw, 800px) !important;
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
    `;

    this.toolbar.innerHTML = `
      <div id="toolbar-content" style="
        display: flex; 
        align-items: center; 
        gap: 4px;
        padding: 4px;
      ">
        <!-- 拖拽手柄 -->
        <div id="toolbar-handle" style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          cursor: grab;
          border-radius: 12px;
          transition: all 0.2s ease;
        " title="拖拽移动工具栏 • 快捷键: 1-9选择工具, Del删除, ⌘C复制, ⌘V粘贴 • 选中元素查看属性面板">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="4" cy="4" r="1.5" fill="rgba(255,255,255,0.4)"/>
            <circle cx="12" cy="4" r="1.5" fill="rgba(255,255,255,0.4)"/>
            <circle cx="4" cy="8" r="1.5" fill="rgba(255,255,255,0.4)"/>
            <circle cx="12" cy="8" r="1.5" fill="rgba(255,255,255,0.4)"/>
            <circle cx="4" cy="12" r="1.5" fill="rgba(255,255,255,0.4)"/>
            <circle cx="12" cy="12" r="1.5" fill="rgba(255,255,255,0.4)"/>
          </svg>
        </div>

        <!-- 分隔线 -->
        <div style="width: 1px; height: 24px; background: rgba(255, 255, 255, 0.12); margin: 0 4px;"></div>

        <!-- 绘画工具 -->
        <div class="tool-group" style="display: flex; gap: 2px;">
          <button class="tool-btn active" data-mode="select" title="选择工具 (快捷键: V)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L6 14L8 8L14 6L2 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
          
          <button class="tool-btn" data-mode="pen" title="画笔 (快捷键: 1)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 14L6 10L10 6L14 2L12 4L8 8L4 12L2 14Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
          
          <!-- 图形工具组 -->
          <div class="tool-dropdown" style="position: relative;">
            <button class="tool-btn" data-mode="rectangle" title="图形工具">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="12" height="12" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
              <svg width="6" height="4" viewBox="0 0 6 4" fill="currentColor" style="margin-left: 2px; opacity: 0.7;">
                <path d="M3 4L0 1h6l-3 3z"/>
              </svg>
            </button>
            <div class="dropdown-content">
              <div class="dropdown-header">选择图形</div>
              <div class="shapes-grid">
                <button class="shape-btn" data-mode="rectangle" title="矩形">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="2" width="14" height="14" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  </svg>
                  <span>矩形</span>
                </button>
                <button class="shape-btn" data-mode="circle" title="圆形">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <circle cx="9" cy="9" r="7" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  </svg>
                  <span>圆形</span>
                </button>
                <button class="shape-btn" data-mode="triangle" title="三角形">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 2L16 16H2L9 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  </svg>
                  <span>三角形</span>
                </button>
                <button class="shape-btn" data-mode="star" title="星形">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M9 1L11 7H17L12 11L14 17L9 13L4 17L6 11L1 7H7L9 1Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  </svg>
                  <span>星形</span>
                </button>
                <button class="shape-btn" data-mode="line" title="直线">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 16L16 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  </svg>
                  <span>直线</span>
                </button>
                <button class="shape-btn" data-mode="arrow" title="箭头">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M2 16L16 2M16 2L16 9M16 2L9 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                  </svg>
                  <span>箭头</span>
                </button>
              </div>
            </div>
          </div>

          <button class="tool-btn" data-mode="text" title="文字 (快捷键: 3)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 3H12M8 3V13M6 13H10" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
          
          <button class="tool-btn" data-mode="hand-drawn" title="手绘 (快捷键: 4)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 6C4 4 6 6 8 4C10 2 12 4 14 6" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>

          <button class="tool-btn" data-mode="eraser" title="橡皮擦 (快捷键: 5)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 6L14 10L10 14L2 6L6 2L10 6Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
        </div>

        <!-- 分隔线 -->
        <div style="width: 1px; height: 24px; background: rgba(255, 255, 255, 0.12); margin: 0 4px;"></div>

        <!-- 颜色和粗细 -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <input type="color" id="color-picker" value="#000000" style="
            width: 28px; 
            height: 28px; 
            border: none; 
            border-radius: 8px; 
            cursor: pointer;
            background: none;
            outline: none;
          " title="颜色">
          
          <div style="display: flex; align-items: center; gap: 6px;">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="rgba(255,255,255,0.6)">
              <circle cx="6" cy="6" r="1"/>
            </svg>
            <input type="range" id="stroke-width" min="1" max="20" value="2" style="
              width: 60px; 
              height: 4px;
              appearance: none;
              background: rgba(255, 255, 255, 0.2);
              border-radius: 2px;
              outline: none;
              cursor: pointer;
            " title="粗细">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="rgba(255,255,255,0.6)">
              <circle cx="6" cy="6" r="3"/>
            </svg>
          </div>
        </div>

        <!-- 分隔线 -->
        <div style="width: 1px; height: 24px; background: rgba(255, 255, 255, 0.12); margin: 0 4px;"></div>

        <!-- 操作按钮 -->
        <div class="tool-group" style="display: flex; gap: 2px;">
          <button class="action-btn" id="undo-btn" title="撤销 (⌘Z)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8C3 5.5 5 3.5 7.5 3.5C10 3.5 12 5.5 12 8S10 12.5 7.5 12.5H6" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M8 6L6 8L8 10" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
          <button class="action-btn" id="delete-selected-btn" title="删除选中 (Del)">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 2H10V4H6V2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M3 4H13V4C13 4 13 4 12 4H4C3 4 3 4 3 4Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M5 6V12H11V6" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
          <button class="action-btn" id="clear-btn" title="清空画布">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 2L14 14M2 14L14 2" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
        </div>

        <!-- 分隔线 -->
        <div style="width: 1px; height: 24px; background: rgba(255, 255, 255, 0.12); margin: 0 4px;"></div>

        <!-- 导出按钮 -->
        <div class="tool-group" style="display: flex; gap: 2px;">
          <button class="action-btn" id="download-bg" title="导出含背景">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V10M8 10L5 7M8 10L11 7" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M2 12H14" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
          <button class="action-btn" id="download-pure" title="导出纯绘图">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 4H13V12H3V4Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M8 2V6M8 6L6 4M8 6L10 4" stroke="currentColor" stroke-width="1.5" fill="none"/>
            </svg>
          </button>
        </div>

        <!-- 分隔线 -->
        <div style="width: 1px; height: 24px; background: rgba(255, 255, 255, 0.12); margin: 0 4px;"></div>

        <!-- 关闭按钮 -->
        <button id="drawing-close" style="
          width: 32px;
          height: 32px;
          background: rgba(255, 59, 77, 0.9);
          color: white;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          margin-left: 4px;
        " title="关闭工具栏">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 3L11 11M3 11L11 3" stroke="currentColor" stroke-width="1.5" fill="none"/>
          </svg>
        </button>
      </div>

      <style>
        .tool-btn, .action-btn {
          width: 36px;
          height: 36px;
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          border: none;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }
        
        .tool-btn:hover, .action-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: rgba(255, 255, 255, 0.9);
          transform: translateY(-1px);
        }
        
        .tool-btn.active {
          background: rgba(99, 102, 241, 0.9);
          color: white;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }
        
        .tool-btn.active:hover {
          background: rgba(99, 102, 241, 1);
          transform: translateY(-1px);
        }

        #toolbar-handle:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        #toolbar-handle:active {
          cursor: grabbing;
          background: rgba(255, 255, 255, 0.12);
        }

        #drawing-close:hover {
          background: rgba(255, 59, 77, 1) !important;
          transform: translateY(-1px);
        }
        
        #stroke-width::-webkit-slider-thumb {
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        
        #stroke-width::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 768px) {
          #toolbar-content {
            flex-wrap: wrap;
            max-width: 90vw;
          }
        }
      </style>
    `;

    document.documentElement.appendChild(this.toolbar);
    this.setupToolbarEvents();
    this.setupToolbarDragging();
    console.log('🎨 Minimalist toolbar created');
  }

  private setupToolbarEvents(): void {
    if (!this.toolbar) return;

    // 关闭按钮
    const closeBtn = this.toolbar.querySelector('#drawing-close') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => this.deactivate());

    // 模式切换按钮
    const modeButtons = this.toolbar.querySelectorAll('.tool-btn') as NodeListOf<HTMLButtonElement>;
    console.log('🔧 Found tool buttons:', modeButtons.length);
    
    // 为工具栏添加统一的点击事件处理
    this.toolbar.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const toolBtn = target.closest('.tool-btn') as HTMLButtonElement;
      const shapeBtn = target.closest('.shape-btn') as HTMLButtonElement;
      
      if (shapeBtn) {
        // 处理图形工具选择
        e.preventDefault();
        e.stopPropagation();
        const mode = shapeBtn.dataset.mode;
        if (mode && this.toolbar) {
          console.log('🎨 Shape button clicked, switching to mode:', mode);
          this.setModeUI(mode as DrawingMode);
          
          // 更新主工具按钮的图标
          const mainToolBtn = this.toolbar.querySelector('.tool-dropdown .tool-btn') as HTMLButtonElement;
          if (mainToolBtn) {
            const shapeIcon = shapeBtn.querySelector('svg')?.cloneNode(true) as SVGElement;
            const dropdown = mainToolBtn.querySelector('svg:last-child')?.cloneNode(true) as SVGElement;
            mainToolBtn.innerHTML = '';
            if (shapeIcon) {
              shapeIcon.style.marginRight = '2px';
              mainToolBtn.appendChild(shapeIcon);
            }
            if (dropdown) {
              dropdown.style.marginLeft = '2px';
              dropdown.style.opacity = '0.7';
              mainToolBtn.appendChild(dropdown);
            }
            // 更新工具提示
            mainToolBtn.title = shapeBtn.title;
          }
          
          // 更新按钮状态
          this.toolbar.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
          this.toolbar.querySelectorAll('.shape-btn').forEach(btn => btn.classList.remove('active'));
          shapeBtn.classList.add('active');
          if (mainToolBtn) mainToolBtn.classList.add('active');
          
          // 隐藏下拉菜单（稍微延迟以确保点击完成）
          setTimeout(() => {
            if (this.toolbar) {
              const dropdown = this.toolbar.querySelector('.dropdown-content') as HTMLElement;
              if (dropdown) {
                dropdown.classList.remove('show');
                setTimeout(() => dropdown.style.display = 'none', 200);
              }
            }
          }, 150);
        }
      } else if (toolBtn && !toolBtn.closest('.tool-dropdown')) {
        // 处理普通工具选择（排除下拉菜单中的主按钮）
        e.preventDefault();
        e.stopPropagation();
        const mode = toolBtn.dataset.mode;
        if (mode && this.toolbar) {
          console.log('🎨 Tool button clicked, switching to mode:', mode);
          this.setModeUI(mode as DrawingMode);
          
          // 更新按钮状态
          this.toolbar.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
          this.toolbar.querySelectorAll('.shape-btn').forEach(btn => btn.classList.remove('active'));
          toolBtn.classList.add('active');
        }
      }
    });

    // 为下拉菜单添加更稳定的显示/隐藏逻辑
    const dropdown = this.toolbar.querySelector('.tool-dropdown');
    if (dropdown) {
      let hideTimeout: number;
      
      const showDropdown = () => {
        clearTimeout(hideTimeout);
        const content = dropdown.querySelector('.dropdown-content') as HTMLElement;
        if (content) {
          content.style.display = 'block';
          // 强制重排以确保动画生效
          content.offsetHeight;
          content.classList.add('show');
        }
      };
      
      const hideDropdown = () => {
        hideTimeout = window.setTimeout(() => {
          const content = dropdown.querySelector('.dropdown-content') as HTMLElement;
          if (content) {
            content.classList.remove('show');
            setTimeout(() => {
              if (!content.classList.contains('show')) {
                content.style.display = 'none';
              }
            }, 200); // 等待动画完成
          }
        }, 300); // 300ms延迟，给用户足够时间移动鼠标
      };
      
      // 主按钮悬停
      dropdown.addEventListener('mouseenter', showDropdown);
      dropdown.addEventListener('mouseleave', hideDropdown);
      
      // 下拉内容区域悬停
      const dropdownContent = dropdown.querySelector('.dropdown-content') as HTMLElement;
      if (dropdownContent) {
        dropdownContent.addEventListener('mouseenter', showDropdown);
        dropdownContent.addEventListener('mouseleave', hideDropdown);
      }
    }

    // 颜色选择器
    const colorPicker = this.toolbar.querySelector('#color-picker') as HTMLInputElement;
    colorPicker?.addEventListener('change', (e) => {
      this.currentOptions.color = (e.target as HTMLInputElement).value;
      this.updateOptions();
      // 如果有选中的对象，也更新该对象的颜色
      this.updateSelectedObjectStyle({ color: this.currentOptions.color });
    });

    // 线条粗细
    const strokeWidth = this.toolbar.querySelector('#stroke-width') as HTMLInputElement;
    strokeWidth?.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value);
      this.currentOptions.strokeWidth = value;
      this.updateOptions();
      // 如果有选中的对象，也更新该对象的粗细
      this.updateSelectedObjectStyle({ strokeWidth: this.currentOptions.strokeWidth });
      console.log('🖌️ Stroke width changed to:', value);
    });

    // 操作按钮
    const undoBtn = this.toolbar.querySelector('#undo-btn') as HTMLButtonElement;
    undoBtn?.addEventListener('click', () => this.undo());

    const deleteSelectedBtn = this.toolbar.querySelector('#delete-selected-btn') as HTMLButtonElement;
    deleteSelectedBtn?.addEventListener('click', () => this.deleteSelected());

    const clearBtn = this.toolbar.querySelector('#clear-btn') as HTMLButtonElement;
    clearBtn?.addEventListener('click', () => this.clear());

    const downloadBgBtn = this.toolbar.querySelector('#download-bg') as HTMLButtonElement;
    downloadBgBtn?.addEventListener('click', () => this.download(true));

    const downloadPureBtn = this.toolbar.querySelector('#download-pure') as HTMLButtonElement;
    downloadPureBtn?.addEventListener('click', () => this.download(false));
  }

  private setupToolbarDragging(): void {
    if (!this.toolbar) return;

    const handle = this.toolbar.querySelector('#toolbar-handle') as HTMLElement;
    if (!handle) {
      console.warn('⚠️ Toolbar handle not found');
      return;
    }

    const toolbar = this.toolbar;
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let currentPosition = { x: 0, y: 0 };

    const startDrag = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      isDragging = true;
      handle.style.cursor = 'grabbing';
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = toolbar.getBoundingClientRect();
      
      dragOffset.x = clientX - (rect.left + rect.width / 2);
      dragOffset.y = clientY - rect.top;
      
      toolbar.style.transition = 'none';
      document.body.style.cursor = 'grabbing';
      
      console.log('🖱️ Toolbar drag started');
    };

    const updatePosition = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      e.preventDefault();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const newX = clientX - dragOffset.x;
      const newY = clientY - dragOffset.y;
      
      // 边界检测
      const rect = toolbar.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width / 2;
      const minX = rect.width / 2;
      const maxY = window.innerHeight - rect.height - 20;
      const minY = 20;
      
      currentPosition.x = Math.max(minX, Math.min(maxX, newX));
      currentPosition.y = Math.max(minY, Math.min(maxY, newY));
      
      // 应用位置
      toolbar.style.left = `${currentPosition.x}px`;
      toolbar.style.top = `${currentPosition.y}px`;
      toolbar.style.bottom = 'auto';
      toolbar.style.transform = 'translateX(-50%)';
    };

    const endDrag = () => {
      if (!isDragging) return;
      
      isDragging = false;
      handle.style.cursor = 'grab';
      document.body.style.cursor = '';
      
      // 恢复过渡动画
      toolbar.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      
      // 自动吸附到底部中央（如果距离底部较近）
      const rect = toolbar.getBoundingClientRect();
      const distanceToBottom = window.innerHeight - rect.bottom;
      
      if (distanceToBottom < 150 && Math.abs(currentPosition.x - window.innerWidth / 2) < 200) {
        setTimeout(() => {
          toolbar.style.left = '50%';
          toolbar.style.top = 'auto';
          toolbar.style.bottom = '24px';
          toolbar.style.transform = 'translateX(-50%)';
          console.log('🧲 Auto-snap to bottom center');
        }, 100);
      }
      
      console.log('🖱️ Toolbar drag ended');
    };

    // 鼠标事件
    handle.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('mouseup', endDrag);

    // 触摸事件
    handle.addEventListener('touchstart', startDrag, { passive: false });
    document.addEventListener('touchmove', updatePosition, { passive: false });
    document.addEventListener('touchend', endDrag);

    // 防止工具栏其他按钮触发拖拽
    const buttons = toolbar.querySelectorAll('button, input');
    buttons.forEach(button => {
      button.addEventListener('mousedown', (e) => e.stopPropagation());
      button.addEventListener('touchstart', (e) => e.stopPropagation());
    });
  }

  private setModeUI(mode: DrawingMode): void {
    console.log('🎨 Updating UI for mode:', mode);
    this.currentMode = mode;
    
    if (this.drawingEngine) {
      this.drawingEngine.setMode(mode);
    }

    // 更新按钮样式
    const modeButtons = this.toolbar?.querySelectorAll('.tool-btn') as NodeListOf<HTMLButtonElement>;
    modeButtons?.forEach(btn => {
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

  private handlePropertyChange(event: PropertyChangeEvent): void {
    if (!this.drawingEngine) return;

    switch (event.type) {
      case 'style':
        if (event.changes) {
          this.drawingEngine.updateObjectProperties(event.object, event.changes);
        }
        break;
      
      case 'position':
        if (event.changes) {
          this.drawingEngine.updateObjectProperties(event.object, event.changes);
        }
        break;
      
      case 'delete':
        this.drawingEngine.deleteObject(event.object);
        break;
      
      case 'duplicate':
        this.drawingEngine.duplicateObject(event.object);
        break;
    }
  }

  private handleFigmaPropertyChange(changes: Partial<DrawingOptions & { x: number; y: number; width: number; height: number; rotation: number; text: string }>): void {
    if (!this.drawingEngine) return;
    
    const selectedObject = this.drawingEngine.getSelectedObject();
    if (!selectedObject) return;

    // 处理位置和尺寸变化
    if ('x' in changes || 'y' in changes || 'width' in changes || 'height' in changes) {
      const newBounds = {
        x: changes.x ?? selectedObject.bounds.x,
        y: changes.y ?? selectedObject.bounds.y,
        width: changes.width ?? selectedObject.bounds.width,
        height: changes.height ?? selectedObject.bounds.height
      };
      
      // 更新对象的bounds和坐标
      selectedObject.bounds = newBounds;
      this.drawingEngine.updateObjectCoordinatesFromBounds(selectedObject, newBounds);
    }

    // 处理旋转
    if ('rotation' in changes) {
      if (!selectedObject.transform) {
        selectedObject.transform = {
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          translateX: 0,
          translateY: 0
        };
      }
      selectedObject.transform.rotation = changes.rotation || 0;
    }

    // 处理文字内容
    if ('text' in changes) {
      selectedObject.text = changes.text;
    }

    // 处理其他样式属性
    const styleChanges = { ...changes };
    delete styleChanges.x;
    delete styleChanges.y;
    delete styleChanges.width;
    delete styleChanges.height;
    delete styleChanges.rotation;
    delete styleChanges.text;

    if (Object.keys(styleChanges).length > 0) {
      Object.assign(selectedObject.options, styleChanges);
    }

    // 重新绘制
    this.drawingEngine.redrawCanvas();
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
