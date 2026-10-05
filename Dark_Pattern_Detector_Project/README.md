# Dark Pattern Detector - Chrome Extension (Manifest V3)

> **A professional, privacy-preserving browser extension that scans webpages for deceptive e-commerce design patterns using deterministic DOM heuristics and explainable in-browser machine learning.**

---

## 1. Executive Summary

E-commerce and subscription services frequently employ manipulative user interfaces called **dark patterns** to nudge shoppers into unintended decisions—such as stealth auto-renewing subscriptions, hidden administrative fees, preselected paid add-ons, or guilt-tripping opt-out buttons.

The **Dark Pattern Detector** acts as an ethical, non-intrusive shopping advisor:
- **100% Client-Side:** Traversal and machine learning inference run entirely inside the user's browser with **zero external server dependencies** and **zero data transmission**.
- **Hybrid Detection:** Combines 6 deterministic DOM structural heuristic engines with a local TF-IDF + Linear SVM NLP classifier.
- **Explainable by Design:** Every finding provides a plain-English explanation, DOM evidence quote, detection method, severity rating, and false-positive limitation.
- **Non-Destructive UI:** Highlights suspect elements using gentle CSS outlines without altering form values, shopping carts, or purchase buttons.

---

## 2. The 6 Detection Categories

| Category | Technique | What It Detects |
| :--- | :--- | :--- |
| **1. False Urgency** | Hybrid (DOM + ML) | Artificial ticking countdown timers and high-pressure deadline copy ("Hurry! Sale ends in 04:59"). |
| **2. Scarcity Claims** | Hybrid (DOM + ML) | Synthetic low-stock alerts ("Only 2 left in stock") and visitor tickers ("18 people viewing"). |
| **3. Confirmshaming** | Text ML + Heuristics | Guilt-inducing opt-out buttons ("No thanks, I hate saving money and prefer paying full price"). |
| **4. Forced Continuity** | Heuristics + ML | Obscure recurring billing clauses tucked into fine print without accessible cancellation options. |
| **5. Hidden Costs** | DOM Traversal | Surprise fees, administrative charges, and convenience surcharges revealed late in checkout. |
| **6. Preselected Options** | DOM State Inspection | Checkboxes pre-checked by default for optional warranties, express handling, or marketing spam. |

---

## 3. Project Directory Structure

```
c:\mini project\
├── extension\                         # Manifest V3 Chrome Extension
│   ├── manifest.json                  # Manifest V3 configuration (activeTab, storage permissions)
│   ├── icons\                         # Crisp security shield icons (16px, 48px, 128px)
│   ├── background\
│   │   └── background.js              # Event-driven service worker for badge updates and caching
│   ├── content\
│   │   ├── content.js                 # Content script orchestrating DOM scanning & highlighting
│   │   ├── heuristics.js              # 6 deterministic DOM-based heuristic detection rules
│   │   ├── ml_classifier.js           # Zero-dependency, in-browser TF-IDF + Linear SVM engine
│   │   ├── model_weights.js           # Exported vocabulary, IDF weights & linear SVM coefficients
│   │   └── content.css                # Non-destructive element outline styles & floating badges
│   └── popup\
│       ├── popup.html                 # Accessible popup interface in dark cybersecurity aesthetic
│       ├── popup.css                  # Responsive styles, category chips, and severity badges
│       └── popup.js                   # Popup controller for real-time messaging and element inspection
│
├── ml_pipeline\                       # Python Machine Learning Lab (Scikit-Learn)
│   ├── data\
│   │   ├── dataset.csv                # Curated benchmark dataset (140 labeled text samples)
│   │   └── test_split.csv             # Held-out 20% test partition for reproducible evaluation
│   ├── train_model.py                 # TF-IDF + Linear SVM training with stratified split
│   ├── evaluate.py                    # Confusion matrix, classification report & feature explainability
│   ├── export_model.py                # Serializes model weights to JSON & browser JS format
│   └── local_server.py                # Standalone Python REST API (optional for dual-demonstration)
│
├── test_pages\                        # Controlled Test Bench for Manager Live Demo
│   ├── test_suite.html                # Central launcher and demonstration harness
│   ├── positive_cases.html            # Controlled page exhibiting all 6 dark pattern categories
│   ├── negative_cases.html            # Clean ethical page (0 false positives control)
│   ├── test_rules.js                  # Automated unit test suite for heuristic rules (17 tests)
│   ├── test_ml_inference.js           # Automated test suite for in-browser JS ML inference
│   └── test_integration.js            # End-to-end integration test scorecard
│
├── docs\                              # Documentation & Viva Preparation
│   ├── ARCHITECTURE.md                # System architecture, data flow & security specifications
│   ├── VIVA_QUESTIONS.md              # 25+ Viva / Manager interview questions & in-depth answers
│   └── DEMO_GUIDE.md                  # Step-by-step manager live demonstration script
└── README.md                          # Repository documentation and guide
```

