import { DrawingObject, DrawingOptions, TransformHandle } from "../core/types";
import { ToolManager } from "../plugins/ToolManager";
import { TextEditingState } from "../state/TextEditingState";

export class DrawingRenderer {
  private context: CanvasRenderingContext2D;
  private toolManager: ToolManager;
  private textEditingState: TextEditingState;

  constructor(context: CanvasRenderingContext2D, toolManager: ToolManager, textEditingState: TextEditingState) {
    this.context = context;
    this.toolManager = toolManager;
    this.textEditingState = textEditingState;
  }

  drawObjects(objects: DrawingObject[]): void {
    for (const obj of objects) {
      this.drawObject(obj);
    }
  }

  public drawObject(obj: DrawingObject): void {
    this.context.save();
    this.applyObjectTransform(obj);
    this.applyStyles(obj.options);
    const tool = this.toolManager.getTool(obj.type);
    if (tool) {
      const toolContext = this.createToolContext(obj);
      tool.render(obj, toolContext);
    } else {
      this.drawLegacyObject(obj);
    }
    this.resetContextStyles();
    this.context.restore();
  }

  drawTextEditingOverlay(selectedObject: DrawingObject | null): void {
    if (!this.textEditingState.isEditing() || !selectedObject || selectedObject.type !== "text") {
      return;
    }
    const textTool = this.toolManager.getTool("text");
    if (textTool && "renderCursor" in textTool) {
      const toolContext = this.createToolContext(selectedObject);
      this.context.save();
      this.context.font = `${selectedObject.options.fontWeight || "normal"} ${selectedObject.options.fontSize}px ${selectedObject.options.fontFamily || "Arial"}`;
      this.context.textAlign = selectedObject.options.textAlign || "left";
      this.context.textBaseline = "top";
      this.context.fillStyle = selectedObject.options.color || "#222";
      this.context.globalAlpha = 1;
      const editingText = this.textEditingState.getEditingText();
      if (editingText) {
        this.drawMultilineText(editingText, selectedObject.startPoint.x, selectedObject.startPoint.y, selectedObject.options);
      }
      this.context.restore();
      (textTool as any).renderCursor(selectedObject, this.textEditingState.getCursorPosition(), this.textEditingState.isCursorVisible(), toolContext);
    }
  }

  drawSelectionBox(obj: DrawingObject): void {
    const padding = 10;
    this.context.save();
    this.context.strokeStyle = "#0066ff";
    this.context.lineWidth = 2;
    this.context.setLineDash([5, 5]);
    this.context.strokeRect(obj.bounds.x - padding, obj.bounds.y - padding, obj.bounds.width + padding * 2, obj.bounds.height + padding * 2);
    this.context.restore();
  }

  drawTransformHandles(handles: TransformHandle[]): void {
    for (const handle of handles) {
      this.drawTransformHandle(handle);
    }
  }

  private applyObjectTransform(obj: DrawingObject): void {
    if (
      obj.transform &&
      (obj.transform.rotation !== 0 ||
        obj.transform.scaleX !== 1 ||
        obj.transform.scaleY !== 1 ||
        obj.transform.translateX !== 0 ||
        obj.transform.translateY !== 0)
    ) {
      const centerX = obj.bounds.x + obj.bounds.width / 2;
      const centerY = obj.bounds.y + obj.bounds.height / 2;
      this.context.translate(centerX, centerY);
      if (obj.transform.rotation !== 0) {
        this.context.rotate(obj.transform.rotation);
      }
      if (obj.transform.scaleX !== 1 || obj.transform.scaleY !== 1) {
        this.context.scale(obj.transform.scaleX, obj.transform.scaleY);
      }
      this.context.translate(-centerX, -centerY);
      if (obj.transform.translateX !== 0 || obj.transform.translateY !== 0) {
        this.context.translate(obj.transform.translateX, obj.transform.translateY);
      }
    }
  }

