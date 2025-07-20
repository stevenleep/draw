export class SettingsManager {
  private settings: Record<string, any> = {};

  constructor() {
    this.loadSettingsFromStorage();
  }

  public setupSettings(toolbar: HTMLElement | null): void {
    if (!toolbar) return;

    const settingsBtn = toolbar.querySelector("#settings-btn") as HTMLButtonElement;
    const settingsPanel = toolbar.querySelector(".figma-settings-panel") as HTMLElement;

    if (!settingsBtn || !settingsPanel) return;

    settingsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleSettingsPanel(toolbar);
    });

    // 点击其他地方关闭设置面板
    document.addEventListener("mousedown", (e) => {
      if (!settingsPanel.contains(e.target as Node) && !settingsBtn.contains(e.target as Node)) {
        settingsPanel.style.display = "none";
      }
    });

    // 设置项事件
    const elements = {
      "#auto-save": (el: HTMLInputElement) => this.saveSetting("autoSave", el.checked),
      "#show-shortcuts": (el: HTMLInputElement) => {
        this.saveSetting("showShortcuts", el.checked);
        this.updateShortcutsVisibility(toolbar);
      },
      "#enable-sound": (el: HTMLInputElement) => this.saveSetting("enableSound", el.checked),
      "#canvas-quality": (el: HTMLSelectElement) => {
        this.saveSetting("canvasQuality", el.value);
        this.updateCanvasQuality(toolbar);
      },
      "#reset-settings": () => this.resetSettings(),
      "#export-settings": () => this.exportSettings(),
    };

    Object.entries(elements).forEach(([selector, handler]) => {
      const element = settingsPanel.querySelector(selector) as HTMLInputElement | HTMLSelectElement | HTMLButtonElement;
      if (element) {
        element.addEventListener(element.type === "button" ? "click" : "change", () => handler(element as any));
      }
    });
  }

  public loadSettings(toolbar: HTMLElement | null): void {
    try {
      const settings = JSON.parse(localStorage.getItem("drawing-extension-settings") || "{}");

      const elements = {
        autoSave: "#auto-save",
        showShortcuts: "#show-shortcuts",
        enableSound: "#enable-sound",
        canvasQuality: "#canvas-quality",
      };

      Object.entries(elements).forEach(([key, selector]) => {
        const element = toolbar?.querySelector(selector) as HTMLInputElement | HTMLSelectElement;
        if (element && settings[key] !== undefined) {
          if (element.type === "checkbox") {
            (element as HTMLInputElement).checked = settings[key];
          } else {
            (element as HTMLSelectElement).value = settings[key];
          }
        }
      });

      if (settings.showShortcuts !== undefined) this.updateShortcutsVisibility(toolbar);
      if (settings.canvasQuality) this.updateCanvasQuality(toolbar);
    } catch (error) {
      console.warn("Failed to load settings:", error);
    }
  }

  private saveSetting(key: string, value: any): void {
    try {
      const settings = JSON.parse(localStorage.getItem("drawing-extension-settings") || "{}");
      settings[key] = value;
      localStorage.setItem("drawing-extension-settings", JSON.stringify(settings));
    } catch (error) {
      console.warn("Failed to save setting:", error);
    }
  }

  private updateShortcutsVisibility(toolbar: HTMLElement | null): void {
    const showShortcuts = toolbar?.querySelector("#show-shortcuts") as HTMLInputElement;
    toolbar?.querySelectorAll(".shortcut-hint").forEach((shortcut) => {
      (shortcut as HTMLElement).style.display = showShortcuts?.checked ? "block" : "none";
    });
  }

  private updateCanvasQuality(toolbar: HTMLElement | null): void {
    const canvasQuality = toolbar?.querySelector("#canvas-quality") as HTMLSelectElement;
    const canvas = document.querySelector("#drawing-canvas-overlay") as HTMLCanvasElement;
    if (canvasQuality && canvas) {
      const qualityMap = { high: "crisp-edges", low: "pixelated", medium: "auto" };
      canvas.style.imageRendering = qualityMap[canvasQuality.value as keyof typeof qualityMap] || "auto";
    }
  }

  private toggleSettingsPanel(toolbar: HTMLElement | null): void {
    const settingsPanel = toolbar?.querySelector(".figma-settings-panel") as HTMLElement;
    if (settingsPanel) {
      settingsPanel.style.display = settingsPanel.style.display === "none" ? "block" : "none";
    }
  }

  private resetSettings(): void {
    if (confirm("确定要重置所有设置吗？")) {
      ["drawing-extension-settings", "drawing-toolbar-position"].forEach((key) => localStorage.removeItem(key));
      location.reload();
    }
  }

  private exportSettings(): void {
    try {
      const settings = {
        toolbar: JSON.parse(localStorage.getItem("drawing-toolbar-position") || "{}"),
        extension: JSON.parse(localStorage.getItem("drawing-extension-settings") || "{}"),
      };

      const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "drawing-extension-settings.json";
      a.click();
      URL.revokeObjectURL(url);

      this.showNotification("设置已导出", "success");
    } catch (error) {
      console.error("Failed to export settings:", error);
      this.showNotification("导出失败", "error");
    }
  }

  private showNotification(message: string, type: "success" | "error" | "info" = "info"): void {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      background: ${type === "success" ? "#4CAF50" : type === "error" ? "#f44336" : "#2196F3"} !important;
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
      notification.style.opacity = "1";
      notification.style.transform = "translateY(0)";
    });

    // 自动隐藏
    setTimeout(() => {
      notification.style.opacity = "0";
      notification.style.transform = "translateY(-10px)";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  private loadSettingsFromStorage(): void {
    try {
      this.settings = JSON.parse(localStorage.getItem("drawing-extension-settings") || "{}");
    } catch (error) {
      console.warn("Failed to load settings:", error);
      this.settings = {};
    }
  }
}