---

## 4. Setup & Installation

### Step 1: Load the Chrome Extension
1. Open Google Chrome and visit `chrome://extensions/`.
2. Enable **Developer mode** via the top-right toggle.
3. Click **Load unpacked** and select the folder:
   ```
   c:\mini project\extension
   ```
4. The **Dark Pattern Detector** icon will appear in your Chrome toolbar.

### Step 2: Open the Demonstration Bench
Open `test_pages/test_suite.html` in Chrome:
```
file:///c:/mini%20project/test_pages/test_suite.html
```
- Click **Open Positive Test Page**: The extension badge will immediately illuminate with the detected pattern count (e.g. `10`). Click the extension icon to inspect elements.
- Click **Open Ethical Control Page**: The extension will display a green checkmark (`✓`) with **0 false positives**.

---

## 5. Machine Learning Evaluation

Run the ML evaluation pipeline in your terminal:
```powershell
python ml_pipeline/evaluate.py
```

### Metrics Summary:
- **Accuracy:** `92.86%`
- **Macro Average F1-Score:** `0.927`
- **Weighted Average F1-Score:** `0.927`

### Confusion Matrix:
```
True / Pred             confir  false_  forced  hidden  legiti  presel  scarci
------------------------------------------------------------------------------
confirmshaming               4       0       0       0       0       0       0
false_urgency                0       4       0       0       0       0       0
forced_continuity            0       0       3       0       0       1       0
hidden_costs                 0       0       0       4       0       0       0
legitimate                   0       1       0       0       3       0       0
preselected_options          0       0       0       0       0       4       0
scarcity_claims              0       0       0       0       0       0       4
```

### Feature Explainability (Top SVM Weights):
- **Confirmshaming:** `'i'` (+1.26), `', i'` (+1.08), `'no'` (+0.91), `'i dont'` (+0.76)
- **False Urgency:** `'!'` (+1.04), `'minutes'` (+0.94), `'time'` (+0.67), `'deal'` (+0.59)
- **Forced Continuity:** `'automatically'` (+1.10), `'subscription'` (+0.77), `'recurring'` (+0.65)
- **Hidden Costs:** `'surcharge'` (+0.93), `'of $'` (+0.87), `'$'` (+0.76), `'mandatory'` (+0.68)
- **Preselected Options:** `'default'` (+1.21), `'checked'` (+0.84), `'for $'` (+0.67)
- **Scarcity Claims:** `'left'` (+0.80), `'this'` (+0.75), `'only'` (+0.65), `'remaining'` (+0.60)

---

## 6. Automated Test Suites

Run the complete test suite from PowerShell:

```powershell
# 1. Heuristic Rule Unit Tests (17/17 passed)
node test_pages/test_rules.js

# 2. Local In-Browser ML Engine Tests (7/7 passed)
node test_pages/test_ml_inference.js

# 3. Full Integration Scorecard (100% coverage on positive, 0 on negative)
node test_pages/test_integration.js
```

---

## 7. Security & Privacy Guarantees

1. **Manifest V3 Compliant:** Uses strictly scoped permissions (`activeTab`, `storage`).
2. **Zero Sensitive Data Access:** Form fields with `type="password"`, `autocomplete="cc-number"`, and billing inputs are filtered out before DOM analysis.
3. **No Network Leakage:** Zero HTTP requests are made during inference. All computation occurs locally.
4. **Non-Destructive Guarantee:** Injected styling uses CSS `outline` and dismissible badges, ensuring page layouts and purchase buttons are never altered.
