import type { DrawingObject as EngineDrawingObject, DrawingOptions as EngineDrawingOptions, DrawingMode } from '../core/types';

export type { DrawingMode };

export interface Point {
  x: number;
  y: number;
}

export type DrawingOptions = EngineDrawingOptions;

export interface DrawingObject {
  id: string;
  type: DrawingMode; // 使用DrawingMode而不是string
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
  public readonly type: DrawingMode; // 改为DrawingMode类型
  public readonly icon: string;
  public readonly title: string;

  constructor(name: string, type: DrawingMode, icon: string, title: string) {
    this.name = name;
    this.type = type;
    this.icon = icon;
    this.title = title;
  }

  // 开始绘制
  abstract startDrawing(point: Point, context: ToolContext): DrawingObject | null;

  // 继续绘制（拖拽过程中）
  abstract continueDrawing(point: Point, startObject: DrawingObject, context: ToolContext): void;

  // 完成绘制
  abstract finishDrawing(point: Point, startObject: DrawingObject, context: ToolContext): DrawingObject;

  // 渲染对象
  abstract render(obj: DrawingObject, context: ToolContext): void;

  // 检测点击是否在对象内
  abstract hitTest(point: Point, obj: DrawingObject, margin?: number): boolean;

  // 计算对象边界框
  abstract calculateBounds(obj: DrawingObject, context: ToolContext): { x: number; y: number; width: number; height: number };

  // 是否需要拖拽才能创建（如矩形、圆形需要拖拽，文本、画笔不需要）
  abstract get requiresDrag(): boolean;

  // 获取工具图标SVG
  getIconSVG(): string {
    return this.icon;
  }

  // 获取工具标题
  getTitle(): string {
    return this.title;
  }
}
