export class ToolbarRenderer {
  public createToolbar(): HTMLElement {
    console.log('🔧 Creating toolbar...');
    
    const toolbar = document.createElement('div');
    toolbar.id = 'drawing-toolbar-overlay';
    toolbar.innerHTML = this.getToolbarHTML();
    
    // 确保工具栏可见
    toolbar.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      left: 20px !important;
      z-index: 2147483647 !important;
      pointer-events: auto !important;
      background: rgba(255, 255, 255, 0.98) !important;
      backdrop-filter: blur(20px) !important;
      border-radius: 16px !important;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1) !important;
      padding: 12px !important;
      user-select: none !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      border: 1px solid rgba(0, 0, 0, 0.08) !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      cursor: grab !important;
      transition: all 0.2s ease !important;
    `;
    
    this.injectStyles();
    document.body.appendChild(toolbar);
    
    console.log('🔧 Toolbar created and appended to body');
    console.log('🔧 Toolbar element:', toolbar);
    console.log('🔧 Toolbar computed style:', window.getComputedStyle(toolbar));
    
    return toolbar;
  }

  private getToolbarHTML(): string {
    return `
      <div class="figma-toolbar-content">
        <!-- 主要工具组 -->
        <div class="figma-toolbar-section">
          <div class="figma-toolbar-group">
            <button class="figma-tool-btn active" data-mode="select" title="选择工具 (V)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 2L12 10L8 14L6.4 10L4 2Z" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
            </button>
            <button class="figma-tool-btn" data-mode="pen" title="画笔工具 (P)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 14L14 2M14 2L10 2M14 2L14 6" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            <button class="figma-tool-btn" data-mode="text" title="文字工具 (T)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 4H13V6H9V14H7V6H3V4Z" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="figma-divider"></div>

        <!-- 形状工具组 -->
        <div class="figma-toolbar-section">
          <div class="figma-toolbar-group shape-group">
            <button class="figma-tool-btn shape-main-btn" data-mode="rectangle" title="形状工具 (S)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
              </svg>
              <svg class="dropdown-arrow" width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M2 3L4 5L6 3" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            <div class="shape-dropdown">
              <button class="figma-tool-btn shape-btn" data-mode="rectangle" title="矩形 (R)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
              </button>
              <button class="figma-tool-btn shape-btn" data-mode="circle" title="椭圆 (O)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <ellipse cx="8" cy="8" rx="5.5" ry="5.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
              </button>
              <button class="figma-tool-btn shape-btn" data-mode="line" title="直线 (L)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <line x1="3" y1="13" x2="13" y2="3" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </button>
              <button class="figma-tool-btn shape-btn" data-mode="arrow" title="箭头 (A)">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 13L13 3M13 3L13 8M13 3L8 3" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </button>
              <button class="figma-tool-btn shape-btn" data-mode="triangle" title="三角形">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <polygon points="8,3 13,13 3,13" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
              </button>
              <button class="figma-tool-btn shape-btn" data-mode="star" title="五角星">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <polygon points="8,3 9.6,7.2 13.6,7.8 10.8,11 11.6,15 8,13 4.4,15 5.2,11 2.4,7.8 6.4,7.2" stroke="currentColor" stroke-width="1.5" fill="none"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div class="figma-divider"></div>

        <!-- 辅助工具组 -->
        <div class="figma-toolbar-section">
          <div class="figma-toolbar-group">
            <button class="figma-tool-btn" data-mode="highlighter" title="荧光笔工具 (H)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="11" width="10" height="3" fill="#FFD600" opacity="0.5"/>
                <rect x="3" y="3" width="10" height="6" fill="#FFD600"/>
              </svg>
            </button>
            <button class="figma-tool-btn" data-mode="eraser" title="橡皮擦工具 (E)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="11" width="6" height="3" fill="#E0E0E0"/>
                <rect x="7" y="3" width="6" height="6" fill="#E0E0E0" opacity="0.5"/>
              </svg>
            </button>
            <button class="figma-tool-btn" data-mode="hand-drawn" title="手绘风格">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="3" width="10" height="10" stroke="currentColor" stroke-width="1.5" fill="none"/>
                <path d="M3 3 Q8 1 13 3 Q15 8 13 13 Q8 15 3 13 Q1 8 3 3 Z" stroke="currentColor" stroke-width="1" fill="none"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="figma-divider"></div>

        <!-- 操作工具组 -->
        <div class="figma-toolbar-section">
          <div class="figma-toolbar-group">
            <button class="figma-tool-btn" id="undo-btn" title="撤销 (Ctrl+Z)">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3H4C3.44772 3 3 3.44772 3 4V12C3 12.5523 3.44772 13 4 13H12C12.5523 13 13 12.5523 13 12V4C13 3.44772 12.5523 3 12 3H10M6 3V7M6 3L10 7" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            <button class="figma-tool-btn" id="clear-btn" title="清空画布">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M5 5L11 11M11 5L5 11" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="figma-divider"></div>

