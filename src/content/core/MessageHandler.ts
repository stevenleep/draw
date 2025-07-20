import { DrawingManager } from "./DrawingManager";

export class MessageHandler {
  private drawingManager: DrawingManager;

  constructor(drawingManager: DrawingManager) {
    this.drawingManager = drawingManager;
    this.setupMessageListener();
  }

  private setupMessageListener(): void {
    if (!chrome?.runtime?.onMessage) {
      console.warn("Chrome runtime not available, skipping message listener setup");
      return;
    }

    try {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sendResponse);
        return true;
      });
      console.log("Message listener setup completed");
    } catch (error) {
      console.warn("Failed to setup message listener:", error);
    }
  }

  private async handleMessage(message: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      if (!message || typeof message.action !== "string") {
        console.warn("Invalid message format:", message);
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
            throw new Error("Mode is required");
          }
          this.drawingManager.setMode(message.mode);
          return { success: true, mode: message.mode };
        },
        setOptions: () => {
          if (!message.options) {
            throw new Error("Options are required");
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
        console.warn("Unknown message action:", message.action);
        sendResponse({ success: false, error: `Unknown action: ${message.action}` });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  public notifyBackgroundScript(): void {
    if (!chrome?.runtime?.id) {
      console.warn("Extension context not available, skipping background notification");
      return;
    }

    setTimeout(() => {
      try {
        chrome.runtime.sendMessage(
          {
            action: "contentScriptReady",
            timestamp: Date.now(),
            url: window.location.href,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              console.warn("Background script notification failed:", chrome.runtime.lastError.message);
            } else {
              console.log("Background script notified successfully");
            }
          },
        );
      } catch (error) {
        console.warn("Failed to notify background script:", error);
      }
    }, 100);
  }
}
