/**
 * Background Service Worker (Manifest V3)
 * 
 * Responsibilities:
 * 1. Coordinates extension lifecycle and tab state.
 * 2. Updates the extension action icon badge (count of detected dark patterns).
 * 3. Caches scan results per tab for instantaneous retrieval by the popup.
 * 4. Routes cross-component messages between content scripts and popup UI.
 */

// In-memory cache of findings keyed by tab ID
// Schema: { [tabId: number]: { url: string, timestamp: number, findings: Array, summary: Object } }
const tabScanCache = new Map();

/**
 * Updates the extension badge for a given tab.
 * @param {number} tabId - The ID of the browser tab.
 * @param {number} count - Number of potential dark patterns detected.
 */
function updateBadge(tabId, count) {
  if (!chrome.action) return;

  if (count > 0) {
    chrome.action.setBadgeText({ tabId, text: String(count) });
    chrome.action.setBadgeBackgroundColor({
      tabId,
      color: count >= 3 ? "#EF4444" : "#F59E0B" // Red if high count, Amber if moderate
    });
  } else {
    chrome.action.setBadgeText({ tabId, text: "✓" });
    chrome.action.setBadgeBackgroundColor({ tabId, color: "#10B981" }); // Emerald green (clean)
  }
}

/**
 * Message listener for extension communications.
 * Validates message type and payload to uphold Manifest V3 security best practices.
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Guard against null/invalid messages
  if (!message || typeof message !== "object") {
    sendResponse({ status: "error", error: "Invalid message payload" });
    return false;
  }

  const tabId = sender.tab ? sender.tab.id : message.tabId;

  switch (message.type) {
    case "SCAN_RESULTS_READY": {
      // Sent by content script when a scan completes
      if (tabId) {
        tabScanCache.set(tabId, {
          url: sender.tab?.url || message.url,
          timestamp: Date.now(),
          findings: message.findings || [],
          summary: message.summary || {}
        });

        // Update badge count
        const totalPatterns = (message.findings || []).length;
        updateBadge(tabId, totalPatterns);
      }
      sendResponse({ status: "acknowledged", tabId });
      break;
    }

    case "GET_SCAN_RESULTS": {
      // Sent by popup when opened
      const targetTabId = message.tabId || tabId;
      const cached = tabScanCache.get(targetTabId);
      sendResponse({ status: "success", data: cached || null });
      break;
    }

    case "CLEAR_TAB_CACHE": {
      if (tabId && tabScanCache.has(tabId)) {
        tabScanCache.delete(tabId);
        chrome.action.setBadgeText({ tabId, text: "" });
      }
      sendResponse({ status: "cleared" });
      break;
    }

    default:
      // Unknown message type
      sendResponse({ status: "ignored" });
      break;
  }

  // Return true if asynchronous response is needed; false for synchronous
  return false;
});

/**
 * Clean up tab cache when a tab is closed to prevent memory leaks.
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  tabScanCache.delete(tabId);
});

/**
 * Reset badge on tab navigation.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    chrome.action.setBadgeText({ tabId, text: "" });
  }
});
