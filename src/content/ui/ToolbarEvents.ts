import { ToolbarManager } from "./ToolbarManager";
import type { DrawingMode } from "../../lib";

export class ToolbarEvents {
  private toolbarManager: ToolbarManager;
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private toolbarStart = { x: 0, y: 0 };

  constructor(toolbarManager: ToolbarManager) {
    this.toolbarManager = toolbarManager;
  }

  public setupEvents(): void {
    const toolbar = this.toolbarManager.getToolbar();
    if (!toolbar) {
      return;
    }

    this.setupToolbarEvents();
    this.setupToolbarDragging();
    this.setupPropertyEvents();
    this.setupKeyboardEvents();
  }

  private setupToolbarEvents(): void {
    const toolbar = this.toolbarManager.getToolbar();
    if (!toolbar) {
      return;
    }

    toolbar.querySelectorAll(".draw-tool-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const mode = button.dataset.mode;
        if (mode) {
          this.toolbarManager.setMode(mode as DrawingMode);
        } else if (button.id === "undo-btn") {
          this.toolbarManager.getDrawingManager().undo();
        } else if (button.id === "clear-btn") {
          this.toolbarManager.getDrawingManager().clear();
        } else if (button.id === "capture-btn") {
          this.toolbarManager.getDrawingManager().capture();
        } else if (button.id === "settings-btn") {
          this.toolbarManager.toggleSettingsPanel();
        } else if (button.id === "toggle-props-btn") {
          this.toolbarManager.togglePropertiesPanel();
        }
      });
    });
    const shapeMainBtn = toolbar.querySelector(".shape-main-btn") as HTMLButtonElement;
    if (shapeMainBtn) {
      shapeMainBtn.addEventListener("click", () => {
        const shapeDropdown = toolbar.querySelector(".shape-dropdown") as HTMLElement;
        if (shapeDropdown) {
          shapeDropdown.style.display = shapeDropdown.style.display === "grid" ? "none" : "grid";
        }
      });
    }
    toolbar.querySelectorAll(".shape-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const mode = button.dataset.mode;
        if (mode) {
          this.toolbarManager.setMode(mode as DrawingMode);
          const shapeDropdown = toolbar.querySelector(".shape-dropdown") as HTMLElement;
          if (shapeDropdown) {
            shapeDropdown.style.display = "none";
          }
        }
      });
    });
    document.addEventListener("click", (e) => {
      const shapeDropdown = toolbar.querySelector(".shape-dropdown") as HTMLElement;
      if (shapeDropdown && !toolbar.contains(e.target as Node)) {
        shapeDropdown.style.display = "none";
      }
    });
  }

  private setupToolbarDragging(): void {
    const toolbar = this.toolbarManager.getToolbar();
    if (!toolbar) {
      return;
    }

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".draw-tool-btn") || target.closest(".props-input") || target.closest(".props-slider")) {
        return;
      }
      if (target === toolbar || target.closest(".draw-toolbar-content")) {
        this.isDragging = true;
        this.dragStart = { x: e.clientX, y: e.clientY };
        const rect = toolbar.getBoundingClientRect();
        this.toolbarStart = { x: rect.left, y: rect.top };
        toolbar.style.cursor = "grabbing";
        toolbar.style.userSelect = "none";
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) {
        return;
      }
      const deltaX = e.clientX - this.dragStart.x;
      const deltaY = e.clientY - this.dragStart.y;
      const newX = this.toolbarStart.x + deltaX;
      const newY = this.toolbarStart.y + deltaY;
      const maxX = window.innerWidth - toolbar.offsetWidth;
      const maxY = window.innerHeight - toolbar.offsetHeight;
      toolbar.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
      toolbar.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
    };

    const handleMouseUp = () => {
      if (this.isDragging) {
        this.isDragging = false;
        toolbar.style.cursor = "grab";
        toolbar.style.userSelect = "auto";
        const rect = toolbar.getBoundingClientRect();
        localStorage.setItem(
          "drawing-toolbar-position",
          JSON.stringify({
            x: rect.left,
            y: rect.top,
          }),
        );
      }
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    toolbar.style.cursor = "grab";
    toolbar.addEventListener("mousedown", handleMouseDown);
  }

  private setupPropertyEvents(): void {
    const toolbar = this.toolbarManager.getToolbar();
    if (!toolbar) {
      return;
    }

    const colorPicker = toolbar.querySelector("#color-picker") as HTMLInputElement;
    if (colorPicker) {
      colorPicker.addEventListener("change", (e) => {
        const color = (e.target as HTMLInputElement).value;
        this.toolbarManager.getDrawingManager().setOptions({ color } as any);
      });
    }
    const strokeWidth = toolbar.querySelector("#stroke-width") as HTMLInputElement;
    const strokeWidthValue = toolbar.querySelector("#stroke-width-value") as HTMLElement;
    if (strokeWidth && strokeWidthValue) {
      strokeWidth.addEventListener("input", (e) => {
        const value = parseInt((e.target as HTMLInputElement).value, 10);
        strokeWidthValue.textContent = value.toString();
        this.toolbarManager.getDrawingManager().setOptions({ strokeWidth: value } as any);
      });
    }
    const opacity = toolbar.querySelector("#opacity") as HTMLInputElement;
    const opacityValue = toolbar.querySelector("#opacity-value") as HTMLElement;
    if (opacity && opacityValue) {
      opacity.addEventListener("input", (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        const PERCENT = 100;
        opacityValue.textContent = `${Math.round(value * PERCENT)}%`;
        this.toolbarManager.getDrawingManager().setOptions({ opacity: value } as any);
      });
    }
    const fontSize = toolbar.querySelector("#font-size") as HTMLInputElement;
    const fontSizeValue = toolbar.querySelector("#font-size-value") as HTMLElement;
    if (fontSize && fontSizeValue) {
      fontSize.addEventListener("input", (e) => {
        const value = parseInt((e.target as HTMLInputElement).value, 10);
        fontSizeValue.textContent = value.toString();
        this.toolbarManager.getDrawingManager().setOptions({ fontSize: value } as any);
      });
    }
    toolbar.querySelectorAll(".draw-align-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const align = button.dataset.align as "left" | "center" | "right";

        toolbar.querySelectorAll(".draw-align-btn").forEach((b) => b.classList.remove("active"));
        button.classList.add("active");

        this.toolbarManager.getDrawingManager().setOptions({ textAlign: align } as any);
      });
    });
    toolbar.querySelectorAll(".draw-weight-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const weight = button.dataset.weight as "normal" | "bold";

        toolbar.querySelectorAll(".draw-weight-btn").forEach((b) => b.classList.remove("active"));
        button.classList.add("active");

        this.toolbarManager.getDrawingManager().setOptions({ fontWeight: weight } as any);
      });
    });
  }

  private setupKeyboardEvents(): void {
    document.addEventListener("keydown", (e) => {
      if (document.activeElement?.id === "drawing-canvas-overlay") {
        return;
      }

      if (this.toolbarManager.getDrawingManager().isTextEditing()) {
        return;
      }

      if (!this.toolbarManager.getDrawingManager().isDrawingActive()) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const toolKeys: Record<string, DrawingMode> = {
        v: "select",
        p: "pen",
        t: "text",
        r: "rectangle",
        o: "circle",
        l: "line",
        a: "arrow",
        h: "highlighter",
        e: "eraser",
        s: "star",
        g: "triangle",
        d: "hand-drawn",
      };

      if (toolKeys[e.key.toLowerCase()] && !isCtrl && !isShift) {
        e.preventDefault();
        this.toolbarManager.setMode(toolKeys[e.key.toLowerCase()]);
        return;
      }

      switch (e.key.toLowerCase()) {
        case "delete":
        case "backspace":
          if (!isCtrl) {
            e.preventDefault();
            this.toolbarManager.getDrawingManager().deleteSelected();
          }
          break;
        case "z":
          if (isCtrl && !isShift) {
            e.preventDefault();
            this.toolbarManager.getDrawingManager().undo();
          }
          break;
        default:
          break;
      }
    });
  }
}
