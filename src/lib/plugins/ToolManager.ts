import { ToolPlugin, Point, DrawingObject, ToolContext } from "./ToolPlugin";
import { PenTool } from "./PenTool";
import { RectangleTool } from "./RectangleTool";
import { CircleTool } from "./CircleTool";
import { TextTool } from "./TextTool";
import { ArrowTool } from "./ArrowTool";
import { LineTool } from "./LineTool";
import { HandDrawnTool } from "./HandDrawnTool";
import { EraserTool } from "./EraserTool";
import { HighlighterTool } from "./HighlighterTool";
import { StarTool } from "./StarTool";
import { TriangleTool } from "./TriangleTool";
import { SelectTool } from "./SelectTool";

export class ToolManager {
  private tools: Map<string, ToolPlugin> = new Map();
  private currentTool: ToolPlugin | null = null;

  constructor() {
    this.registerDefaultTools();
  }

  private registerDefaultTools(): void {
    this.registerTool(new SelectTool());
    this.registerTool(new PenTool());
    this.registerTool(new RectangleTool());
    this.registerTool(new CircleTool());
    this.registerTool(new TextTool());
    this.registerTool(new ArrowTool());
    this.registerTool(new LineTool());
    this.registerTool(new HandDrawnTool());
    this.registerTool(new EraserTool());
    this.registerTool(new HighlighterTool());
    this.registerTool(new StarTool());
    this.registerTool(new TriangleTool());
  }

  public registerTool(tool: ToolPlugin): void {
    this.tools.set(tool.type, tool);
  }

  public unregisterTool(type: string): boolean {
    const success = this.tools.delete(type);
    if (success) {
      if (this.currentTool && this.currentTool.type === type) {
        this.currentTool = null;
      }
    }
    return success;
  }

  public setCurrentTool(type: string): boolean {
    const tool = this.tools.get(type);
    if (tool) {
      this.currentTool = tool;
      return true;
    }
    return false;
  }

  public getCurrentTool(): ToolPlugin | null {
    return this.currentTool;
  }

  public getTool(type: string): ToolPlugin | null {
    return this.tools.get(type) || null;
  }

  public getAllTools(): ToolPlugin[] {
    return Array.from(this.tools.values());
  }

  public getToolTypes(): string[] {
    return Array.from(this.tools.keys());
  }

  public startDrawing(point: Point, context: ToolContext): DrawingObject | null {
    if (!this.currentTool) {
      return null;
    }
    return this.currentTool.startDrawing(point, context);
  }

  public continueDrawing(point: Point, startObject: DrawingObject, context: ToolContext): void {
    if (!this.currentTool) {
      return;
    }
    this.currentTool.continueDrawing(point, startObject, context);
  }

  public finishDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject {
    if (!this.currentTool) {
      return startObject;
    }
    return this.currentTool.finishDrawing(point, startObject, context);
  }

  public renderObject(obj: DrawingObject, context: ToolContext): void {
    const tool = this.getTool(obj.type);
    if (tool) {
      tool.render(obj, context);
    }
  }

  public hitTest(point: Point, obj: DrawingObject, margin?: number): boolean {
    const tool = this.getTool(obj.type);
    if (tool) {
      return tool.hitTest(point, obj, margin);
    }
    return false;
  }

  public calculateBounds(obj: DrawingObject, context: ToolContext): { x: number; y: number; width: number; height: number } {
    const tool = this.getTool(obj.type);
    if (tool) {
      return tool.calculateBounds(obj, context);
    }
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  public requiresDrag(): boolean {
    if (!this.currentTool) {
      return false;
    }
    return this.currentTool.requiresDrag;
  }

  public getToolsForUI(): Array<{
    type: string;
    name: string;
    icon: string;
    title: string;
    requiresDrag: boolean;
  }> {
    return this.getAllTools().map((tool) => ({
      type: tool.type,
      name: tool.name,
      icon: tool.icon,
      title: tool.title,
      requiresDrag: tool.requiresDrag,
    }));
  }

  public hasTool(type: string): boolean {
    return this.tools.has(type);
  }

  public getToolCount(): number {
    return this.tools.size;
  }

  public clearAllTools(): void {
    this.tools.clear();
    this.currentTool = null;
  }
}
