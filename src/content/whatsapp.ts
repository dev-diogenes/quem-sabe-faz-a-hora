import { GET_WHATSAPP_CHAT } from "../lib/messages";
import { extractWhatsAppChat } from "../whatsapp/extract";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === GET_WHATSAPP_CHAT) {
    sendResponse(extractWhatsAppChat());
  }
});
