import type { DrawingObject, DrawingOptions } from '../../lib/DrawingEngine.ts';

export interface PropertyPanelConfig {
  onPropertyChange: (changes: Partial<DrawingOptions & { x: number; y: number; width: number; height: number; rotation: number; }>) => void;
  onClose: () => void;
}

export class FigmaStylePropertyPanel {
  private panel: HTMLElement | null = null;
  private config: PropertyPanelConfig;
  private currentObject: DrawingObject | null = null;

  constructor(config: PropertyPanelConfig) {
    this.config = config;
  }

  show(object: DrawingObject, position: { x: number; y: number }): void {
    this.currentObject = object;
    this.createPanel();
    this.updatePanelContent();
    this.positionPanel(position);
  }

  hide(): void {
    try {
      if (this.panel && this.panel.parentNode) {
        this.panel.parentNode.removeChild(this.panel);
      }
    } catch (error) {
      console.warn('Property panel already removed:', error);
    }
    this.panel = null;
  }

  private createPanel(): void {
    try {
      if (this.panel && this.panel.parentNode) {
        this.panel.parentNode.removeChild(this.panel);
      }
    } catch (error) {
      console.warn('Property panel already removed during creation:', error);
    }
    this.panel = null;

    this.panel = document.createElement('div');
    this.panel.className = 'figma-property-panel';
    this.panel.innerHTML = `
      <div class="property-panel-header">
        <div class="object-type-indicator"></div>
        <button class="close-btn">×</button>
      </div>
      <div class="property-panel-content">
        <!-- 内容将由updatePanelContent()方法动态生成 -->
      </div>
    `;

    // 应用样式
    this.applyStyles();

    // 添加事件监听
    const closeBtn = this.panel.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => this.config.onClose());

    // 阻止属性面板上的鼠标事件传播到canvas
    this.panel.addEventListener('mousedown', (e) => {
      e.stopPropagation();
    });
    
    this.panel.addEventListener('mousemove', (e) => {
      e.stopPropagation();
    });
    
    this.panel.addEventListener('mouseup', (e) => {
      e.stopPropagation();
    });
    
