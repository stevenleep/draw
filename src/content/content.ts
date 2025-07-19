// 新的模块化架构入口文件
import { ContentController } from './ContentController';

// 创建并初始化内容脚本控制器
const controller = new ContentController();

// 设置消息监听器来处理background script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('🔧 Content script received message:', message);
  
  if (message.action === 'toggle') {
    console.log('🔧 Toggle action received, activating/deactivating drawing mode...');
    controller.toggle()
      .then(() => {
        const isActive = controller.getStatus();
        console.log('🔧 Toggle completed, drawing mode is now:', isActive ? 'active' : 'inactive');
        sendResponse({ 
          success: true, 
          active: isActive,
          message: `Drawing mode ${isActive ? 'activated' : 'deactivated'}` 
        });
      })
      .catch((error) => {
        console.error('🔧 Toggle failed:', error);
        sendResponse({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      });
    
    return true; // 异步响应
  }
  
  // 其他消息可以在这里处理
  return false;
});

// 导出控制器实例，供其他模块使用
export { controller as default };

// 为了向后兼容，保留一些全局方法
(window as any).debugToggle = () => controller.debugToggle();
(window as any).getStatus = () => controller.getStatus();