        <!-- 功能工具组 -->
        <div class="figma-toolbar-section">
          <div class="figma-toolbar-group">
            <button class="figma-tool-btn" id="capture-btn" title="截图">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 5C3 3.89543 3.89543 3 5 3H11C12.1046 3 13 3.89543 13 5V11C13 12.1046 12.1046 13 11 13H5C3.89543 13 3 12.1046 3 11V5Z" stroke="currentColor" stroke-width="1.5"/>
                <circle cx="6" cy="7" r="1.5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M3 11L6 8L9 11" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            <button class="figma-tool-btn" id="toggle-props-btn" title="属性面板">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3H13V5H3V3Z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M3 7H13V9H3V7Z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M3 11H13V13H3V11Z" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
            <button class="figma-tool-btn" id="settings-btn" title="设置">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 2V4" stroke="currentColor" stroke-width="1.5"/>
                <path d="M8 12V14" stroke="currentColor" stroke-width="1.5"/>
                <path d="M14 8H12" stroke="currentColor" stroke-width="1.5"/>
                <path d="M4 8H2" stroke="currentColor" stroke-width="1.5"/>
                <path d="M13.5 3.5L12 5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M4 11L2.5 12.5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M11 11L12.5 12.5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M5 3.5L6.5 2" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- 属性面板 -->
      <div class="figma-toolbar-properties" style="display: none;">
        <div class="props-section">
          <div class="props-group">
            <div class="props-group-label">颜色</div>
            <input type="color" class="props-input" id="color-picker" value="#ff0000">
          </div>
          
          <div class="props-group">
            <div class="props-group-label">线条粗细</div>
            <input type="range" class="props-slider" id="stroke-width" min="1" max="20" value="5">
            <span class="props-value" id="stroke-width-value">5</span>
          </div>
          
          <div class="props-group">
            <div class="props-group-label">透明度</div>
            <input type="range" class="props-slider" id="opacity" min="0.1" max="1" step="0.1" value="1">
            <span class="props-value" id="opacity-value">100%</span>
          </div>
          
          <div class="props-group" id="text-props" style="display: none;">
            <div class="props-group-label">字体大小</div>
            <input type="range" class="props-slider" id="font-size" min="8" max="72" value="16">
            <span class="props-value" id="font-size-value">16</span>
            
            <div class="props-group-label">文本对齐</div>
            <div class="props-buttons">
              <button class="props-btn draw-align-btn active" data-align="left" title="左对齐">L</button>
              <button class="props-btn draw-align-btn" data-align="center" title="居中">C</button>
              <button class="props-btn draw-align-btn" data-align="right" title="右对齐">R</button>
            </div>
            
            <div class="props-group-label">字体粗细</div>
            <div class="props-buttons">
              <button class="props-btn draw-weight-btn active" data-weight="normal" title="正常">N</button>
              <button class="props-btn draw-weight-btn" data-weight="bold" title="粗体">B</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 设置面板 -->
      <div class="figma-settings-panel" style="display: none;">
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" id="auto-save">
            自动保存
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" id="show-shortcuts">
            显示快捷键提示
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" id="enable-sound">
            启用音效
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">画布质量</label>
          <select id="canvas-quality">
            <option value="high">高质量</option>
            <option value="medium" selected>中等质量</option>
            <option value="low">低质量</option>
          </select>
        </div>
        
