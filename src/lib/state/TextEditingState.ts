import { DrawingObject } from '../core/types';

export class TextEditingState {
  private isEditingText = false;
  private editingText = '';
  private textCursorPosition = 0;
  private textCursorVisible = true;
  private textCursorBlinkTimer: number | null = null;

  // 获取编辑状态
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

  // 开始文本编辑
  startEditing(textObj: DrawingObject): void {
    this.isEditingText = true;
    this.editingText = textObj.text || '';
    this.textCursorPosition = this.editingText.length;
    this.textCursorVisible = true;
    this.startCursorBlink();
  }

  // 完成文本编辑
  finishEditing(): string {
    if (!this.isEditingText) return '';
    
    this.isEditingText = false;
    this.stopCursorBlink();
    
    const newText = this.editingText;
    this.editingText = '';
    this.textCursorPosition = 0;
    
    return newText;
  }

  // 取消文本编辑
  cancelEditing(): void {
    if (!this.isEditingText) return;
    
    this.isEditingText = false;
    this.stopCursorBlink();
    this.editingText = '';
    this.textCursorPosition = 0;
  }

  // 文本输入处理
  insertCharacter(char: string): void {
    if (!this.isEditingText) return;
    
    this.editingText = 
      this.editingText.slice(0, this.textCursorPosition) + 
      char + 
      this.editingText.slice(this.textCursorPosition);
    this.textCursorPosition++;
  }

  deleteCharacter(): void {
    if (!this.isEditingText || this.textCursorPosition === 0) return;
    
    this.editingText = 
      this.editingText.slice(0, this.textCursorPosition - 1) + 
      this.editingText.slice(this.textCursorPosition);
    this.textCursorPosition--;
  }

  // 光标移动
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

  // 光标闪烁
  private startCursorBlink(): void {
    this.stopCursorBlink();
    
    const blink = (currentTime: number) => {
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

  // 清理资源
  destroy(): void {
    this.stopCursorBlink();
  }
} 