/**
 * Dark Pattern Detector - Deterministic Heuristic Engine
 * 
 * Implements 6 specialized DOM-based detection rules:
 * 1. False Urgency
 * 2. Scarcity Claims
 * 3. Confirmshaming
 * 4. Forced Continuity
 * 5. Hidden Costs
 * 6. Preselected Options
 * 
 * Every finding includes:
 * - category, patternName, explanation, evidence, detectionMethod, severity, confidence, limitation, and DOM target element.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // CommonJS / Node.js test environment
    module.exports = factory();
  } else {
    // Browser global
    root.DarkPatternHeuristics = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  // Category constants
  const CATEGORIES = {
    URGENCY: 'False Urgency',
    SCARCITY: 'Scarcity Claims',
    CONFIRMSHAMING: 'Confirmshaming',
    FORCED_CONTINUITY: 'Forced Continuity',
    HIDDEN_COSTS: 'Hidden Costs',
    PRESELECTED: 'Preselected Options'
  };

  /**
   * Helper: Extracts clean, normalized visible text from a DOM element.
   * Strips multiple whitespaces and ignores hidden elements.
   */
  function getCleanText(el) {
    if (!el) return '';
    return (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Helper: Checks if any child elements also match the text condition,
   * to ensure we only flag the deepest/most specific element rather than its parent container.
   */
  function hasMatchingDescendant(el, regex) {
    if (!el || !el.children || el.children.length === 0) return false;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i];
      const childText = getCleanText(child);
      if (regex.test(childText)) return true;
      if (hasMatchingDescendant(child, regex)) return true;
    }
    return false;
  }

  /**
   * Helper: Checks if an element is visible in the viewport or styled visibly.
   */
  function isVisible(el) {
    if (!el || typeof window === 'undefined') return true;
    try {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' &&
             style.visibility !== 'hidden' &&
             style.opacity !== '0' &&
             el.offsetWidth > 0 &&
             el.offsetHeight > 0;
    } catch (e) {
      return true; // Fallback for headless testing
    }
  }

  /**
   * Helper: Generates a unique, valid CSS selector or fallback ID for an element.
   */
  function getElementSelector(el, index = 0) {
    if (!el) return `unknown-element-${index}`;
    const safeEscape = (str) => {
      if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(str);
      }
      return String(str).replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1');
    };
    if (el.id) return `#${safeEscape(el.id)}`;
    
    let path = [];
    let current = el;
    while (current && current.nodeType === 1 && path.length < 4) {
      let tag = current.tagName.toLowerCase();
      if (current.className && typeof current.className === 'string') {
        const firstClass = current.className.trim().split(/\s+/)[0];
        if (firstClass && !firstClass.includes(':')) {
          tag += `.${firstClass}`;
        }
      }
      path.unshift(tag);
      current = current.parentElement;
    }
    return path.join(' > ') || `element-${index}`;
  }

  // =========================================================================
  // RULE 1: FALSE URGENCY
  // Detects dynamic countdown timers, artificial clock faces, and high-pressure deadline text.
  // =========================================================================
  function detectFalseUrgency(doc) {
    const findings = [];
    let findingIdx = 0;

    // Pattern 1.1: DOM Timer elements (<time>, class names with timer/countdown, or clock digits like 00:15:30)
    const timerSelectors = [
      '[class*="countdown"]',
      '[class*="timer"]',
      '[id*="countdown"]',
      '[id*="timer"]',
      'time',
      '[data-timer]',
      '[data-countdown]'
    ];

    const timerCandidates = doc.querySelectorAll(timerSelectors.join(','));
    timerCandidates.forEach(el => {
      if (!isVisible(el)) return;
      const text = getCleanText(el);
      
      // Look for ticking clock formats: MM:SS, HH:MM:SS, or "XXm YYs"
      const clockRegex = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b|\b\d{1,2}\s*(?:hours?|hrs?|mins?|minutes?|secs?|seconds?)\b/i;
      if (clockRegex.test(text) && text.length < 80) {
        findings.push({
          id: `urgency-timer-${++findingIdx}`,
          category: CATEGORIES.URGENCY,
          patternName: 'Potential Artificial Urgency Timer',
          explanation: 'The webpage features a prominent countdown timer. E-commerce sites frequently use reset-on-refresh timers to induce FOMO (fear of missing out) and rush purchasing decisions.',
          evidence: `Timer text: "${text.substring(0, 100)}" in <${el.tagName.toLowerCase()}>`,
          detectionMethod: 'heuristic',
          severity: 'medium',
          confidence: 0.85,
          limitation: 'May represent a genuine limited-time flash promotion, reservation window (e.g. event tickets), or order cutoff time.',
          element: el,
          selector: getElementSelector(el, findingIdx)
        });
      }
    });

    // Pattern 1.2: Urgency copy regex (e.g., "Offer expires in", "Act fast", "Hurry! Sale ends soon")
    const urgencyTextRegex = /\b(hurry[!\s]|act now|deal ends in|offer expires|limited time only|before it'?s gone|last chance to buy|selling out fast)\b/i;
    const textNodes = doc.querySelectorAll('p, span, div, h1, h2, h3, h4, b, strong, em');
    
    textNodes.forEach(el => {
      // Check leaf or near-leaf elements only to avoid parent duplication
      if (el.children.length > 2 || !isVisible(el)) return;
      const text = getCleanText(el);
      if (text.length > 10 && text.length < 140 && urgencyTextRegex.test(text)) {
        // Avoid duplicate if already covered by timer rule
        const alreadyFlagged = findings.some(f => f.element === el || f.element?.contains(el));
        if (!alreadyFlagged) {
          findings.push({
            id: `urgency-text-${++findingIdx}`,
            category: CATEGORIES.URGENCY,
            patternName: 'High-Pressure Urgency Phrasing',
            explanation: 'Uses aggressive deadline language urging instant action before prices rise or deals disappear.',
            evidence: `Found text: "${text}"`,
            detectionMethod: 'heuristic',
            severity: 'medium',
            confidence: 0.78,
            limitation: 'Some marketing promotions genuinely end on specified dates.',
            element: el,
            selector: getElementSelector(el, findingIdx)
          });
        }
      }
    });

    return findings;
  }

  // =========================================================================
  // RULE 2: SCARCITY CLAIMS
  // Detects artificial low-stock notices, social proof tickers ("12 people viewing").
  // =========================================================================
  function detectScarcityClaims(doc) {
    const findings = [];
    let findingIdx = 0;

    // Pattern 2.1: Low-stock claims ("Only 2 left in stock", "Almost sold out", "Only 3 items remaining")
    const stockRegex = /\b(only\s+\d+\s+(?:left|remaining|items? left)|almost sold out|low stock|few items left|in high demand)\b/i;

    // Pattern 2.2: Viewer count tickers ("14 people viewing right now", "32 people booked this today")
    const viewerRegex = /\b(\d+\s+people\s+(?:are\s+)?(?:viewing|looking|bought|purchased|have this in their cart))\b/i;

    const candidates = doc.querySelectorAll('p, span, div, badge, [class*="stock"], [class*="inventory"], [class*="alert"]');
    candidates.forEach(el => {
      if (!isVisible(el)) return;
      const text = getCleanText(el);
      if (text.length === 0 || text.length > 140) return;

      if (stockRegex.test(text)) {
        if (hasMatchingDescendant(el, stockRegex)) return;
        findings.push({
          id: `scarcity-stock-${++findingIdx}`,
          category: CATEGORIES.SCARCITY,
          patternName: 'Low-Stock Scarcity Warning',
          explanation: 'Alerts the user to minimal remaining stock. Research reveals many e-commerce sites display synthetic or randomized stock counters to induce anxiety.',
          evidence: `Scarcity claim: "${text}"`,
          detectionMethod: 'heuristic',
          severity: 'medium',
          confidence: 0.82,
          limitation: 'Inventory really might be low for artisanal, clearance, or limited-run items.',
          element: el,
          selector: getElementSelector(el, findingIdx)
        });
      } else if (viewerRegex.test(text)) {
        if (hasMatchingDescendant(el, viewerRegex)) return;
        findings.push({
          id: `scarcity-viewer-${++findingIdx}`,
          category: CATEGORIES.SCARCITY,
          patternName: 'High-Demand / Activity Social Proof Ticker',
          explanation: 'Displays real-time visitor or booking metrics. These are frequently fabricated or randomized client-side without verified server inventory backing.',
          evidence: `Activity claim: "${text}"`,
          detectionMethod: 'heuristic',
          severity: 'high',
          confidence: 0.88,
          limitation: 'Some large travel/flight aggregation portals stream actual real-time concurrency metrics.',
          element: el,
          selector: getElementSelector(el, findingIdx)
        });
      }
    });

    return findings;
  }

  // =========================================================================
  // RULE 3: CONFIRMSHAMING
  // Detects emotional manipulation or guilt-tripping in opt-out buttons and links.
  // =========================================================================
  function detectConfirmshaming(doc) {
    const findings = [];
    let findingIdx = 0;

    // Reject buttons often use derogatory, self-deprecating phrasing
    const shamePhrases = [
      /no thanks?,?\s+i (?:hate|don'?t like|don'?t want) (?:saving|discounts?|money|free)/i,
      /no,?\s+i (?:prefer|like) (?:paying|to pay) full price/i,
      /no thanks?,?\s+i (?:already have enough|don'?t care about)/i,
      /i'?ll pass on (?:saving|the deal|discounts?)/i,
      /no,?\s+i don'?t want (?:to look good|to save|rewards?|free gifts?)/i,
      /no thanks?,?\s+i don'?t need (?:help|guidance|protection)/i
    ];

    // Buttons, anchors, and clickable spans/divs
    const actionElements = doc.querySelectorAll('button, a, [role="button"], input[type="button"], [class*="reject"], [class*="dismiss"], [class*="optout"]');
    actionElements.forEach(el => {
      if (!isVisible(el)) return;
      const text = getCleanText(el);
      if (text.length < 4 || text.length > 120) return;

      for (const phrase of shamePhrases) {
        if (phrase.test(text)) {
          findings.push({
            id: `confirmshaming-${++findingIdx}`,
            category: CATEGORIES.CONFIRMSHAMING,
            patternName: 'Confirmshaming Opt-Out Button',
            explanation: 'The rejection or dismiss button is deliberately phrased to shame or insult the customer for declining an upsell, subscription, or newsletter.',
            evidence: `Manipulative button text: "${text}"`,
            detectionMethod: 'heuristic',
            severity: 'high',
            confidence: 0.94,
            limitation: 'Occasionally used as playful brand voice, though still recognized as a manipulative conversion pattern.',
            element: el,
            selector: getElementSelector(el, findingIdx)
          });
          break;
        }
      }
    });

    return findings;
  }

  // =========================================================================
  // RULE 4: FORCED CONTINUITY
  // Detects recurring subscription traps, stealth auto-renewal, and obscure billing terms.
  // =========================================================================
  function detectForcedContinuity(doc) {
    const findings = [];
    let findingIdx = 0;

    // Recurring indicators
    const recurringRegex = /\b(renews? automatically|auto[- ]renew(?:al|s|ing)?|recurring (?:billing|charge|payment)|billed (?:monthly|annually|every\s+\d+\s+months?)|after trial,?\s+(?:you will be charged|\$\d+))\b/i;

    // Check footer notes, tiny checkout text, small tags, terms notes
    const clauses = doc.querySelectorAll('small, [class*="subtext"], [class*="terms"], [class*="disclaimer"], p, span, div');
    clauses.forEach(el => {
      if (!isVisible(el)) return;
      const text = getCleanText(el);
      if (text.length < 15 || text.length > 250) return;

      if (recurringRegex.test(text)) {
        if (hasMatchingDescendant(el, recurringRegex)) return;
        // Check if there is clear mention of "cancel anytime" or if cancellation terms are absent
        const mentionsCancel = /\b(cancel anytime|easy cancellation|cancel at any moment)\b/i.test(text);

        findings.push({
          id: `forced-continuity-${++findingIdx}`,
          category: CATEGORIES.FORCED_CONTINUITY,
          patternName: mentionsCancel ? 'Automatic Subscription Renewal' : 'Obscure Auto-Renewal Clause',
          explanation: mentionsCancel
            ? 'This purchase commits to automatic recurring billing. Ensure the cancellation mechanism is accessible.'
            : 'Undisclosed or fine-print auto-renewal. Recurring charges may be deducted silently without explicit upfront prominence.',
          evidence: `Clause: "${text.substring(0, 140)}..."`,
          detectionMethod: 'heuristic',
          severity: mentionsCancel ? 'low' : 'high',
          confidence: 0.86,
          limitation: 'Standard for legitimate SaaS subscriptions; problematic primarily when cancellation methods are hidden or difficult.',
          element: el,
          selector: getElementSelector(el, findingIdx)
        });
      }
    });

    return findings;
  }

  // =========================================================================
  // RULE 5: HIDDEN COSTS
  // Detects unexpected late checkout charges (handling fee, service charge, checkout surcharge).
  // =========================================================================
  function detectHiddenCosts(doc) {
    const findings = [];
    let findingIdx = 0;

    // Target fee labels in pricing tables, cart summaries, and checkout line items
    const feeRegex = /\b(handling fee|service fee|processing fee|convenience fee|booking fee|mandatory gratuity|surcharge|regulatory fee)\b/i;

    const summaryItems = doc.querySelectorAll('[class*="fee"], [class*="charge"], [class*="total"], [class*="summary"], tr, li, dl, div');
    summaryItems.forEach(el => {
      if (el.children.length > 3 || !isVisible(el)) return;
      const text = getCleanText(el);
      if (text.length < 5 || text.length > 150) return;

      const match = text.match(feeRegex);
      if (match) {
        // Look for currency amounts near the fee label
        const priceRegex = /[$€£₹]\s*\d+(?:\.\d{2})?|\d+(?:\.\d{2})?\s*[$€£₹]/;
        const hasPrice = priceRegex.test(text);

        findings.push({
          id: `hidden-cost-${++findingIdx}`,
          category: CATEGORIES.HIDDEN_COSTS,
          patternName: `Additional ${match[0]} Detected`,
          explanation: 'Unexpected fees or administrative surcharges added late to the cart summary that were not visible in the baseline item listing.',
          evidence: `Line item: "${text}"`,
          detectionMethod: 'heuristic',
          severity: hasPrice ? 'high' : 'medium',
          confidence: 0.84,
          limitation: 'Certain regulatory, venue, or delivery surcharges are mandatory by local law or external shipping carriers.',
          element: el,
          selector: getElementSelector(el, findingIdx)
        });
      }
    });

    return findings;
  }

  // =========================================================================
  // RULE 6: PRESELECTED OPTIONS
  // Detects checkboxes or toggles that are checked by default for paid add-ons or marketing.
  // =========================================================================
  function detectPreselectedOptions(doc) {
    const findings = [];
    let findingIdx = 0;

    // Find all checkboxes that are checked by default
    const checkboxes = doc.querySelectorAll('input[type="checkbox"]:checked, [role="checkbox"][aria-checked="true"]');
    checkboxes.forEach(el => {
      if (!isVisible(el)) return;

      // Find associated label or parent container text
      let labelText = '';
      if (el.id) {
        const labelEl = doc.querySelector(`label[for="${el.id}"]`);
        if (labelEl) labelText = getCleanText(labelEl);
      }
      if (!labelText && el.closest('label')) {
        labelText = getCleanText(el.closest('label'));
      }
      if (!labelText && el.parentElement) {
        labelText = getCleanText(el.parentElement);
      }

      // Check if it's an optional add-on, insurance, donation, or newsletter
      const optionalPaidRegex = /\b(insurance|warranty|protection plan|donation|donate|rush handling|express shipping|newsletter|subscribe to offers|marketing updates|promotional emails)\b/i;
      
      // Neutralize required checkboxes like "I agree to Terms & Conditions"
      const isTerms = /\b(terms (?:and|&) conditions|terms of service|privacy policy)\b/i.test(labelText);

      if (labelText && !isTerms) {
        const isPaidExtra = optionalPaidRegex.test(labelText);
        findings.push({
          id: `preselected-option-${++findingIdx}`,
          category: CATEGORIES.PRESELECTED,
          patternName: isPaidExtra ? 'Preselected Optional Add-On / Fee' : 'Preselected Form Choice',
          explanation: 'The webpage has pre-checked an optional choice (such as extended warranty, donation, or promotional emails) requiring the user to actively uncheck it.',
          evidence: `Pre-checked input with label: "${labelText.substring(0, 100)}"`,
          detectionMethod: 'heuristic',
          severity: isPaidExtra ? 'high' : 'medium',
          confidence: 0.92,
          limitation: 'Some users may prefer default opt-ins for recurring convenience if clearly communicated.',
          element: el,
          selector: getElementSelector(el, findingIdx)
        });
      }
    });

    return findings;
  }

  // =========================================================================
  // MASTER SCAN COORDINATOR
  // Runs all 6 heuristic rules and deduplicates results.
  // =========================================================================
  function scanDocument(doc = (typeof document !== 'undefined' ? document : null)) {
    if (!doc) return [];

    const allFindings = [
      ...detectFalseUrgency(doc),
      ...detectScarcityClaims(doc),
      ...detectConfirmshaming(doc),
      ...detectForcedContinuity(doc),
      ...detectHiddenCosts(doc),
      ...detectPreselectedOptions(doc)
    ];

    // Deduplicate findings that share identical evidence and category
    const seen = new Set();
    const uniqueFindings = [];

    for (const finding of allFindings) {
      const key = `${finding.category}::${finding.evidence.trim()}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueFindings.push(finding);
      }
    }

    return uniqueFindings;
  }

  return {
    CATEGORIES,
    scanDocument,
    detectFalseUrgency,
    detectScarcityClaims,
    detectConfirmshaming,
    detectForcedContinuity,
    detectHiddenCosts,
    detectPreselectedOptions
  };
}));