        <div class="setting-actions">
          <button id="reset-settings" class="setting-btn">重置设置</button>
          <button id="export-settings" class="setting-btn">导出设置</button>
        </div>
      </div>
    `;
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = this.getToolbarStyles();
    document.head.appendChild(style);
  }

  private getToolbarStyles(): string {
    return `
      #drawing-toolbar-overlay {
        position: fixed !important;
        top: 20px !important;
        left: 20px !important;
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(10px) !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12) !important;
        padding: 8px !important;
        z-index: 2147483647 !important;
        pointer-events: auto !important;
        user-select: none !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        border: 1px solid rgba(0, 0, 0, 0.1) !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        min-width: 40px !important;
        min-height: 40px !important;
      }

      #drawing-toolbar-overlay .figma-toolbar-content {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
      }

      #drawing-toolbar-overlay .figma-toolbar-section {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
      }

      #drawing-toolbar-overlay .figma-toolbar-group {
        display: flex !important;
        flex-direction: column !important;
        gap: 2px !important;
        position: relative !important;
      }

      #drawing-toolbar-overlay .figma-divider {
        height: 1px !important;
        background: rgba(0, 0, 0, 0.1) !important;
        margin: 4px 0 !important;
      }

      #drawing-toolbar-overlay .figma-tool-btn {
        width: 36px !important;
        height: 36px !important;
        border: none !important;
        background: transparent !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #333 !important;
        transition: all 0.2s ease !important;
        position: relative !important;
        font-size: 12px !important;
        font-weight: normal !important;
        text-decoration: none !important;
        outline: none !important;
        margin: 2px !important;
      }

      #drawing-toolbar-overlay .figma-tool-btn:hover {
        background: rgba(0, 0, 0, 0.06) !important;
        transform: translateY(-1px) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
      }

      #drawing-toolbar-overlay .figma-tool-btn.active {
        background: linear-gradient(135deg, #18a0fb, #0d8ce6) !important;
        color: white !important;
        box-shadow: 0 2px 8px rgba(24, 160, 251, 0.3) !important;
      }

      #drawing-toolbar-overlay .figma-tool-btn:active {
        transform: scale(0.95) translateY(0) !important;
      }

      #drawing-toolbar-overlay .shape-group {
        position: relative !important;
      }

      #drawing-toolbar-overlay .shape-dropdown {
        position: absolute !important;
        top: 100% !important;
        left: 0 !important;
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(10px) !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
        padding: 4px !important;
        display: none !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 2px !important;
        z-index: 1000 !important;
        border: 1px solid rgba(0, 0, 0, 0.1) !important;
      }

      #drawing-toolbar-overlay .shape-group:hover .shape-dropdown {
        display: grid !important;
      }

      #drawing-toolbar-overlay .dropdown-arrow {
        position: absolute !important;
        bottom: 2px !important;
        right: 2px !important;
        opacity: 0.6 !important;
      }

      #drawing-toolbar-overlay .figma-toolbar-properties {
        position: absolute !important;
        left: 100% !important;
        top: 0 !important;
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(10px) !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
        padding: 12px !important;
        margin-left: 8px !important;
        min-width: 200px !important;
        border: 1px solid rgba(0, 0, 0, 0.1) !important;
      }

      #drawing-toolbar-overlay .figma-settings-panel {
        position: absolute !important;
        left: 100% !important;
        top: 0 !important;
        background: rgba(255, 255, 255, 0.95) !important;
        backdrop-filter: blur(10px) !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
        padding: 12px !important;
        margin-left: 8px !important;
        min-width: 200px !important;
        border: 1px solid rgba(0, 0, 0, 0.1) !important;
      }

      #drawing-toolbar-overlay .props-section {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
      }

      #drawing-toolbar-overlay .props-group {
        display: flex !important;
        flex-direction: column !important;
        gap: 4px !important;
      }

      #drawing-toolbar-overlay .props-group-label {
        font-size: 12px !important;
        font-weight: 500 !important;
        color: #666 !important;
      }

      #drawing-toolbar-overlay .props-input {
        width: 100% !important;
        height: 24px !important;
        border: 1px solid rgba(0, 0, 0, 0.2) !important;
        border-radius: 4px !important;
        padding: 2px !important;
      }

      #drawing-toolbar-overlay .props-slider {
        width: 100% !important;
        height: 4px !important;
        border-radius: 2px !important;
        background: rgba(0, 0, 0, 0.1) !important;
        outline: none !important;
      }

      #drawing-toolbar-overlay .props-value {
        font-size: 11px !important;
        color: #666 !important;
        text-align: center !important;
      }

      #drawing-toolbar-overlay .props-buttons {
        display: flex !important;
        gap: 2px !important;
      }

      #drawing-toolbar-overlay .props-btn {
        flex: 1 !important;
        height: 24px !important;
        border: 1px solid rgba(0, 0, 0, 0.2) !important;
        background: white !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        font-size: 11px !important;
        font-weight: 500 !important;
      }

      #drawing-toolbar-overlay .props-btn.active {
        background: #18a0fb !important;
        color: white !important;
        border-color: #18a0fb !important;
      }

      .setting-group {
        margin-bottom: 12px;
      }

      .setting-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        cursor: pointer;
      }

      .setting-label input[type="checkbox"] {
        margin: 0;
      }

      .setting-label select {
        width: 100%;
        height: 24px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        padding: 2px;
        font-size: 12px;
      }

      .setting-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
      }

      .setting-btn {
        flex: 1;
        height: 24px;
        border: 1px solid rgba(0, 0, 0, 0.2);
        background: white;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      }

      .setting-btn:hover {
        background: rgba(0, 0, 0, 0.05);
      }

      @media (max-width: 768px) {
        #drawing-toolbar-overlay {
          top: 10px;
          left: 10px;
          padding: 6px;
        }

        .figma-tool-btn {
          width: 28px;
          height: 28px;
        }

        .figma-toolbar-properties,
        .figma-settings-panel {
          left: 0;
          top: 100%;
          margin-left: 0;
          margin-top: 8px;
        }
      }
    `;
  }
} 