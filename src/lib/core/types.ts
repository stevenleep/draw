export type DrawingMode =
  | "select"
  | "pen"
  | "arrow"
  | "rectangle"
  | "circle"
  | "text"
  | "hand-drawn"
  | "line"
  | "eraser"
  | "highlighter"
  | "star"
  | "triangle";

export interface DrawingOptions {
  color: string;
  strokeColor?: string;
  strokeWidth: number;
  fontSize: number;
  roughness: number;
  opacity: number;
  fillColor?: string;
  hasFill: boolean;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: "left" | "center" | "right";
  lineDash?: number[];
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface DrawingObject {
  id: string;
  type: DrawingMode;
  startPoint: { x: number; y: number };
  endPoint?: { x: number; y: number };
  points?: { x: number; y: number }[];
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

export enum HandleType {
  TOP_LEFT = "top-left",
  TOP_RIGHT = "top-right",
  BOTTOM_LEFT = "bottom-left",
  BOTTOM_RIGHT = "bottom-right",
  TOP = "top",
  BOTTOM = "bottom",
  LEFT = "left",
  RIGHT = "right",
  ROTATE = "rotate",
}

export interface TransformHandle {
  type: HandleType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}
