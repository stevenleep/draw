// Background script for Chrome extension
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  
  console.log('🖱️ Extension icon clicked, tab ID:', tab.id);
  
  // 尝试发送消息，如果失败则注入脚本
  const success = await sendMessageWithRetry(tab.id);
  
  if (!success) {
    console.warn('⚠️ All attempts to communicate with content script failed');
  }
});

async function sendMessageWithRetry(tabId: number, maxRetries: number = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Attempt ${attempt}: Sending toggle message to tab ${tabId}`);
      
      const response = await chrome.tabs.sendMessage(tabId, { action: 'toggle' });
      console.log('✅ Message sent successfully, response:', response);
      return true;
      
    } catch (error) {
      console.log(`❌ Attempt ${attempt} failed:`, error);
      
      if (attempt === 1) {
        // 第一次失败，尝试注入内容脚本
        try {
          console.log('💉 Injecting content script...');
          await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
          });
          
          console.log('✅ Content script injected, waiting for initialization...');
          // 等待内容脚本初始化
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (injectionError) {
          console.error('❌ Failed to inject content script:', injectionError);
          return false;
        }
      } else if (attempt < maxRetries) {
        // 后续失败，等待一下再重试
        await new Promise(resolve => setTimeout(resolve, 200 * attempt));
      }
    }
  }
  
  return false;
}

// 监听内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Received message from content script:', message);
  
  if (message.action === 'contentScriptReady') {
    console.log('✅ Content script is ready');
    sendResponse({ success: true });
  }
  
  return true;
});
