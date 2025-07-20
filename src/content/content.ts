import { ContentController } from "./ContentController";

const controller = new ContentController();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggle") {
    controller
      .toggle()
      .then(() => {
        const isActive = controller.getStatus();
        sendResponse({
          success: true,
          active: isActive,
          message: `Drawing mode ${isActive ? "activated" : "deactivated"}`,
        });
      })
      .catch((error) => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });

    return true;
  }

  return false;
});

export { controller as default };
