import type { DrawingOptions as EngineDrawingOptions, DrawingMode } from "../core/types";

export type { DrawingMode };

export interface Point {
  x: number;
  y: number;
}

export type DrawingOptions = EngineDrawingOptions;

export interface DrawingObject {
  id: string;
  type: DrawingMode;
  startPoint: Point;
  endPoint?: Point;
  points?: Point[];
  text?: string;
  options: DrawingOptions;
  bounds: { x: number; y: number; width: number; height: number };
  transform?: {
    rotation: number;
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
  };
}

export interface ToolContext {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  options: DrawingOptions;
  generateId: () => string;
  redrawCanvas: () => void;
  saveState: () => void;
}

export abstract class ToolPlugin {
  public readonly name: string;
  public readonly type: DrawingMode;
  public readonly icon: string;
  public readonly title: string;

  constructor(name: string, type: DrawingMode, icon: string, title: string) {
    this.name = name;
    this.type = type;
    this.icon = icon;
    this.title = title;
  }

  abstract startDrawing(point: Point, context: ToolContext): DrawingObject | null;

  abstract continueDrawing(point: Point, startObject: DrawingObject, context: ToolContext): void;

  abstract updateDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject | null;

  abstract finishDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject;

  abstract render(obj: DrawingObject, context: ToolContext): void;

  abstract hitTest(point: Point, obj: DrawingObject, margin?: number): boolean;

  abstract calculateBounds(obj: DrawingObject, context: ToolContext): { x: number; y: number; width: number; height: number };

  abstract get requiresDrag(): boolean;

  getIconSVG(): string {
    return this.icon;
  }

  getTitle(): string {
    return this.title;
  }
}
