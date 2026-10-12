import { GET_CONVERSATION } from "../lib/messages";
import { extractGmailThread } from "../conversas/extract-gmail";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === GET_CONVERSATION) sendResponse(extractGmailThread());
});