  private applyStyles(options: DrawingOptions): void {
    this.context.strokeStyle = options.color;
    this.context.fillStyle = options.fillColor || options.color;
    this.context.lineWidth = options.strokeWidth;
    this.context.lineCap = "round";
    this.context.lineJoin = "round";
    this.context.globalAlpha = options.opacity;
    if (options.lineDash && options.lineDash.length > 0) {
      this.context.setLineDash(options.lineDash);
    } else {
      this.context.setLineDash([]);
    }
    if (options.shadowColor && options.shadowColor !== "transparent" && options.shadowBlur && options.shadowBlur > 0) {
      this.context.shadowColor = options.shadowColor;
      this.context.shadowBlur = options.shadowBlur;
      this.context.shadowOffsetX = options.shadowOffsetX || 0;
      this.context.shadowOffsetY = options.shadowOffsetY || 0;
    } else {
      this.context.shadowColor = "transparent";
      this.context.shadowBlur = 0;
      this.context.shadowOffsetX = 0;
      this.context.shadowOffsetY = 0;
    }
  }

  private resetContextStyles(): void {
    this.context.globalAlpha = 1;
    this.context.setLineDash([]);
    this.context.shadowColor = "transparent";
    this.context.shadowBlur = 0;
    this.context.shadowOffsetX = 0;
    this.context.shadowOffsetY = 0;
  }

  private drawMultilineText(text: string, x: number, y: number, opts: DrawingOptions): void {
    const lines = text.split("\n");
    const lineHeight = opts.fontSize * 1.2;
    for (let i = 0; i < lines.length; i++) {
      const lineY = y + i * lineHeight;
      this.context.fillText(lines[i], x, lineY);
    }
  }

  private drawTransformHandle(handle: TransformHandle): void {
    this.context.save();
    this.context.fillStyle = "#ffffff";
    this.context.strokeStyle = "#0066ff";
    this.context.lineWidth = 2;
    this.context.fillRect(handle.x, handle.y, handle.width, handle.height);
    this.context.strokeRect(handle.x, handle.y, handle.width, handle.height);
    this.context.restore();
  }

  private static readonly STAR_POINTS = 5;

  private drawLegacyObject(obj: DrawingObject): void {
    switch (obj.type) {
      case "line":
        if (obj.endPoint) {
          this.context.beginPath();
          this.context.moveTo(obj.startPoint.x, obj.startPoint.y);
          this.context.lineTo(obj.endPoint.x, obj.endPoint.y);
          this.context.stroke();
        }
        break;
      case "star":
        if (obj.endPoint) {
          const radius = Math.sqrt((obj.endPoint.x - obj.startPoint.x) ** 2 + (obj.endPoint.y - obj.startPoint.y) ** 2);
          this.drawStarShape(obj.startPoint.x, obj.startPoint.y, radius, DrawingRenderer.STAR_POINTS);
        }
        break;
      case "triangle":
        if (obj.endPoint) {
          this.drawTriangleShape(obj.startPoint, obj.endPoint);
        }
        break;
      case "hand-drawn":
      case "eraser":
      case "highlighter":
        if (obj.points && obj.points.length > 0) {
          this.context.beginPath();
          this.context.moveTo(obj.points[0].x, obj.points[0].y);
          for (let i = 1; i < obj.points.length; i++) {
            this.context.lineTo(obj.points[i].x, obj.points[i].y);
          }
          this.context.stroke();
        }
        break;
      default:
        break;
    }
  }

  private drawStarShape(centerX: number, centerY: number, radius: number, points: number): void {
    this.context.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points;
      const r = i % 2 === 0 ? radius : radius * 0.5;
      const x = centerX + Math.cos(angle) * r;
      const y = centerY + Math.sin(angle) * r;
      if (i === 0) {
        this.context.moveTo(x, y);
      } else {
        this.context.lineTo(x, y);
      }
    }
    this.context.closePath();
    this.context.stroke();
  }

  private drawTriangleShape(start: { x: number; y: number }, end: { x: number; y: number }): void {
    const width = end.x - start.x;
    this.context.beginPath();
    this.context.moveTo(start.x + width / 2, start.y);
    this.context.lineTo(start.x, end.y);
    this.context.lineTo(end.x, end.y);
    this.context.closePath();
    this.context.stroke();
  }

  private createToolContext(obj: DrawingObject) {
    return {
      ctx: this.context,
      canvas: this.context.canvas,
      options: obj.options,
      generateId: () => "",
      redrawCanvas: () => { },
      saveState: () => { },
    };
  }
}
