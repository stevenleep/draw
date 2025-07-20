import { DrawingObject, DrawingOptions, cloneDrawingObject } from "../core/types";

function deepCopyObjects(objects: DrawingObject[]): DrawingObject[] {
  return objects.map(cloneDrawingObject);
}

export class DrawingState {
  private objects: DrawingObject[] = [];
  private selected: DrawingObject | null = null;
  private clipboardObject: DrawingObject | null = null;
  private history: DrawingObject[][] = [];
  private historyIndex: number = -1;
  private maxHistorySize: number = 50;

  private options: DrawingOptions = {
    color: "#222",
    strokeWidth: 2,
    fontSize: 16,
    roughness: 0.5,
    opacity: 1,
    hasFill: false,
    fontFamily: "Arial",
    fontWeight: "normal",
    textAlign: "left",
  };

  constructor() {
    this.pushHistory();
  }

  addObject(obj: DrawingObject): void {
    this.objects.push(obj);
    this.pushHistory();
  }

  removeObject(obj: DrawingObject): void {
    const index = this.objects.findIndex((o) => o.id === obj.id);
    if (index !== -1) {
      this.objects.splice(index, 1);
      this.pushHistory();
    }
  }

  getObjects(): DrawingObject[] {
    return this.objects;
  }

  replaceObjects(objects: DrawingObject[]): void {
    this.objects = objects;
    this.pushHistory();
  }

  selectObject(obj: DrawingObject | null): void {
    this.selected = obj;
  }

  getSelected(): DrawingObject | null {
    return this.selected;
  }

  setClipboardObject(obj: DrawingObject | null): void {
    this.clipboardObject = obj;
  }

  getClipboardObject(): DrawingObject | null {
    return this.clipboardObject;
  }

  getOptions(): DrawingOptions {
    return { ...this.options };
  }

  updateOptions(newOptions: Partial<DrawingOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  private pushHistory(): void {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(deepCopyObjects(this.objects));
    this.historyIndex++;
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
      this.historyIndex--;
    }
  }

  private changeHistory(direction: 1 | -1): boolean {
    const targetIndex = this.historyIndex + direction;
    if (targetIndex < 0 || targetIndex >= this.history.length) {
      return false;
    }
    this.historyIndex = targetIndex;
    this.objects = deepCopyObjects(this.history[this.historyIndex]);
    this.selected = null;
    return true;
  }

  undo(): boolean {
    return this.changeHistory(-1);
  }

  redo(): boolean {
    return this.changeHistory(1);
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  clearAll(): void {
    this.objects = [];
    this.selected = null;
    this.pushHistory();
  }
}
