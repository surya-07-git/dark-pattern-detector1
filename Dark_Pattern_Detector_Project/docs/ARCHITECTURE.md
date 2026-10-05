# System Architecture & Technical Specification

## 1. Project Overview & Core Mission

The **Dark Pattern Detector** is a privacy-first, client-side Chrome Extension (Manifest V3) designed to identify, categorize, and explain deceptive user-interface techniques on e-commerce, booking, and SaaS subscription platforms.

Unlike ad blockers that destructively remove content or alter webpage code, our tool acts as a **transparent shopping advisor**. It scans live DOM structures and visible text, displays non-destructive visual highlight outlines, and educates the consumer with clear explanations of *why* an element may be manipulative—without ever touching form inputs, changing checkout totals, or modifying user purchases.

---

## 2. Manifest V3 Chrome Extension Architecture

Manifest V3 (MV3) is Google's modern standard for browser extensions. This project is architected according to MV3 security principles:

```
+-------------------------------------------------------------------------+
|                              CHROME BROWSER                             |
|                                                                         |
|  +--------------------+                     +------------------------+  |
|  |    WEBPAGE TAB     |                     |    EXTENSION POPUP     |  |
|  |                    |                     |                        |  |
|  |  +--------------+  |  chrome.tabs        |  +------------------+  |  |
|  |  |  Live DOM    |  |  .sendMessage       |  | popup.html / js  |  |  |
|  |  +-------+------+  | <=================> |  +------------------+  |  |
|  |          |         |                     |  - Category Filter     |  |
|  |  +-------v------+  |                     |  - Severity Metrics    |  |
|  |  | content.js   |  |                     |  - Inspect / Dismiss   |  |
|  |  | (Injected)   |  |                     +------------------------+  |
|  |  +-------+------+  |                                                 |
|  |          |         |  chrome.runtime                                 |
|  |     +----+----+    |  .sendMessage                                   |
|  |     |         |    |        |                                        |
|  |  +--v---+  +--v-+  |        v                                        |
|  |  |Heur- |  |ML  |  |     +--------------------+                      |
|  |  |istics|  |SVM |  |     |  background.js     |                      |
|  |  +------+  +----+  |     |  (Service Worker)  |                      |
|  +--------------------+     +---------+----------+                      |
|                                       |                                 |
|                               +-------v-------+                         |
|                               | Action Badge  |                         |
|                               | (Count/Color) |                         |
|                               +---------------+                         |
+-------------------------------------------------------------------------+
```

### Key Architectural Components

1. **Manifest File (`manifest.json`):**
   - Declares `manifest_version: 3`.
   - Uses minimal permissions: `"activeTab"` and `"storage"`.
   - Avoids elevated, intrusive permissions like `<all_urls>` background interception or webRequest blocking.
   - Enforces zero remote script execution (all scripts are bundled locally).

2. **Background Service Worker (`background/background.js`):**
   - Purely event-driven; sleeps when not processing events, maximizing memory efficiency.
   - Listens for `SCAN_RESULTS_READY` and updates the Chrome action icon badge with the detected count and color-coded severity (Emerald for 0, Amber for moderate, Red for high).
   - Maintains an in-memory cache keyed by `tabId` to instantly deliver results to the popup.

3. **Content Script (`content/content.js`):**
   - Injected into web pages at `document_idle`.
   - Coordinates the two detection engines: `DarkPatternHeuristics` and `DarkPatternML`.
   - Merges findings and elevates items verified by both into `detectionMethod: 'hybrid'` with boosted confidence.
   - Provides non-destructive DOM highlighting with dismissible floating badges.
   - Strictly ignores password fields and payment-card inputs for user privacy.

4. **Popup Interface (`popup/popup.html`, `popup.js`, `popup.css`):**
   - Dark cybersecurity aesthetic with high contrast and accessible design.
   - Real-time tab communication via `chrome.tabs.sendMessage`.
   - Filter chips for category drilling, empty/loading/error state management, and modal privacy disclosure.

---

## 3. Dual Detection Engine Design: Heuristics vs. ML

| Feature | Heuristic Engine (`heuristics.js`) | ML Text Classifier (`ml_classifier.js`) |
| :--- | :--- | :--- |
| **Primary Domain** | Structural, dynamic, and state-based DOM patterns. | Semantic nuances, guilt phrasing, subtle framing. |
| **Input** | DOM nodes, tag names, computed styles, attributes (`checked`, `aria-*`). | Extracted visible text strings and n-grams. |
| **Strengths** | Can detect checkboxes checked by default, ticking DOM countdowns, hidden line items. | Understands linguistic nuance, guilt-tripping phrasing, and urgency metaphors. |
| **Runtime** | Instantaneous (< 2 ms) direct DOM traversal. | Sublinear TF-IDF + Linear SVM dot product (< 3 ms). |
| **Explainability** | Shows exact DOM selector, HTML tag, and matching attribute. | Shows exact mathematical feature attributions (top token weights). |

### Hybrid Synthesis
When an element matches both structural criteria (e.g. an opt-out button) and the ML classifier flags it with high confidence, the content script marks the finding as **`Hybrid`** and increases its confidence score, providing the highest grade of certainty.

---

## 4. Machine Learning Pipeline (TF-IDF + Linear SVM)

### Why TF-IDF with Linear Support Vector Machine?
1. **Explainability:** Unlike deep neural networks or LLMs which operate as black boxes, a Linear SVM decision function is directly interpretable:
   $$\text{score}(x, c) = \sum_{i} x_i \cdot w_{c, i} + b_c$$
   Every token's coefficient $w_{c,i}$ directly reveals whether it pushed the prediction toward a dark pattern or toward legitimate copy.
2. **Deterministic Edge Deployment:** The vocabulary (terms), IDF weights, and coefficient matrix serialize into a ~133 KB JSON structure. This allows complete client-side JavaScript execution without WebAssembly bloat or remote API dependencies.
3. **No Network Latency:** Inference occurs in under 3 milliseconds directly inside the tab.
4. **Privacy:** Zero customer text is transmitted over the internet.

---

## 5. Security & Privacy Guarantees

1. **Local-Only Execution:** 100% of DOM traversal and ML inference runs inside the user's browser.
2. **Sensitive Context Filtering:** Form controls matching `input[type="password"]`, `autocomplete="cc-number"`, and billing inputs are ignored by policy during DOM text extraction.
3. **Non-Destructive Guarantee:** Highlighting uses CSS outlines (`outline: 3px solid #06B6D4`). It does not alter element positions, clear input values, or intercept form submissions.
4. **No Dynamic Code Evaluation:** Strictly complies with CSP by omitting `eval()`, `new Function()`, or remote script tags.
