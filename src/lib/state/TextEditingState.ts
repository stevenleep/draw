import { DrawingObject } from "../core/types";

export class TextEditingState {
  private editing = false;
  private textBuffer = "";
  private cursorIndex = 0;
  private cursorVisible = true;
  private cursorBlinkRAF: number | null = null;

  isEditing() {
    return this.editing;
  }

  getEditingText() {
    return this.textBuffer;
  }

  getCursorPosition() {
    return this.cursorIndex;
  }

  isCursorVisible() {
    return this.cursorVisible;
  }

  private resetState() {
    this.editing = false;
    this.stopCursorBlink();
    this.textBuffer = "";
    this.cursorIndex = 0;
  }

  startEditing(textObj: DrawingObject) {
    this.editing = true;
    this.textBuffer = textObj.text || "";
    this.cursorIndex = this.textBuffer.length;
    this.cursorVisible = true;
    this.startCursorBlink();
  }

  finishEditing() {
    if (!this.editing) return "";
    const newText = this.textBuffer;
    this.resetState();
    return newText;
  }

  cancelEditing() {
    if (!this.editing) return;
    this.resetState();
  }

  private setTextAndCursor(newText: string, newCursorPos: number) {
    this.textBuffer = newText;
    this.cursorIndex = newCursorPos;
  }

  insertCharacter(char: string) {
    if (!this.editing) return;
    const { textBuffer, cursorIndex } = this;
    this.setTextAndCursor(
      textBuffer.slice(0, cursorIndex) + char + textBuffer.slice(cursorIndex),
      cursorIndex + 1
    );
  }

  deleteCharacter() {
    if (!this.editing || this.cursorIndex === 0) return;
    const { textBuffer, cursorIndex } = this;
    this.setTextAndCursor(
      textBuffer.slice(0, cursorIndex - 1) + textBuffer.slice(cursorIndex),
      cursorIndex - 1
    );
  }

  deleteCharacterForward() {
    if (!this.editing || this.cursorIndex >= this.textBuffer.length) return;
    const { textBuffer, cursorIndex } = this;
    this.setTextAndCursor(
      textBuffer.slice(0, cursorIndex) + textBuffer.slice(cursorIndex + 1),
      cursorIndex
    );
  }

  private moveCursorByLineOffset(offset: number) {
    const lines = this.textBuffer.split("\n");
    let currentPos = 0;
    let currentLine = 0;
    let currentColumn = 0;
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= this.cursorIndex) {
        currentLine = i;
        currentColumn = this.cursorIndex - currentPos;
        break;
      }
      currentPos += lines[i].length + 1;
    }
    const targetLine = currentLine + offset;
    if (targetLine < 0 || targetLine >= lines.length) return;
    let newPos = 0;
    for (let i = 0; i < targetLine; i++) {
      newPos += lines[i].length + 1;
    }
    newPos += Math.min(currentColumn, lines[targetLine].length);
    this.cursorIndex = newPos;
  }

  moveCursorUp() {
    if (this.cursorIndex === 0) return;
    this.moveCursorByLineOffset(-1);
  }

  moveCursorDown() {
    this.moveCursorByLineOffset(1);
  }

  moveCursorLeft() {
    if (this.cursorIndex > 0) this.cursorIndex--;
  }

  moveCursorRight() {
    if (this.cursorIndex < this.textBuffer.length) this.cursorIndex++;
  }

  moveCursorToStart() {
    this.cursorIndex = 0;
  }

  moveCursorToEnd() {
    this.cursorIndex = this.textBuffer.length;
  }

  private startCursorBlink() {
    this.stopCursorBlink();
    const blink = () => {
      this.cursorVisible = !this.cursorVisible;
      this.cursorBlinkRAF = requestAnimationFrame(blink);
    };
    this.cursorBlinkRAF = requestAnimationFrame(blink);
  }

  private stopCursorBlink() {
    if (this.cursorBlinkRAF !== null) {
      cancelAnimationFrame(this.cursorBlinkRAF);
      this.cursorBlinkRAF = null;
    }
    this.cursorVisible = true;
  }

  destroy() {
    this.stopCursorBlink();
  }
}
