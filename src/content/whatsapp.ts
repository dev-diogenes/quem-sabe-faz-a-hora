import { GET_CONVERSATION } from "../lib/messages";
import { extractWhatsAppChat } from "../conversas/extract-whatsapp";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === GET_CONVERSATION) sendResponse(extractWhatsAppChat());
});
