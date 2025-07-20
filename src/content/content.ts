
import { ContentController } from './ContentController';


const controller = new ContentController();


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
    
    return true;
  }
  

  return false;
});


export { controller as default };


(window as any).debugToggle = () => controller.debugToggle();
(window as any).getStatus = () => controller.getStatus();
