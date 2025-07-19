import { ToolbarManager } from './ToolbarManager';
import type { DrawingMode } from '../../lib';

export class ToolbarEvents {
  private toolbarManager: ToolbarManager;
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private toolbarStart = { x: 0, y: 0 };

  constructor(toolbarManager: ToolbarManager) {
    this.toolbarManager = toolbarManager;
  }

  public setupEvents(): void {
    const toolbar = this.toolbarManager.getToolbar();
    if (!toolbar) return;

    this.setupToolbarEvents();
    this.setupToolbarDragging();
    this.setupPropertyEvents();
    this.setupKeyboardEvents();
  }

  private setupToolbarEvents(): void {
    const toolbar = this.toolbarManager.getToolbar();
    if (!toolbar) return;

    // 工具栏按钮事件
    toolbar.querySelectorAll('.figma-tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const mode = button.dataset.mode;
        
        if (mode) {
          this.toolbarManager.setMode(mode as DrawingMode);
        } else if (button.id === 'undo-btn') {
          this.toolbarManager.getDrawingManager().undo();
        } else if (button.id === 'clear-btn') {
          if (confirm('确定要清空画布吗？')) {
            this.toolbarManager.getDrawingManager().clear();
          }
        } else if (button.id === 'capture-btn') {
          this.toolbarManager.getDrawingManager().capture();
        } else if (button.id === 'settings-btn') {
          this.toolbarManager.toggleSettingsPanel();
        } else if (button.id === 'toggle-props-btn') {
          this.toolbarManager.togglePropertiesPanel();
        }
      });
    });

    // 形状下拉菜单事件
    const shapeMainBtn = toolbar.querySelector('.shape-main-btn') as HTMLButtonElement;
    if (shapeMainBtn) {
      shapeMainBtn.addEventListener('click', () => {
        const shapeDropdown = toolbar.querySelector('.shape-dropdown') as HTMLElement;
        if (shapeDropdown) {
          shapeDropdown.style.display = shapeDropdown.style.display === 'grid' ? 'none' : 'grid';
        }
      });
    }

    // 形状下拉菜单中的按钮事件
    toolbar.querySelectorAll('.shape-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const mode = button.dataset.mode;
        
        if (mode) {
          this.toolbarManager.setMode(mode as DrawingMode);
          // 关闭下拉菜单
          const shapeDropdown = toolbar.querySelector('.shape-dropdown') as HTMLElement;
          if (shapeDropdown) {
            shapeDropdown.style.display = 'none';
          }
        }
      });
    });

    // 点击其他地方关闭下拉菜单
    document.addEventListener('click', (e) => {
      const shapeDropdown = toolbar.querySelector('.shape-dropdown') as HTMLElement;
      if (shapeDropdown && !toolbar.contains(e.target as Node)) {
        shapeDropdown.style.display = 'none';
      }
    });
  }

  private setupToolbarDragging(): void {
    const toolbar = this.toolbarManager.getToolbar();
    if (!toolbar) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.target !== toolbar && !toolbar.contains(e.target as Node)) return;
      
      this.isDragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      
      const rect = toolbar.getBoundingClientRect();
      this.toolbarStart = { x: rect.left, y: rect.top };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!this.isDragging) return;
      
      const deltaX = e.clientX - this.dragStart.x;
      const deltaY = e.clientY - this.dragStart.y;
      
      const newX = this.toolbarStart.x + deltaX;
      const newY = this.toolbarStart.y + deltaY;
      
      // 边界检查
      const maxX = window.innerWidth - toolbar.offsetWidth;
      const maxY = window.innerHeight - toolbar.offsetHeight;
      
      toolbar.style.left = `${Math.max(0, Math.min(newX, maxX))}px`;
      toolbar.style.top = `${Math.max(0, Math.min(newY, maxY))}px`;
    };

    const handleMouseUp = () => {
      this.isDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    toolbar.addEventListener('mousedown', handleMouseDown);
  }

  private setupPropertyEvents(): void {
    const toolbar = this.toolbarManager.getToolbar();
    if (!toolbar) return;

    // 颜色选择器
    const colorPicker = toolbar.querySelector('#color-picker') as HTMLInputElement;
    if (colorPicker) {
      colorPicker.addEventListener('change', (e) => {
        const color = (e.target as HTMLInputElement).value;
        this.toolbarManager.getDrawingManager().setOptions({ color } as any);
      });
    }

    // 线条粗细
    const strokeWidth = toolbar.querySelector('#stroke-width') as HTMLInputElement;
    const strokeWidthValue = toolbar.querySelector('#stroke-width-value') as HTMLElement;
    if (strokeWidth && strokeWidthValue) {
      strokeWidth.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        strokeWidthValue.textContent = value.toString();
        this.toolbarManager.getDrawingManager().setOptions({ strokeWidth: value } as any);
      });
    }

    // 透明度
    const opacity = toolbar.querySelector('#opacity') as HTMLInputElement;
    const opacityValue = toolbar.querySelector('#opacity-value') as HTMLElement;
    if (opacity && opacityValue) {
      opacity.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        opacityValue.textContent = `${Math.round(value * 100)}%`;
        this.toolbarManager.getDrawingManager().setOptions({ opacity: value } as any);
      });
    }

    // 字体大小
    const fontSize = toolbar.querySelector('#font-size') as HTMLInputElement;
    const fontSizeValue = toolbar.querySelector('#font-size-value') as HTMLElement;
    if (fontSize && fontSizeValue) {
      fontSize.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        fontSizeValue.textContent = value.toString();
        this.toolbarManager.getDrawingManager().setOptions({ fontSize: value } as any);
      });
    }

    // 文本对齐按钮
    toolbar.querySelectorAll('.draw-align-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const align = button.dataset.align as 'left' | 'center' | 'right';
        
        toolbar.querySelectorAll('.draw-align-btn').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        this.toolbarManager.getDrawingManager().setOptions({ textAlign: align } as any);
      });
    });

    // 字体粗细按钮
    toolbar.querySelectorAll('.draw-weight-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const button = e.currentTarget as HTMLButtonElement;
        const weight = button.dataset.weight as 'normal' | 'bold';
        
        toolbar.querySelectorAll('.draw-weight-btn').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        this.toolbarManager.getDrawingManager().setOptions({ fontWeight: weight } as any);
      });
    });
  }

  private setupKeyboardEvents(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.toolbarManager.getDrawingManager().isDrawingActive()) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      // 工具切换快捷键
      const toolKeys: Record<string, DrawingMode> = {
        'v': 'select',
        'p': 'pen',
        't': 'text',
        'r': 'rectangle',
        'o': 'circle',
        'l': 'line',
        'a': 'arrow',
        'h': 'highlighter',
        'e': 'eraser',
        's': 'star',
        'g': 'triangle',
        'd': 'hand-drawn'
      };

      if (toolKeys[e.key.toLowerCase()] && !isCtrl && !isShift) {
        e.preventDefault();
        this.toolbarManager.setMode(toolKeys[e.key.toLowerCase()]);
        return;
      }

      // 其他快捷键
      switch (e.key.toLowerCase()) {
        case 'delete':
        case 'backspace':
          if (!isCtrl) {
            e.preventDefault();
            this.toolbarManager.getDrawingManager().deleteSelected();
          }
          break;
        case 'escape':
          e.preventDefault();
          // 可以在这里添加取消选择的逻辑
          break;
        case 'z':
          if (isCtrl && !isShift) {
            e.preventDefault();
            this.toolbarManager.getDrawingManager().undo();
          }
          break;
        case 'y':
          if (isCtrl) {
            e.preventDefault();
            // 重做功能暂时禁用
          }
          break;
      }
    });
  }
} 