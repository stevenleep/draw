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

  deleteCharacterForward(): void {
    if (!this.isEditingText || this.textCursorPosition >= this.editingText.length) return;
    
    this.editingText = 
      this.editingText.slice(0, this.textCursorPosition) + 
      this.editingText.slice(this.textCursorPosition + 1);
  }

  moveCursorUp(): void {
    // 实现真正的多行光标向上移动
    if (this.textCursorPosition === 0) return;
    
    const lines = this.editingText.split('\n');
    let currentPos = 0;
    let currentLine = 0;
    let currentColumn = 0;
    
    // 找到当前光标位置所在的行和列
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= this.textCursorPosition) {
        currentLine = i;
        currentColumn = this.textCursorPosition - currentPos;
        break;
      }
      currentPos += lines[i].length + 1; // +1 for newline
    }
    
    // 如果不在第一行，移动到上一行
    if (currentLine > 0) {
      const prevLine = lines[currentLine - 1];
      const targetColumn = Math.min(currentColumn, prevLine.length);
      let newPos = 0;
      
      // 计算上一行对应位置
      for (let i = 0; i < currentLine - 1; i++) {
        newPos += lines[i].length + 1;
      }
      newPos += targetColumn;
      
      this.textCursorPosition = newPos;
    }
  }

  moveCursorDown(): void {
    // 实现真正的多行光标向下移动
    const lines = this.editingText.split('\n');
    let currentPos = 0;
    let currentLine = 0;
    let currentColumn = 0;
    
    // 找到当前光标位置所在的行和列
    for (let i = 0; i < lines.length; i++) {
      if (currentPos + lines[i].length >= this.textCursorPosition) {
        currentLine = i;
        currentColumn = this.textCursorPosition - currentPos;
        break;
      }
      currentPos += lines[i].length + 1; // +1 for newline
    }
    
    // 如果不在最后一行，移动到下一行
    if (currentLine < lines.length - 1) {
      const nextLine = lines[currentLine + 1];
      const targetColumn = Math.min(currentColumn, nextLine.length);
      let newPos = 0;
      
      // 计算下一行对应位置
      for (let i = 0; i < currentLine + 1; i++) {
        newPos += lines[i].length + 1;
      }
      newPos += targetColumn;
      
      this.textCursorPosition = newPos;
    }
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