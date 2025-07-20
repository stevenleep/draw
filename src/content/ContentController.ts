import { DrawingManager } from "./core/DrawingManager";
import { MessageHandler } from "./core/MessageHandler";
import { ToolbarManager } from "./ui/ToolbarManager";

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
    if (this.isInitialized) {
      return;
    }
    this.messageHandler.notifyBackgroundScript();
    window.addEventListener("resize", () => {
      this.drawingManager.handleResize();
    });
    window.addEventListener("beforeunload", () => {
      this.cleanup();
    });
    this.isInitialized = true;
  }

  public async activate(): Promise<void> {
    await this.drawingManager.activate();
    this.toolbarManager.create();
  }

  public deactivate(): void {
    this.toolbarManager.destroy();
    this.drawingManager.deactivate();
  }

  public toggle(): Promise<void> {
    if (this.drawingManager.isDrawingActive()) {
      this.deactivate();
      return Promise.resolve();
    }
    return this.activate();
  }

  public getStatus(): boolean {
    return this.drawingManager.isDrawingActive();
  }

  private cleanup(): void {
    this.deactivate();
  }

  public debugToggle(): Promise<void> {
    return this.toggle();
  }
}

const contentController = new ContentController();

(window as any).drawingExtension = {
  controller: contentController,
  activate: () => contentController.activate(),
  deactivate: () => contentController.deactivate(),
  toggle: () => contentController.toggle(),
  getStatus: () => contentController.getStatus(),
};
