import { GET_PAGE_CONTEXT } from "../lib/messages";
import { extractPageContext } from "../lib/page";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === GET_PAGE_CONTEXT) {
    sendResponse(extractPageContext());
  }
});
