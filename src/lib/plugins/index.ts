// 基础插件接口和类型
export { ToolPlugin } from './ToolPlugin';
export type { Point, DrawingObject, ToolContext, DrawingOptions } from './ToolPlugin';

// 工具管理器
export { ToolManager } from './ToolManager';

// 具体工具实现
export { PenTool } from './PenTool';
export { RectangleTool } from './RectangleTool';
export { CircleTool } from './CircleTool';
export { TextTool } from './TextTool';
export { ArrowTool } from './ArrowTool';

// 重新导出DrawingMode类型，保持向后兼容
export type DrawingMode = 'select' | 'pen' | 'arrow' | 'rectangle' | 'circle' | 'text' | 'hand-drawn' | 'line' | 'eraser' | 'highlighter' | 'star' | 'triangle';
