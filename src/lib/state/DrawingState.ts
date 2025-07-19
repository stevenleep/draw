import { DrawingObject, DrawingOptions, DrawingMode } from '../core/types';

export class DrawingState {
  private drawingObjects: DrawingObject[] = [];
  private selectedObject: DrawingObject | null = null;
  private clipboard: DrawingObject | null = null;
  private history: DrawingObject[][] = [];
  private historyStep: number = -1;
  private maxHistorySize: number = 50;

  // 默认绘图选项
  private options: DrawingOptions = {
    color: '#222',
    strokeWidth: 2,
    fontSize: 16,
    roughness: 0.5,
    opacity: 1,
    hasFill: false,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    textAlign: 'left'
  };

  constructor() {
    this.saveState(); // 保存初始状态
  }

  // 对象管理
  addObject(obj: DrawingObject): void {
    this.drawingObjects.push(obj);
    this.saveState();
  }

  removeObject(obj: DrawingObject): void {
    const index = this.drawingObjects.findIndex(o => o.id === obj.id);
    if (index !== -1) {
      this.drawingObjects.splice(index, 1);
      this.saveState();
    }
  }

  getObjects(): DrawingObject[] {
    return this.drawingObjects;
  }

  setObjects(objects: DrawingObject[]): void {
    this.drawingObjects = objects;
    this.saveState();
  }

  // 选择管理
  setSelectedObject(obj: DrawingObject | null): void {
    this.selectedObject = obj;
  }

  getSelectedObject(): DrawingObject | null {
    return this.selectedObject;
  }

  // 剪贴板管理
  setClipboard(obj: DrawingObject | null): void {
    this.clipboard = obj;
  }

  getClipboard(): DrawingObject | null {
    return this.clipboard;
  }

  // 选项管理
  getOptions(): DrawingOptions {
    return { ...this.options };
  }

  updateOptions(newOptions: Partial<DrawingOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  // 历史记录管理
  private saveState(): void {
    // 移除当前步骤之后的所有历史记录
    this.history = this.history.slice(0, this.historyStep + 1);
    
    // 添加新状态
    this.history.push(this.cloneObjectArray(this.drawingObjects));
    this.historyStep++;
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyStep--;
    }
    
    console.log('💾 State saved, step:', this.historyStep, 'total history:', this.history.length);
  }

  undo(): boolean {
    if (this.historyStep > 0) {
      this.historyStep--;
      this.drawingObjects = this.cloneObjectArray(this.history[this.historyStep]);
      this.selectedObject = null;
      console.log('↶ Undo successful, step:', this.historyStep);
      return true;
    }
    console.log('↶ No more undo steps');
    return false;
  }

  redo(): boolean {
    if (this.historyStep < this.history.length - 1) {
      this.historyStep++;
      this.drawingObjects = this.cloneObjectArray(this.history[this.historyStep]);
      this.selectedObject = null;
      console.log('↷ Redo successful, step:', this.historyStep);
      return true;
    }
    console.log('↷ No more redo steps');
    return false;
  }

  canUndo(): boolean {
    return this.historyStep > 0;
  }

  canRedo(): boolean {
    return this.historyStep < this.history.length - 1;
  }

  // 工具方法
  private cloneObjectArray(objects: DrawingObject[]): DrawingObject[] {
    return objects.map(obj => this.cloneObject(obj));
  }

  private cloneObject(obj: DrawingObject): DrawingObject {
    return {
      id: obj.id,
      type: obj.type,
      startPoint: { ...obj.startPoint },
      endPoint: obj.endPoint ? { ...obj.endPoint } : undefined,
      points: obj.points ? obj.points.map(p => ({ ...p })) : undefined,
      text: obj.text,
      options: { ...obj.options },
      bounds: { ...obj.bounds },
      transform: obj.transform ? { ...obj.transform } : undefined
    };
  }

  // 清空所有状态
  clear(): void {
    this.drawingObjects = [];
    this.selectedObject = null;
    this.saveState();
  }
} 