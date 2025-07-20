import { DrawingObject, DrawingOptions, DrawingMode } from "../lib";

export interface PropertyChangeEvent {
  type: "style" | "position" | "size" | "delete" | "duplicate";
  object: DrawingObject;
  changes?: Partial<DrawingOptions & { x: number; y: number; width: number; height: number }>;
}

export class PropertyPanel {
  private panel: HTMLElement | null = null;
  private currentObject: DrawingObject | null = null;
  private onPropertyChange?: (event: PropertyChangeEvent) => void;

  constructor(onPropertyChange?: (event: PropertyChangeEvent) => void) {
    this.onPropertyChange = onPropertyChange;
  }

  show(object: DrawingObject, position: { x: number; y: number }): void {
    this.currentObject = object;
    this.createPanel(position);
    this.updatePanelContent();
  }

  hide(): void {
    if (this.panel && this.panel.parentNode) {
      this.panel.parentNode.removeChild(this.panel);
      this.panel = null;
      this.currentObject = null;
    }
  }

  private createPanel(position: { x: number; y: number }): void {
    this.hide();

    this.panel = document.createElement("div");
    this.panel.id = "property-panel";
    this.panel.style.cssText = `
      position: fixed !important;
      left: ${Math.min(position.x, window.innerWidth - 280)}px !important;
      top: ${Math.min(position.y, window.innerHeight - 400)}px !important;
      width: 260px !important;
      max-height: 380px !important;
      background: rgba(20, 20, 20, 0.95) !important;
      backdrop-filter: blur(24px) saturate(180%) !important;
      border-radius: 16px !important;
      padding: 16px !important;
      box-shadow: 
        0 20px 50px rgba(0, 0, 0, 0.3),
        0 8px 20px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
      z-index: 2147483647 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      color: white !important;
      user-select: none !important;
      overflow-y: auto !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
    `;

    document.body.appendChild(this.panel);

    setTimeout(() => {
      document.addEventListener("click", this.handleOutsideClick.bind(this), { once: true });
    }, 100);
  }

  private handleOutsideClick(e: MouseEvent): void {
    if (this.panel && !this.panel.contains(e.target as Node)) {
      this.hide();
    }
  }

  private updatePanelContent(): void {
    if (!this.panel || !this.currentObject) return;

    const obj = this.currentObject;
    const isTextObject = obj.type === "text";
    const isShapeObject = ["rectangle", "circle", "star", "triangle"].includes(obj.type);

    this.panel.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="margin: 0; font-size: 16px; font-weight: 600;">
          ${this.getObjectTypeName(obj.type)} 属性
        </h3>
        <button id="close-panel" style="
          background: none; 
          border: none; 
          color: rgba(255,255,255,0.6); 
          font-size: 18px; 
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
        ">✕</button>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="display: flex; gap: 8px;">
          <button id="duplicate-btn" style="
            flex: 1;
            background: rgba(59, 130, 246, 0.8);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
          ">复制</button>
          <button id="delete-btn" style="
            flex: 1;
            background: rgba(239, 68, 68, 0.8);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 12px;
          ">删除</button>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.8);">位置</label>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <div style="flex: 1;">
            <label style="font-size: 10px; color: rgba(255,255,255,0.6);">X</label>
            <input type="number" id="pos-x" value="${Math.round(obj.startPoint.x)}" style="
              width: 100%;
              background: rgba(255,255,255,0.1);
              border: 1px solid rgba(255,255,255,0.2);
              color: white;
              padding: 6px 8px;
              border-radius: 6px;
              font-size: 12px;
            ">
          </div>
          <div style="flex: 1;">
            <label style="font-size: 10px; color: rgba(255,255,255,0.6);">Y</label>
            <input type="number" id="pos-y" value="${Math.round(obj.startPoint.y)}" style="
              width: 100%;
              background: rgba(255,255,255,0.1);
              border: 1px solid rgba(255,255,255,0.2);
              color: white;
              padding: 6px 8px;
              border-radius: 6px;
              font-size: 12px;
            ">
          </div>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.8);">颜色</label>
        <div style="display: flex; gap: 8px; align-items: center;">
          <div style="flex: 1;">
            <label style="font-size: 10px; color: rgba(255,255,255,0.6);">主色</label>
            <input type="color" id="main-color" value="${obj.options.color}" style="
              width: 100%;
              height: 32px;
              background: none;
              border: 1px solid rgba(255,255,255,0.2);
              border-radius: 6px;
              cursor: pointer;
            ">
          </div>
          ${
            isShapeObject
              ? `
          <div style="flex: 1;">
            <label style="font-size: 10px; color: rgba(255,255,255,0.6);">填充</label>
            <input type="color" id="fill-color" value="${obj.options.fillColor || obj.options.color}" style="
              width: 100%;
              height: 32px;
              background: none;
              border: 1px solid rgba(255,255,255,0.2);
              border-radius: 6px;
              cursor: pointer;
            ">
          </div>
          `
              : ""
          }
        </div>
        ${
          isShapeObject
            ? `
        <label style="display: flex; align-items: center; margin-top: 8px; font-size: 12px; cursor: pointer;">
          <input type="checkbox" id="has-fill" ${obj.options.hasFill ? "checked" : ""} style="margin-right: 8px;">
          启用填充
        </label>
        `
            : ""
        }
      </div>

