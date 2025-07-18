<script>
  import { onMount } from 'svelte';
  
  let isActive = false;
  let currentMode = 'pen';
  let currentOptions = {
    color: '#000000',
    strokeWidth: 2,
    fontSize: 16,
    roughness: 1
  };

  let tab = null;

  const modes = [
    { id: 'pen', name: '画笔', icon: '✏️' },
    { id: 'arrow', name: '箭头', icon: '↗️' },
    { id: 'text', name: '文字', icon: '📝' },
    { id: 'rectangle', name: '矩形', icon: '⬜' },
    { id: 'circle', name: '圆形', icon: '⭕' },
    { id: 'hand-drawn', name: '手绘', icon: '🎨' }
  ];

  onMount(async () => {
    // 获取当前标签页
    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = activeTab;
    } catch (error) {
      console.error('Failed to get active tab:', error);
    }
  });

  async function sendMessage(action, data = {}) {
    if (!tab?.id) return { success: false, error: 'No active tab' };
    
    try {
      return await chrome.tabs.sendMessage(tab.id, { action, ...data });
    } catch (error) {
      console.error('Message send error:', error);
      return { success: false, error: error.message };
    }
  }

  async function toggleDrawing() {
    const response = await sendMessage('toggle');
    if (response.success) {
      isActive = response.active;
    }
  }

  async function setMode(mode) {
    currentMode = mode;
    await sendMessage('setMode', { mode });
  }

  async function updateOptions() {
    await sendMessage('setOptions', { options: currentOptions });
  }

  async function clearCanvas() {
    await sendMessage('clear');
  }

  async function deleteSelected() {
    await sendMessage('deleteSelected');
  }

  async function undo() {
    await sendMessage('undo');
  }

  async function download(includeBackground = true) {
    await sendMessage('download', { includeBackground });
  }

  // 响应式更新选项
  $: if (currentOptions) {
    updateOptions();
  }
</script>

<div class="popup-container">
  <header class="popup-header">
    <h1>🎨 绘画工具</h1>
    <button 
      class="toggle-btn" 
      class:active={isActive}
      on:click={toggleDrawing}
    >
      {isActive ? '关闭' : '开启'}
    </button>
  </header>

  {#if isActive}
    <div class="content">
      <!-- 绘画模式选择 -->
      <section class="section">
        <h3>绘画模式</h3>
        <div class="mode-grid">
          {#each modes as mode}
            <button 
              class="mode-btn"
              class:active={currentMode === mode.id}
              on:click={() => setMode(mode.id)}
            >
              <span class="mode-icon">{mode.icon}</span>
              <span class="mode-name">{mode.name}</span>
            </button>
          {/each}
        </div>
      </section>

      <!-- 画笔设置 -->
      <section class="section">
        <h3>画笔设置</h3>
        <div class="option-group">
          <label>
            颜色
            <input 
              type="color" 
              bind:value={currentOptions.color}
              class="color-input"
            />
          </label>
          
          <label>
            粗细: {currentOptions.strokeWidth}px
            <input 
              type="range" 
              min="1" 
              max="20" 
              bind:value={currentOptions.strokeWidth}
              class="range-input"
            />
          </label>

          {#if currentMode === 'text'}
            <label>
              字体大小: {currentOptions.fontSize}px
              <input 
                type="range" 
                min="12" 
                max="48" 
                bind:value={currentOptions.fontSize}
                class="range-input"
              />
            </label>
          {/if}

          {#if currentMode === 'hand-drawn'}
            <label>
              粗糙度: {currentOptions.roughness}
              <input 
                type="range" 
                min="0.5" 
                max="5" 
                step="0.1"
                bind:value={currentOptions.roughness}
                class="range-input"
              />
            </label>
          {/if}
        </div>
      </section>

      <!-- 操作按钮 -->
      <section class="section">
        <h3>操作</h3>
        <div class="action-grid">
          <button class="action-btn secondary" on:click={undo}>
            ↶ 撤销
          </button>
          <button class="action-btn secondary" on:click={deleteSelected}>
            🗑️ 删除选中
          </button>
          <button class="action-btn secondary" on:click={clearCanvas}>
            🗑️ 清空全部
          </button>
          <button class="action-btn primary" on:click={() => download(true)}>
            📥 含背景
          </button>
          <button class="action-btn primary" on:click={() => download(false)}>
            📥 纯绘图
          </button>
        </div>
      </section>
    </div>
  {:else}
    <div class="inactive-state">
      <p>点击"开启"按钮激活绘画模式</p>
      <p class="hint">激活后可在页面上进行绘画和标注</p>
    </div>
  {/if}
</div>

<style>
  .popup-container {
    width: 320px;
    min-height: 400px;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #e0e0e0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .popup-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  .toggle-btn {
    padding: 8px 16px;
    border: 2px solid white;
    border-radius: 6px;
    background: transparent;
    color: white;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .toggle-btn:hover {
    background: white;
    color: #667eea;
  }

  .toggle-btn.active {
    background: #ff4757;
    border-color: #ff4757;
  }

  .content {
    padding: 20px;
  }

  .section {
    margin-bottom: 24px;
  }

  .section h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .mode-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .mode-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .mode-btn:hover {
    border-color: #667eea;
    background: #f8f9ff;
  }

  .mode-btn.active {
    border-color: #667eea;
    background: #667eea;
    color: white;
  }

  .mode-icon {
    font-size: 20px;
    margin-bottom: 4px;
  }

  .mode-name {
    font-size: 12px;
    font-weight: 500;
  }

  .option-group {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .option-group label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
    color: #555;
  }

  .color-input {
    width: 40px;
    height: 32px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
  }

  .range-input {
    width: 120px;
    height: 6px;
    border-radius: 3px;
    background: #e0e0e0;
    outline: none;
    cursor: pointer;
  }

  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .action-btn {
    padding: 12px 16px;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 14px;
  }

  .action-btn.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .action-btn.primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
  }

  .action-btn.secondary {
    background: #f5f5f5;
    color: #666;
    border: 1px solid #e0e0e0;
  }

  .action-btn.secondary:hover {
    background: #e0e0e0;
  }

  .inactive-state {
    padding: 40px 20px;
    text-align: center;
    color: #666;
    font-size: 14px;
  }

  .hint {
    margin-top: 8px;
    font-size: 12px;
    color: #999;
  }
</style>
