import { DrawingObject } from "../core/types";

export class TextEditingState {
  private isEditingText = false;
  private editingText = "";
  private textCursorPosition = 0;
  private textCursorVisible = true;
  private textCursorBlinkTimer: number | null = null;

  isEditing(): boolean {
    return this.isEditingText;
  }

  getEditingText(): string {
    return this.editingText;
  }

  getCursorPosition(): number {
    return this.textCursorPosition;
  }

  isCursorVisible(): boolean {
    return this.textCursorVisible;
  }

  startEditing(textObj: DrawingObject): void {
    this.isEditingText = true;
    this.editingText = textObj.text || "";
    this.textCursorPosition = this.editingText.length;
    this.textCursorVisible = true;
    this.startCursorBlink();
  }

  finishEditing(): string {
    if (!this.isEditingText) {
      return "";
    }

    this.isEditingText = false;
    this.stopCursorBlink();

    const newText = this.editingText;
    this.editingText = "";
    this.textCursorPosition = 0;

    return newText;
  }

  cancelEditing(): void {
    if (!this.isEditingText) {
      return;
    }

    this.isEditingText = false;
    this.stopCursorBlink();
    this.editingText = "";
    this.textCursorPosition = 0;
  }

  insertCharacter(char: string): void {
    if (!this.isEditingText) {
      return;
    }

    this.editingText = this.editingText.slice(0, this.textCursorPosition) + char + this.editingText.slice(this.textCursorPosition);
    this.textCursorPosition++;
  }

  deleteCharacter(): void {
    if (!this.isEditingText || this.textCursorPosition === 0) {
      return;
    }

    this.editingText = this.editingText.slice(0, this.textCursorPosition - 1) + this.editingText.slice(this.textCursorPosition);
    this.textCursorPosition--;
  }

  deleteCharacterForward(): void {
    if (!this.isEditingText || this.textCursorPosition >= this.editingText.length) {
      return;
    }

    this.editingText = this.editingText.slice(0, this.textCursorPosition) + this.editingText.slice(this.textCursorPosition + 1);
  }

  moveCursorUp(): void {
    if (this.textCursorPosition === 0) {
      return;
    }

    const lines = this.editingText.split("\n");
    let currentPos = 0;
    let currentLine = 0;
    let currentColumn = 0;

    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= this.textCursorPosition) {
        currentLine = i;
        currentColumn = this.textCursorPosition - currentPos;
        break;
      }
      currentPos += lines[i].length + 1;
    }

    if (currentLine > 0) {
      const prevLine = lines[currentLine - 1];
      const targetColumn = Math.min(currentColumn, prevLine.length);
      let newPos = 0;

      for (let i = 0; i < currentLine - 1; i++) {
        newPos += lines[i].length + 1;
      }
      newPos += targetColumn;

      this.textCursorPosition = newPos;
    }
  }

  moveCursorDown(): void {
    const lines = this.editingText.split("\n");
    let currentPos = 0;
    let currentLine = 0;
    let currentColumn = 0;

    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= this.textCursorPosition) {
        currentLine = i;
        currentColumn = this.textCursorPosition - currentPos;
        break;
      }
      currentPos += lines[i].length + 1;
    }

    if (currentLine < lines.length - 1) {
      const nextLine = lines[currentLine + 1];
      const targetColumn = Math.min(currentColumn, nextLine.length);
      let newPos = 0;

      for (let i = 0; i < currentLine + 1; i++) {
        newPos += lines[i].length + 1;
      }
      newPos += targetColumn;

      this.textCursorPosition = newPos;
    }
  }

  moveCursorLeft(): void {
    if (this.textCursorPosition > 0) {
      this.textCursorPosition--;
    }
  }

  moveCursorRight(): void {
    if (this.textCursorPosition < this.editingText.length) {
      this.textCursorPosition++;
    }
  }

  moveCursorToStart(): void {
    this.textCursorPosition = 0;
  }

  moveCursorToEnd(): void {
    this.textCursorPosition = this.editingText.length;
  }

  private startCursorBlink(): void {
    this.stopCursorBlink();

    const blink = () => {
      this.textCursorVisible = !this.textCursorVisible;
      this.textCursorBlinkTimer = requestAnimationFrame(blink);
    };

    this.textCursorBlinkTimer = requestAnimationFrame(blink);
  }

  private stopCursorBlink(): void {
    if (this.textCursorBlinkTimer) {
      cancelAnimationFrame(this.textCursorBlinkTimer);
      this.textCursorBlinkTimer = null;
    }
    this.textCursorVisible = true;
  }

  destroy(): void {
    this.stopCursorBlink();
  }
}