      ${
        !isTextObject
          ? `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.8);">线条</label>
        <div style="margin-bottom: 8px;">
          <label style="font-size: 10px; color: rgba(255,255,255,0.6);">粗细: ${obj.options.strokeWidth}px</label>
          <input type="range" id="stroke-width" min="1" max="20" value="${obj.options.strokeWidth}" style="
            width: 100%;
            margin-top: 4px;
          ">
        </div>
        <div>
          <label style="font-size: 10px; color: rgba(255,255,255,0.6);">透明度: ${Math.round(obj.options.opacity * 100)}%</label>
          <input type="range" id="opacity" min="0" max="1" step="0.1" value="${obj.options.opacity}" style="
            width: 100%;
            margin-top: 4px;
          ">
        </div>
      </div>
      `
          : ""
      }

      ${
        isTextObject
          ? `
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.8);">文字</label>
        <div style="margin-bottom: 8px;">
          <label style="font-size: 10px; color: rgba(255,255,255,0.6);">内容</label>
          <input type="text" id="text-content" value="${obj.text || ""}" style="
            width: 100%;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 6px 8px;
            border-radius: 6px;
            font-size: 12px;
            margin-top: 4px;
          ">
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <div style="flex: 1;">
            <label style="font-size: 10px; color: rgba(255,255,255,0.6);">大小</label>
            <input type="number" id="font-size" min="8" max="72" value="${obj.options.fontSize}" style="
              width: 100%;
              background: rgba(255,255,255,0.1);
              border: 1px solid rgba(255,255,255,0.2);
              color: white;
              padding: 6px 8px;
              border-radius: 6px;
              font-size: 12px;
            ">
          </div>
          <div style="flex: 1;">
            <label style="font-size: 10px; color: rgba(255,255,255,0.6);">字体</label>
            <select id="font-family" style="
              width: 100%;
              background: rgba(255,255,255,0.1);
              border: 1px solid rgba(255,255,255,0.2);
              color: white;
              padding: 6px 8px;
              border-radius: 6px;
              font-size: 12px;
            ">
              <option value="Arial" ${obj.options.fontFamily === "Arial" ? "selected" : ""}>Arial</option>
              <option value="Times New Roman" ${obj.options.fontFamily === "Times New Roman" ? "selected" : ""}>Times</option>
              <option value="Courier New" ${obj.options.fontFamily === "Courier New" ? "selected" : ""}>Courier</option>
              <option value="Helvetica" ${obj.options.fontFamily === "Helvetica" ? "selected" : ""}>Helvetica</option>
            </select>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <select id="font-weight" style="
            flex: 1;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 6px 8px;
            border-radius: 6px;
            font-size: 12px;
          ">
            <option value="normal" ${obj.options.fontWeight === "normal" ? "selected" : ""}>普通</option>
            <option value="bold" ${obj.options.fontWeight === "bold" ? "selected" : ""}>加粗</option>
          </select>
          <select id="text-align" style="
            flex: 1;
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            color: white;
            padding: 6px 8px;
            border-radius: 6px;
            font-size: 12px;
          ">
            <option value="left" ${obj.options.textAlign === "left" ? "selected" : ""}>左对齐</option>
            <option value="center" ${obj.options.textAlign === "center" ? "selected" : ""}>居中</option>
            <option value="right" ${obj.options.textAlign === "right" ? "selected" : ""}>右对齐</option>
          </select>
        </div>
      </div>
      `
          : ""
      }

      <div style="margin-bottom: 8px;">
        <label style="display: block; margin-bottom: 8px; font-size: 12px; color: rgba(255,255,255,0.8);">阴影效果</label>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <div style="flex: 1;">
            <label style="font-size: 10px; color: rgba(255,255,255,0.6);">颜色</label>
            <input type="color" id="shadow-color" value="${obj.options.shadowColor || "#000000"}" style="
              width: 100%;
              height: 28px;
              background: none;
              border: 1px solid rgba(255,255,255,0.2);
              border-radius: 6px;
              cursor: pointer;
            ">
          </div>
          <div style="flex: 1;">
            <label style="font-size: 10px; color: rgba(255,255,255,0.6);">模糊: ${obj.options.shadowBlur || 0}px</label>
            <input type="range" id="shadow-blur" min="0" max="20" value="${obj.options.shadowBlur || 0}" style="
              width: 100%;
              margin-top: 4px;
            ">
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    if (!this.panel || !this.currentObject) return;

