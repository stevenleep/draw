import { DrawingManager } from './core/DrawingManager';
import { MessageHandler } from './core/MessageHandler';
import { ToolbarManager } from './ui/ToolbarManager';

export class ContentController {
  private drawingManager: DrawingManager;
  private messageHandler: MessageHandler;
  private toolbarManager: ToolbarManager;
  private isInitialized = false;

  constructor() {
    this.drawingManager = new DrawingManager();
    this.messageHandler = new MessageHandler(this.drawingManager);
    this.toolbarManager = new ToolbarManager(this.drawingManager);
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔧 ContentController: Starting initialization...');
      
      // 尝试通知background script，但不阻止初始化
      try {
        this.messageHandler.notifyBackgroundScript();
      } catch (error) {
        console.warn('🔧 ContentController: Background notification failed, continuing initialization:', error);
      }
      
      // 设置窗口大小变化监听
      window.addEventListener('resize', () => {
        this.drawingManager.handleResize();
      });

      // 设置页面卸载时的清理
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });

      this.isInitialized = true;
      console.log('🔧 ContentController: Initialization completed successfully');
    } catch (error) {
      console.error('🔧 ContentController: Failed to initialize:', error);
      // 即使初始化失败，我们也设置标志以避免重复尝试
      this.isInitialized = true;
    }
  }

  public async activate(): Promise<void> {
    console.log('🔧 ContentController: Starting activation...');
    
    try {
      console.log('🔧 ContentController: Activating drawing manager...');
      await this.drawingManager.activate();
      console.log('🔧 ContentController: Drawing manager activated successfully');
      
      console.log('🔧 ContentController: Creating toolbar...');
      this.toolbarManager.create();
      console.log('🔧 ContentController: Toolbar creation completed');
      
      console.log('🔧 ContentController: Activation completed successfully');
    } catch (error) {
      console.error('🔧 ContentController: Failed to activate drawing mode:', error);
      throw error;
    }
  }

  public deactivate(): void {
    this.toolbarManager.destroy();
    this.drawingManager.deactivate();
  }

  public toggle(): Promise<void> {
    if (this.drawingManager.isDrawingActive()) {
      this.deactivate();
      return Promise.resolve();
    } else {
      return this.activate();
    }
  }

  public getStatus(): boolean {
    return this.drawingManager.isDrawingActive();
  }

  private cleanup(): void {
    this.deactivate();
  }

  // 公共调试方法
  public debugToggle(): Promise<void> {
    return this.toggle();
  }
}

// 创建全局实例
const contentController = new ContentController();

// 暴露到全局对象，方便调试
(window as any).drawingExtension = {
  controller: contentController,
  activate: () => contentController.activate(),
  deactivate: () => contentController.deactivate(),
  toggle: () => contentController.toggle(),
  getStatus: () => contentController.getStatus()
}; 