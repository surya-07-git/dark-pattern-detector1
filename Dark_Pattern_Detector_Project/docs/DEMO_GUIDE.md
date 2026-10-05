# Dark Pattern Detector - Manager Live Demonstration Guide

Follow this step-by-step script during your project demonstration to present a polished, authoritative walkthrough.

---

## 1. Pre-Demo Setup (2 Minutes)

1. Open **Google Chrome**.
2. Navigate to `chrome://extensions/`.
3. Toggle ON **Developer mode** (top-right corner).
4. Click **Load unpacked** (top-left) and select:
   ```
   c:\mini project\extension
   ```
5. Verify the extension appears:
   - Name: **Dark Pattern Detector**
   - Version: **1.0.0**
   - Icon: **Glowing Cyan Security Shield**
6. Open your terminal in `c:\mini project\` so you have test logs and Python evaluation ready if requested.

---

## 2. Demonstration Flow

### Step 1: Explain the Problem & Architectural Philosophy (1 Minute)
> *"E-commerce and subscription sites increasingly deploy manipulative UI designs called dark patterns—such as countdown timers, pre-checked checkboxes for paid insurance, and guilt-tripping opt-out buttons. Our project protects consumers with a Manifest V3 Chrome Extension that combines deterministic DOM heuristics with a local machine learning classifier. Crucially, 100% of the analysis runs client-side inside the browser—guaranteeing complete privacy with zero external server dependencies."*

---

### Step 2: Open the Positive Test Bench & Observe Automatic Detection
1. Open the test suite in Chrome:
   Double click or open `file:///c:/mini%20project/test_pages/positive_cases.html` (or via `test_suite.html`).
2. **Point to the Chrome Extension Icon:**
   - Notice the badge on the extension icon immediately shows a **red badge indicator** (e.g. `10`).
   - Explain: *"As soon as the page completed loading, the content script analyzed the DOM in the background and notified the service worker via extension messaging to update the badge counter."*

---

### Step 3: Open the Extension Popup & Tour the UI
1. Click the extension shield icon to open the popup.
2. Show the Manager:
   - **Header:** Clean dark cybersecurity theme with the active status indicator ("Protected / Issues Flagged").
   - **Summary Bar:** Total findings count with breakdown by severity (**High**, **Medium**, **Low**).
   - **Category Filter Tabs:** Click across **Urgency**, **Scarcity**, **Shaming**, **Continuity**, **Hidden Costs**, and **Preselected**.
   - Notice how the cards filter smoothly.

---

### Step 4: Demonstrate Live Element Inspection (The "Inspect" Feature)
1. In the popup, find the **Confirmshaming Opt-Out Button** card:
   - Read the plain English explanation.
   - Point out the evidence quote: `"No thanks, I hate saving money and prefer paying full price"`.
   - Point out the severity chip (`HIGH`) and the detection method (`HYBRID`).
2. Click the **Inspect on Page** button:
   - The popup sends a message to the content script.
   - The webpage immediately scrolls down smoothly to the discount modal and outlines the reject button with a **glowing outline** and a floating label: `"Dark Pattern: Confirmshaming"`.
   - Explain to your manager: *"This outline is purely non-destructive CSS. It doesn't alter button clicks or break webpage layout."*
3. Click the close icon on the floating badge or click **Dismiss** in the popup to show that the finding can be removed cleanly.

---

### Step 5: Test the Negative Benchmark (Zero False Positives)
1. Open `file:///c:/mini%20project/test_pages/negative_cases.html`.
2. Look at the extension badge:
   - It changes to a **green checkmark (`✓`)**.
3. Open the popup:
   - Shows the **Empty State**: An emerald shield with *"No Dark Patterns Detected - This page appears transparent and ethical."*
   - Explain to your manager: *"Notice that the terms and conditions checkbox and the simple 'No thanks' button were NOT flagged. Our engine distinguishes between legitimate opt-ins and deceptive patterns."*

---

### Step 6: Show Machine Learning Explainability in the Terminal
1. In your terminal, run:
   ```powershell
   python ml_pipeline/evaluate.py
   ```
2. Show the manager:
   - **92.86% Test Accuracy** on held-out test data.
   - The **Confusion Matrix**.
   - The **Feature Attribution Section**:
     Show how the linear SVM assigns direct weights:
     - For `confirmshaming`: top features are `'i'`, `'no'`, `'i dont'`
     - For `false_urgency`: `'!'`, `'minutes'`, `'time'`, `'deal'`
     - For `forced_continuity`: `'automatically'`, `'subscription'`, `'recurring'`
   - Explain: *"This is why we chose TF-IDF + Linear SVM over black-box LLMs: we can mathematically prove and explain exactly which words drove each decision."*

---

### Step 7: Run the Automated Test Suite (Proof of Quality)
Run:
```powershell
node test_pages/test_integration.js
```
Show the final green output:
- Positive page: 10 findings across all 6 categories.
- Negative page: 0 false alarms.
- 100% test pass rate.

---

## 3. Quick Reference: Where Everything Is

| Item | Location |
| :--- | :--- |
| Extension Source Code | `c:\mini project\extension\` |
| Heuristic Engine | `c:\mini project\extension\content\heuristics.js` |
| Local In-Browser ML Engine | `c:\mini project\extension\content\ml_classifier.js` |
| Exported Weights & Vocab | `c:\mini project\extension\content\model_weights.js` |
| Python ML Lab | `c:\mini project\ml_pipeline\` |
| Test Harness Pages | `c:\mini project\test_pages\` |
| 25+ Viva Q&A Guide | `c:\mini project\docs\VIVA_QUESTIONS.md` |