    this.panel.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.body.appendChild(this.panel);
  }

  private applyStyles(): void {
    if (!this.panel) return;

    // 为面板添加样式
    Object.assign(this.panel.style, {
      position: 'fixed',
      right: '20px',
      top: '20px',
      width: '280px',
      backgroundColor: '#1e1e1e',
      color: '#ffffff',
      borderRadius: '12px',
      border: '1px solid #333333',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(24px)',
      zIndex: '10000000',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      overflow: 'hidden'
    });

    // 添加全局样式
    if (!document.querySelector('#figma-property-panel-styles')) {
      const style = document.createElement('style');
      style.id = 'figma-property-panel-styles';
      style.textContent = `
        .figma-property-panel {
          --figma-bg: #1e1e1e;
          --figma-bg-secondary: #2a2a2a;
          --figma-border: #333333;
          --figma-text: #ffffff;
          --figma-text-secondary: #b3b3b3;
          --figma-accent: #18a0fb;
          --figma-accent-hover: #0f7ce8;
          pointer-events: auto;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }

        .property-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--figma-border);
          background: var(--figma-bg-secondary);
        }

        .object-type-indicator {
          display: flex;
          align-items: center;
          font-weight: 600;
          font-size: 14px;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--figma-text-secondary);
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: var(--figma-border);
          color: var(--figma-text);
        }

        .property-panel-content {
          padding: 16px;
          max-height: 600px;
          overflow-y: auto;
        }

        .property-section {
          margin-bottom: 20px;
        }

        .property-section:last-child {
          margin-bottom: 0;
        }

        .property-section-title {
          font-size: 11px;
          font-weight: 600;
          color: var(--figma-text-secondary);
          text-transform: uppercase;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
        }

        .property-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .property-row:last-child {
          margin-bottom: 0;
        }

        .property-input {
          background: var(--figma-bg-secondary);
          border: 1px solid var(--figma-border);
          border-radius: 6px;
          color: var(--figma-text);
          padding: 6px 8px;
          font-size: 13px;
          outline: none;
          transition: all 0.2s ease;
          flex: 1;
        }

        .property-input:focus {
          border-color: var(--figma-accent);
          box-shadow: 0 0 0 2px rgba(24, 160, 251, 0.2);
        }

        .property-input.small {
          width: 60px;
          flex: none;
        }

        .property-label {
          font-size: 12px;
          color: var(--figma-text-secondary);
          width: 20px;
          text-align: center;
          flex: none;
        }

        .color-input {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          background: none;
          padding: 0;
          outline: none;
        }

        .color-input::-webkit-color-swatch-wrapper {
          padding: 0;
          border-radius: 6px;
          border: 1px solid var(--figma-border);
        }

        .color-input::-webkit-color-swatch {
          border: none;
          border-radius: 5px;
        }

        .slider-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .property-slider {
          flex: 1;
          height: 4px;
          -webkit-appearance: none;
          background: var(--figma-border);
          border-radius: 2px;
          outline: none;
        }

        .property-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          background: var(--figma-accent);
          border-radius: 50%;
          cursor: pointer;
        }

        .property-slider::-moz-range-thumb {
          width: 14px;
          height: 14px;
          background: var(--figma-accent);
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        .checkbox-container {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .property-checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--figma-accent);
        }

        .select-container {
          position: relative;
          flex: 1;
        }

        .property-select {
          width: 100%;
          background: var(--figma-bg-secondary);
          border: 1px solid var(--figma-border);
          border-radius: 6px;
          color: var(--figma-text);
          padding: 6px 8px;
          font-size: 13px;
          outline: none;
          appearance: none;
          cursor: pointer;
        }

        .property-select:focus {
          border-color: var(--figma-accent);
          box-shadow: 0 0 0 2px rgba(24, 160, 251, 0.2);
        }

        .dimension-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .transform-controls {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }

        .icon-btn {
          width: 32px;
          height: 32px;
          background: var(--figma-bg-secondary);
          border: 1px solid var(--figma-border);
          border-radius: 6px;
          color: var(--figma-text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .icon-btn:hover {
          background: var(--figma-border);
          color: var(--figma-text);
        }

        .icon-btn.active {
          background: var(--figma-accent);
          color: white;
          border-color: var(--figma-accent);
        }
      `;
      document.head.appendChild(style);
    }
  }

  private updatePanelContent(): void {
    if (!this.panel || !this.currentObject) return;

    const header = this.panel.querySelector('.object-type-indicator');
    const content = this.panel.querySelector('.property-panel-content');
    
    if (!header || !content) return;

    // 更新标题
    header.textContent = this.getObjectTypeLabel(this.currentObject.type);

    // 生成内容
    content.innerHTML = this.generatePropertyContent();

    // 绑定事件
    this.bindEvents();
  }

  private getObjectTypeLabel(type: string): string {
    const labels = {
      'rectangle': '矩形',
      'circle': '圆形', 
      'triangle': '三角形',
      'star': '星形',
      'line': '直线',
      'arrow': '箭头',
      'text': '文字',
      'pen': '画笔',
      'hand-drawn': '手绘',
      'eraser': '橡皮擦',
      'highlighter': '荧光笔'
    };
    return labels[type as keyof typeof labels] || type;
  }

  private generatePropertyContent(): string {
    if (!this.currentObject) return '';

    const obj = this.currentObject;
    const opts = obj.options;
    
    let content = '';

    // 位置和尺寸
    content += `
      <div class="property-section">
        <div class="property-section-title">位置和尺寸</div>
        <div class="property-row">
          <span class="property-label">X</span>
          <input type="number" class="property-input small" id="prop-x" value="${Math.round(obj.bounds.x)}" step="1">
          <span class="property-label">Y</span>
          <input type="number" class="property-input small" id="prop-y" value="${Math.round(obj.bounds.y)}" step="1">
        </div>
        <div class="property-row">
          <span class="property-label">W</span>
          <input type="number" class="property-input small" id="prop-width" value="${Math.round(obj.bounds.width)}" step="1" min="1">
          <span class="property-label">H</span>
          <input type="number" class="property-input small" id="prop-height" value="${Math.round(obj.bounds.height)}" step="1" min="1">
        </div>
        ${obj.transform ? `
        <div class="property-row">
          <span class="property-label">🔄</span>
          <input type="number" class="property-input small" id="prop-rotation" value="${Math.round((obj.transform.rotation || 0) * 180 / Math.PI)}" step="1">
          <span style="font-size: 11px; color: var(--figma-text-secondary);">°</span>
        </div>
        ` : ''}
      </div>
    `;

    // 填充和描边
    if (obj.type !== 'text') {
      content += `
        <div class="property-section">
          <div class="property-section-title">填充和描边</div>
          <div class="property-row">
            <input type="color" class="color-input" id="prop-stroke-color" value="${opts.strokeColor || opts.color}">
            <input type="number" class="property-input small" id="prop-stroke-width" value="${opts.strokeWidth}" min="1" max="50" step="1">
            <span style="font-size: 11px; color: var(--figma-text-secondary);">px</span>
          </div>
          ${['rectangle', 'circle', 'triangle', 'star'].includes(obj.type) ? `
          <div class="property-row">
            <label class="checkbox-container">
              <input type="checkbox" class="property-checkbox" id="prop-has-fill" ${opts.hasFill ? 'checked' : ''}>
              <span>填充</span>
            </label>
            ${opts.hasFill ? `<input type="color" class="color-input" id="prop-fill-color" value="${opts.fillColor || opts.color}">` : ''}
          </div>
          ` : ''}
        </div>
      `;
    }

    // 文字属性
    if (obj.type === 'text') {
      content += `
        <div class="property-section">
          <div class="property-section-title">文字</div>
          <div class="property-row">
            <input type="text" class="property-input" id="prop-text" value="${obj.text || ''}" placeholder="输入文字">
          </div>
          <div class="property-row">
            <select class="property-select" id="prop-font-family">
              <option value="Arial" ${opts.fontFamily === 'Arial' ? 'selected' : ''}>Arial</option>
              <option value="Helvetica" ${opts.fontFamily === 'Helvetica' ? 'selected' : ''}>Helvetica</option>
              <option value="Times New Roman" ${opts.fontFamily === 'Times New Roman' ? 'selected' : ''}>Times</option>
              <option value="Georgia" ${opts.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option>
              <option value="Verdana" ${opts.fontFamily === 'Verdana' ? 'selected' : ''}>Verdana</option>
            </select>
          </div>
          <div class="property-row">
            <input type="number" class="property-input small" id="prop-font-size" value="${opts.fontSize}" min="8" max="200" step="1">
            <span style="font-size: 11px; color: var(--figma-text-secondary);">px</span>
            <input type="color" class="color-input" id="prop-text-color" value="${opts.color}">
          </div>
          <div class="property-row">
            <select class="property-select" id="prop-font-weight">
              <option value="normal" ${opts.fontWeight === 'normal' ? 'selected' : ''}>Regular</option>
              <option value="bold" ${opts.fontWeight === 'bold' ? 'selected' : ''}>Bold</option>
            </select>
          </div>
        </div>
      `;
    }

    // 透明度
    content += `
      <div class="property-section">
        <div class="property-section-title">透明度</div>
        <div class="property-row">
          <div class="slider-container">
            <input type="range" class="property-slider" id="prop-opacity" value="${opts.opacity * 100}" min="0" max="100" step="1">
            <span style="font-size: 11px; color: var(--figma-text-secondary); width: 30px;">${Math.round(opts.opacity * 100)}%</span>
          </div>
        </div>
      </div>
    `;

    // 阴影效果
    content += `
      <div class="property-section">
        <div class="property-section-title">阴影</div>
        <div class="property-row">
          <label class="checkbox-container">
            <input type="checkbox" class="property-checkbox" id="prop-has-shadow" ${opts.shadowBlur && opts.shadowBlur > 0 ? 'checked' : ''}>
            <span>投影</span>
          </label>
        </div>
        ${opts.shadowBlur && opts.shadowBlur > 0 ? `
        <div class="property-row">
          <input type="color" class="color-input" id="prop-shadow-color" value="${opts.shadowColor || '#000000'}">
          <input type="number" class="property-input small" id="prop-shadow-blur" value="${opts.shadowBlur}" min="0" max="50" step="1">
        </div>
        <div class="property-row">
          <span class="property-label">X</span>
          <input type="number" class="property-input small" id="prop-shadow-x" value="${opts.shadowOffsetX || 0}" step="1">
          <span class="property-label">Y</span>
          <input type="number" class="property-input small" id="prop-shadow-y" value="${opts.shadowOffsetY || 0}" step="1">
        </div>
        ` : ''}
      </div>
    `;

    return content;
  }

  private bindEvents(): void {
    if (!this.panel || !this.currentObject) return;

    // 位置和尺寸
    this.bindInputEvent('prop-x', (value) => this.config.onPropertyChange({ x: parseInt(value) }));
    this.bindInputEvent('prop-y', (value) => this.config.onPropertyChange({ y: parseInt(value) }));
    this.bindInputEvent('prop-width', (value) => this.config.onPropertyChange({ width: parseInt(value) }));
    this.bindInputEvent('prop-height', (value) => this.config.onPropertyChange({ height: parseInt(value) }));
    this.bindInputEvent('prop-rotation', (value) => this.config.onPropertyChange({ rotation: parseInt(value) * Math.PI / 180 }));

    // 样式属性
    this.bindInputEvent('prop-stroke-color', (value) => this.config.onPropertyChange({ strokeColor: value, color: value }));
    this.bindInputEvent('prop-stroke-width', (value) => this.config.onPropertyChange({ strokeWidth: parseInt(value) }));
    this.bindInputEvent('prop-fill-color', (value) => this.config.onPropertyChange({ fillColor: value }));
    this.bindCheckboxEvent('prop-has-fill', (checked) => this.config.onPropertyChange({ hasFill: checked }));

    // 文字属性
    this.bindInputEvent('prop-text', (value) => this.config.onPropertyChange({ text: value } as any));
    this.bindInputEvent('prop-font-family', (value) => this.config.onPropertyChange({ fontFamily: value }));
    this.bindInputEvent('prop-font-size', (value) => this.config.onPropertyChange({ fontSize: parseInt(value) }));
    this.bindInputEvent('prop-text-color', (value) => this.config.onPropertyChange({ color: value }));
    this.bindInputEvent('prop-font-weight', (value) => this.config.onPropertyChange({ fontWeight: value as any }));

    // 透明度
    this.bindRangeEvent('prop-opacity', (value) => this.config.onPropertyChange({ opacity: parseInt(value) / 100 }));

    // 阴影
    this.bindCheckboxEvent('prop-has-shadow', (checked) => {
      if (checked) {
        this.config.onPropertyChange({ shadowBlur: 5, shadowColor: '#000000' });
      } else {
        this.config.onPropertyChange({ shadowBlur: 0, shadowColor: 'transparent' });
      }
      // 重新生成面板内容
      this.updatePanelContent();
    });
    this.bindInputEvent('prop-shadow-color', (value) => this.config.onPropertyChange({ shadowColor: value }));
    this.bindInputEvent('prop-shadow-blur', (value) => this.config.onPropertyChange({ shadowBlur: parseInt(value) }));
    this.bindInputEvent('prop-shadow-x', (value) => this.config.onPropertyChange({ shadowOffsetX: parseInt(value) }));
    this.bindInputEvent('prop-shadow-y', (value) => this.config.onPropertyChange({ shadowOffsetY: parseInt(value) }));
  }

  private bindInputEvent(id: string, callback: (value: string) => void): void {
    const input = this.panel?.querySelector(`#${id}`) as HTMLInputElement;
    if (input) {
      input.addEventListener('input', (e) => {
        callback((e.target as HTMLInputElement).value);
      });
    }
  }

  private bindCheckboxEvent(id: string, callback: (checked: boolean) => void): void {
    const checkbox = this.panel?.querySelector(`#${id}`) as HTMLInputElement;
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        callback((e.target as HTMLInputElement).checked);
      });
    }
  }

  private bindRangeEvent(id: string, callback: (value: string) => void): void {
    const range = this.panel?.querySelector(`#${id}`) as HTMLInputElement;
    if (range) {
      range.addEventListener('input', (e) => {
        callback((e.target as HTMLInputElement).value);
        // 更新显示的百分比
        const display = range.parentElement?.querySelector('span');
        if (display) {
          display.textContent = `${(e.target as HTMLInputElement).value}%`;
        }
      });
    }
  }

  private positionPanel(position: { x: number; y: number }): void {
    if (!this.panel) return;
    
    // Figma风格：固定在右侧
    Object.assign(this.panel.style, {
      right: '20px',
      top: '20px'
    });
  }
}