    const closeBtn = this.panel.querySelector("#close-panel");
    closeBtn?.addEventListener("click", () => this.hide());

    const duplicateBtn = this.panel.querySelector("#duplicate-btn");
    duplicateBtn?.addEventListener("click", () => {
      if (this.currentObject && this.onPropertyChange) {
        this.onPropertyChange({ type: "duplicate", object: this.currentObject });
      }
    });

    const deleteBtn = this.panel.querySelector("#delete-btn");
    deleteBtn?.addEventListener("click", () => {
      if (this.currentObject && this.onPropertyChange) {
        this.onPropertyChange({ type: "delete", object: this.currentObject });
        this.hide();
      }
    });

    const posXInput = this.panel.querySelector("#pos-x") as HTMLInputElement;
    const posYInput = this.panel.querySelector("#pos-y") as HTMLInputElement;
    [posXInput, posYInput].forEach((input) => {
      input?.addEventListener("change", () => this.handlePositionChange());
    });

    const styleInputs = this.panel.querySelectorAll(
      "#main-color, #fill-color, #has-fill, #stroke-width, #opacity, #text-content, #font-size, #font-family, #font-weight, #text-align, #shadow-color, #shadow-blur",
    );
    styleInputs.forEach((input) => {
      input.addEventListener("change", () => this.handleStyleChange());
    });
  }

  private handlePositionChange(): void {
    if (!this.currentObject || !this.onPropertyChange) return;

    const posXInput = this.panel?.querySelector("#pos-x") as HTMLInputElement;
    const posYInput = this.panel?.querySelector("#pos-y") as HTMLInputElement;

    if (posXInput && posYInput) {
      const x = parseInt(posXInput.value);
      const y = parseInt(posYInput.value);

      this.onPropertyChange({
        type: "position",
        object: this.currentObject,
        changes: { x, y },
      });
    }
  }

  private handleStyleChange(): void {
    if (!this.currentObject || !this.onPropertyChange) return;

    const changes: any = {};

    // 颜色
    const mainColorInput = this.panel?.querySelector("#main-color") as HTMLInputElement;
    if (mainColorInput) changes.color = mainColorInput.value;

    const fillColorInput = this.panel?.querySelector("#fill-color") as HTMLInputElement;
    if (fillColorInput) changes.fillColor = fillColorInput.value;

    const hasFillInput = this.panel?.querySelector("#has-fill") as HTMLInputElement;
    if (hasFillInput) changes.hasFill = hasFillInput.checked;

    // 线条
    const strokeWidthInput = this.panel?.querySelector("#stroke-width") as HTMLInputElement;
    if (strokeWidthInput) changes.strokeWidth = parseInt(strokeWidthInput.value);

    const opacityInput = this.panel?.querySelector("#opacity") as HTMLInputElement;
    if (opacityInput) changes.opacity = parseFloat(opacityInput.value);

    // 文字
    const textContentInput = this.panel?.querySelector("#text-content") as HTMLInputElement;
    if (textContentInput && this.currentObject.type === "text") {
      this.currentObject.text = textContentInput.value;
    }

    const fontSizeInput = this.panel?.querySelector("#font-size") as HTMLInputElement;
    if (fontSizeInput) changes.fontSize = parseInt(fontSizeInput.value);

    const fontFamilyInput = this.panel?.querySelector("#font-family") as HTMLSelectElement;
    if (fontFamilyInput) changes.fontFamily = fontFamilyInput.value;

    const fontWeightInput = this.panel?.querySelector("#font-weight") as HTMLSelectElement;
    if (fontWeightInput) changes.fontWeight = fontWeightInput.value;

    const textAlignInput = this.panel?.querySelector("#text-align") as HTMLSelectElement;
    if (textAlignInput) changes.textAlign = textAlignInput.value as "left" | "center" | "right";

    // 阴影
    const shadowColorInput = this.panel?.querySelector("#shadow-color") as HTMLInputElement;
    if (shadowColorInput) changes.shadowColor = shadowColorInput.value;

    const shadowBlurInput = this.panel?.querySelector("#shadow-blur") as HTMLInputElement;
    if (shadowBlurInput) changes.shadowBlur = parseInt(shadowBlurInput.value);

    this.onPropertyChange({
      type: "style",
      object: this.currentObject,
      changes,
    });
  }

  private getObjectTypeName(type: DrawingMode): string {
    const names: Record<DrawingMode, string> = {
      select: "选择",
      pen: "画笔",
      arrow: "箭头",
      rectangle: "矩形",
      circle: "圆形",
      text: "文字",
      "hand-drawn": "手绘",
      line: "直线",
      eraser: "橡皮擦",
      highlighter: "荧光笔",
      star: "星形",
      triangle: "三角形",
    };
    return names[type] || type;
  }
}
