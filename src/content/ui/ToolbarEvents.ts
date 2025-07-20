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

    // 工具栏按钮事件
    toolbar.querySelectorAll(".figma-tool-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const mode = button.dataset.mode;

        if (mode) {
          this.toolbarManager.setMode(mode as DrawingMode);
        } else if (button.id === "undo-btn") {
          this.toolbarManager.getDrawingManager().undo();
        } else if (button.id === "clear-btn") {
          if (confirm("确定要清空画布吗？")) {
            this.toolbarManager.getDrawingManager().clear();
          }
        } else if (button.id === "capture-btn") {
          this.toolbarManager.getDrawingManager().capture();
        } else if (button.id === "settings-btn") {
          this.toolbarManager.toggleSettingsPanel();
        } else if (button.id === "toggle-props-btn") {
          this.toolbarManager.togglePropertiesPanel();
        }
      });
    });

    // 形状下拉菜单事件
    const shapeMainBtn = toolbar.querySelector(".shape-main-btn") as HTMLButtonElement;
    if (shapeMainBtn) {
      shapeMainBtn.addEventListener("click", () => {
        const shapeDropdown = toolbar.querySelector(".shape-dropdown") as HTMLElement;
        if (shapeDropdown) {
          shapeDropdown.style.display = shapeDropdown.style.display === "grid" ? "none" : "grid";
        }
      });
    }

    // 形状下拉菜单中的按钮事件
    toolbar.querySelectorAll(".shape-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const mode = button.dataset.mode;

        if (mode) {
          this.toolbarManager.setMode(mode as DrawingMode);
          // 关闭下拉菜单
          const shapeDropdown = toolbar.querySelector(".shape-dropdown") as HTMLElement;
          if (shapeDropdown) {
            shapeDropdown.style.display = "none";
          }
        }
      });
    });

    // 点击其他地方关闭下拉菜单
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

    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let toolbarStart = { x: 0, y: 0 };

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest(".figma-tool-btn") || target.closest(".props-input") || target.closest(".props-slider")) {
        return;
      }

      // 只有点击工具栏背景才能拖拽
      if (target === toolbar || target.closest(".figma-toolbar-content")) {
        isDragging = true;
        dragStart = { x: e.clientX, y: e.clientY };

        const rect = toolbar.getBoundingClientRect();
        toolbarStart = { x: rect.left, y: rect.top };

        toolbar.style.cursor = "grabbing";
        toolbar.style.userSelect = "none";

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);

        e.preventDefault();
        e.stopPropagation();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) {
        return;
      }

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      const newX = toolbarStart.x + deltaX;
      const newY = toolbarStart.y + deltaY;

      // 边界检查
      const maxX = window.innerWidth - toolbar.offsetWidth;
      const maxY = window.innerHeight - toolbar.offsetHeight;

      toolbar.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
      toolbar.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        toolbar.style.cursor = "grab";
        toolbar.style.userSelect = "auto";

        // 保存位置
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

    // 设置初始光标样式
    toolbar.style.cursor = "grab";

    toolbar.addEventListener("mousedown", handleMouseDown);
  }

  private setupPropertyEvents(): void {
    const toolbar = this.toolbarManager.getToolbar();
    if (!toolbar) {
      return;
    }

    // 颜色选择器
    const colorPicker = toolbar.querySelector("#color-picker") as HTMLInputElement;
    if (colorPicker) {
      colorPicker.addEventListener("change", (e) => {
        const color = (e.target as HTMLInputElement).value;
        this.toolbarManager.getDrawingManager().setOptions({ color } as any);
      });
    }

    // 线条粗细
    const strokeWidth = toolbar.querySelector("#stroke-width") as HTMLInputElement;
    const strokeWidthValue = toolbar.querySelector("#stroke-width-value") as HTMLElement;
    if (strokeWidth && strokeWidthValue) {
      strokeWidth.addEventListener("input", (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        strokeWidthValue.textContent = value.toString();
        this.toolbarManager.getDrawingManager().setOptions({ strokeWidth: value } as any);
      });
    }

    // 透明度
    const opacity = toolbar.querySelector("#opacity") as HTMLInputElement;
    const opacityValue = toolbar.querySelector("#opacity-value") as HTMLElement;
    if (opacity && opacityValue) {
      opacity.addEventListener("input", (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        opacityValue.textContent = `${Math.round(value * 100)}%`;
        this.toolbarManager.getDrawingManager().setOptions({ opacity: value } as any);
      });
    }

    // 字体大小
    const fontSize = toolbar.querySelector("#font-size") as HTMLInputElement;
    const fontSizeValue = toolbar.querySelector("#font-size-value") as HTMLElement;
    if (fontSize && fontSizeValue) {
      fontSize.addEventListener("input", (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        fontSizeValue.textContent = value.toString();
        this.toolbarManager.getDrawingManager().setOptions({ fontSize: value } as any);
      });
    }

    // 文本对齐按钮
    toolbar.querySelectorAll(".draw-align-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const align = button.dataset.align as "left" | "center" | "right";

        toolbar.querySelectorAll(".draw-align-btn").forEach((b) => b.classList.remove("active"));
        button.classList.add("active");

        this.toolbarManager.getDrawingManager().setOptions({ textAlign: align } as any);
      });
    });

    // 字体粗细按钮
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
      // 如果canvas是当前焦点元素，不处理工具栏快捷键
      if (document.activeElement?.id === "drawing-canvas-overlay") {
        console.log("🔧 Canvas is focused, skipping toolbar keyboard event");
        return;
      }

      // 检查是否在文本编辑状态，如果是则不处理工具栏快捷键
      if (this.toolbarManager.getDrawingManager().isTextEditing()) {
        console.log("🔧 Skipping toolbar keyboard event due to text editing");
        return;
      }

      console.log("🔧 Toolbar keyboard event:", e.key, "Drawing active:", this.toolbarManager.getDrawingManager().isDrawingActive());

      if (!this.toolbarManager.getDrawingManager().isDrawingActive()) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // 工具切换快捷键
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

      // 其他快捷键
      switch (e.key.toLowerCase()) {
        case "delete":
        case "backspace":
          if (!isCtrl) {
            e.preventDefault();
            this.toolbarManager.getDrawingManager().deleteSelected();
          }
          break;
        case "escape":
          e.preventDefault();
          // 可以在这里添加取消选择的逻辑
          break;
        case "z":
          if (isCtrl && !isShift) {
            e.preventDefault();
            this.toolbarManager.getDrawingManager().undo();
          }
          break;
        case "y":
          if (isCtrl) {
            e.preventDefault();
            // 重做功能暂时禁用
          }
          break;
      }
    });
  }
}
