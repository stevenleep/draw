import { DrawingManager } from "../core/DrawingManager";
import type { DrawingMode, DrawingOptions } from "../../lib";
import { ToolbarRenderer } from "./ToolbarRenderer";
import { ToolbarEvents } from "./ToolbarEvents";
import { SettingsManager } from "./SettingsManager";

export class ToolbarManager {
  private toolbar: HTMLElement | null = null;
  private drawingManager: DrawingManager;
  private renderer: ToolbarRenderer;
  private events: ToolbarEvents;
  private settings: SettingsManager;
  private currentMode: DrawingMode = "select";

  constructor(drawingManager: DrawingManager) {
    this.drawingManager = drawingManager;
    this.renderer = new ToolbarRenderer();
    this.events = new ToolbarEvents(this);
    this.settings = new SettingsManager();
  }

  public create(): void {
    console.log("🔧 ToolbarManager: Starting toolbar creation...");

    try {
      this.toolbar = this.renderer.createToolbar();
      console.log("🔧 ToolbarManager: Toolbar created successfully");

      this.events.setupEvents();
      console.log("🔧 ToolbarManager: Events setup completed");

      this.settings.setupSettings(this.toolbar);
      console.log("🔧 ToolbarManager: Settings setup completed");

      this.restorePosition();
      console.log("🔧 ToolbarManager: Position restored");

      this.loadSettings();
      console.log("🔧 ToolbarManager: Settings loaded");

      // 确保工具栏可见
      if (this.toolbar) {
        this.toolbar.style.display = "block";
        this.toolbar.style.visibility = "visible";
        this.toolbar.style.opacity = "1";
        console.log("🔧 ToolbarManager: Toolbar visibility ensured");
      }

      console.log("🔧 ToolbarManager: Toolbar creation completed successfully");
    } catch (error) {
      console.error("🔧 ToolbarManager: Error creating toolbar:", error);
      throw error;
    }
  }

  public destroy(): void {
    this.savePosition();
    this.safeRemoveElement(this.toolbar);
    this.toolbar = null;
  }

  public setMode(mode: DrawingMode): void {
    this.currentMode = mode;
    this.drawingManager.setMode(mode);
    this.updateModeUI(mode);
  }

  public getMode(): DrawingMode {
    return this.currentMode;
  }

  public getToolbar(): HTMLElement | null {
    return this.toolbar;
  }

  public getDrawingManager(): DrawingManager {
    return this.drawingManager;
  }

  public updateModeUI(mode: DrawingMode): void {
    if (!this.toolbar) return;

    // 更新按钮状态
    this.toolbar.querySelectorAll(".figma-tool-btn").forEach((btn) => {
      btn.classList.toggle("active", (btn as HTMLButtonElement).dataset.mode === mode);
    });

    // 显示/隐藏文本属性
    const textProps = this.toolbar.querySelector("#text-props") as HTMLElement;
    if (textProps) textProps.style.display = mode === "text" ? "block" : "none";

    this.syncShapeMainBtnActive(mode);
    this.syncShapeDropdownActive();
  }

  public togglePropertiesPanel(): void {
    if (!this.toolbar) return;

    const propsPanel = this.toolbar.querySelector(".figma-toolbar-properties") as HTMLElement;
    const textProps = this.toolbar.querySelector("#text-props") as HTMLElement;

    if (!propsPanel) return;

    const isVisible = propsPanel.style.display !== "none";
    propsPanel.style.display = isVisible ? "none" : "block";

    if (!isVisible && textProps) {
      textProps.style.display = this.currentMode === "text" ? "block" : "none";
      this.syncPropsPanelActiveStates();
    }
  }

  public toggleSettingsPanel(): void {
    if (!this.toolbar) return;

    const settingsPanel = this.toolbar.querySelector(".figma-settings-panel") as HTMLElement;
    if (settingsPanel) {
      settingsPanel.style.display = settingsPanel.style.display === "none" ? "block" : "none";
    }
  }

  private syncPropsPanelActiveStates(): void {
    if (!this.toolbar) return;

    const options = this.drawingManager.getOptions();

    // 文本对齐
    const align = options.textAlign || "left";
    this.toolbar.querySelectorAll(".draw-align-btn").forEach((btn) => {
      btn.classList.toggle("active", (btn as HTMLButtonElement).dataset.align === align);
    });

    // 字体粗细
    const weight = options.fontWeight || "normal";
    this.toolbar.querySelectorAll(".draw-weight-btn").forEach((btn) => {
      btn.classList.toggle("active", (btn as HTMLButtonElement).dataset.weight === weight);
    });
  }

  private syncShapeMainBtnActive(mode: string) {
    if (!this.toolbar) return;

    // 检查是否是形状模式
    const shapeModes = ["rectangle", "circle", "line", "arrow", "triangle", "star"];
    const isShapeMode = shapeModes.includes(mode);

    if (isShapeMode) {
      const shapeMainBtn = this.toolbar.querySelector(".shape-main-btn") as HTMLButtonElement;
      if (shapeMainBtn) {
        // 移除所有按钮的active状态
        this.toolbar.querySelectorAll(".figma-tool-btn").forEach((btn) => btn.classList.remove("active"));
        // 激活形状主按钮
        shapeMainBtn.classList.add("active");
        // 更新形状主按钮的data-mode
        shapeMainBtn.setAttribute("data-mode", mode);
      }
    }
  }

  private syncShapeDropdownActive() {
    if (!this.toolbar) return;
    const shapeDropdown = this.toolbar.querySelector(".shape-dropdown");
    if (shapeDropdown) {
      shapeDropdown.querySelectorAll(".shape-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.getAttribute("data-mode") === this.currentMode);
      });
    }
  }

  private restorePosition(): void {
    if (!this.toolbar) return;

    try {
      const position = JSON.parse(localStorage.getItem("drawing-toolbar-position") || "{}");
      if (position.x !== undefined && position.y !== undefined) {
        this.toolbar.style.left = `${position.x}px`;
        this.toolbar.style.top = `${position.y}px`;
      }
    } catch (error) {
      console.warn("Failed to restore toolbar position:", error);
    }
  }

  private savePosition(): void {
    if (!this.toolbar) return;

    try {
      const rect = this.toolbar.getBoundingClientRect();
      const position = { x: rect.left, y: rect.top };
      localStorage.setItem("drawing-toolbar-position", JSON.stringify(position));
    } catch (error) {
      console.warn("Failed to save toolbar position:", error);
    }
  }

  private loadSettings(): void {
    this.settings.loadSettings(this.toolbar);
  }

  private safeRemoveElement(element: Element | null): void {
    if (element && element.parentNode) {
      element.parentNode.removeChild(element);
    }
  }
}
