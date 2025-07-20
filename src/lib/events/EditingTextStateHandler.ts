import { InteractionStateHandler } from "./InteractionStateHandler";
import { DrawingEventHandler } from "./DrawingEventHandler";

export class EditingTextStateHandler extends InteractionStateHandler {
  private main: DrawingEventHandler;
  constructor(main: DrawingEventHandler) {
    super();
    this.main = main;
  }
  onDoubleClick(e: MouseEvent): void {
    const rect = this.main.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clickedObject = this.main.getObjectAtPoint(x, y);
    if (clickedObject && clickedObject.type === "text") {
      this.main.textEditingState.startEditing(clickedObject);
      this.main.drawingState.selectObject(clickedObject);
      this.main.canvas.focus();
      if (this.main.onRedraw) {
        this.main.onRedraw();
      }
    } else if (this.main.mode === "select" && !clickedObject) {
      this.main.createTextAtPoint(x, y);
    }
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    switch (e.key) {
      case "Enter":
        if (e.shiftKey) {
          this.main.textEditingState.insertCharacter("\n");
          this.main.updateTextObject();
          this.main.onRedraw?.();
        } else {
          this.main.finishTextEditing();
        }
        e.preventDefault();
        break;
      case "Escape":
        this.main.cancelTextEditing();
        e.preventDefault();
        break;
      case "Backspace":
        this.main.textEditingState.deleteCharacter();
        this.main.updateTextObject();
        this.main.onRedraw?.();
        e.preventDefault();
        break;
      case "Delete":
        this.main.textEditingState.deleteCharacterForward();
        this.main.updateTextObject();
        this.main.onRedraw?.();
        e.preventDefault();
        break;
      case "ArrowLeft":
        this.main.textEditingState.moveCursorLeft();
        this.main.onRedraw?.();
        e.preventDefault();
        break;
      case "ArrowRight":
        this.main.textEditingState.moveCursorRight();
        this.main.onRedraw?.();
        e.preventDefault();
        break;
      case "ArrowUp":
        this.main.textEditingState.moveCursorUp();
        this.main.onRedraw?.();
        e.preventDefault();
        break;
      case "ArrowDown":
        this.main.textEditingState.moveCursorDown();
        this.main.onRedraw?.();
        e.preventDefault();
        break;
      case "Home":
        this.main.textEditingState.moveCursorToStart();
        this.main.onRedraw?.();
        e.preventDefault();
        break;
      case "End":
        this.main.textEditingState.moveCursorToEnd();
        this.main.onRedraw?.();
        e.preventDefault();
        break;
      default:
        if (e.key.length === 1 && /^[\x20-\x7E]$/.test(e.key)) {
          this.main.textEditingState.insertCharacter(e.key);
          this.main.updateTextObject();
          this.main.onRedraw?.();
          e.preventDefault();
        }
        break;
    }
  }
}
