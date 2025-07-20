import { DrawingManager } from "./DrawingManager";

export class MessageHandler {
  private drawingManager: DrawingManager;

  constructor(drawingManager: DrawingManager) {
    this.drawingManager = drawingManager;
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    if (!chrome?.runtime?.onMessage) {
      return;
    }
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true;
    });
  }

  private async handleMessage(message: any, sendResponse: (response: any) => void): Promise<void> {
    if (!message || typeof message.action !== "string") {
      sendResponse({ success: false, error: "Invalid message format" });
      return;
    }

    const actions = {
      toggle: async () => {
        const isActive = this.drawingManager.isDrawingActive();
        if (isActive) {
          this.drawingManager.deactivate();
        } else {
          await this.drawingManager.activate();
        }
        return {
          success: true,
          active: this.drawingManager.isDrawingActive(),
          message: `Drawing mode ${this.drawingManager.isDrawingActive() ? "activated" : "deactivated"}`,
        };
      },

      setMode: () => {
        if (!message.mode) {
          return { success: false, error: "Mode is required" };
        }
        this.drawingManager.setMode(message.mode);
        return { success: true, mode: message.mode };
      },

      setOptions: () => {
        if (!message.options) {
          return { success: false, error: "Options are required" };
        }
        this.drawingManager.setOptions(message.options);
        return { success: true };
      },

      clear: () => {
        this.drawingManager.clear();
        return { success: true };
      },

      deleteSelected: () => {
        this.drawingManager.deleteSelected();
        return { success: true };
      },

      undo: () => {
        this.drawingManager.undo();
        return { success: true };
      },

      capture: async () => {
        const dataUrl = await this.drawingManager.capture(message.includeBackground);
        return { success: true, dataUrl };
      },

      download: async () => {
        await this.drawingManager.download(message.includeBackground);
        return { success: true };
      },
    };

    const action = actions[message.action as keyof typeof actions];

    if (action) {
      const response = await action();
      sendResponse(response);
    } else {
      sendResponse({ success: false, error: `Unknown action: ${message.action}` });
    }
  }

  public notifyBackgroundScript(): void {
    if (!chrome?.runtime?.id) {
      return;
    }
    chrome.runtime.sendMessage({ action: "contentScriptReady", timestamp: Date.now(), url: window.location.href });
  }
}
