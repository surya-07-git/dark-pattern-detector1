/**
 * Dark Pattern Detector - Webpage Content Script
 * 
 * Orchestrates DOM scanning, local ML inference, result aggregation,
 * and non-destructive element highlighting.
 */

(function () {
  // Guard against multi-injection in frames
  if (window.__darkPatternDetectorInjected) return;
  window.__darkPatternDetectorInjected = true;

  // Active scan state
  let currentFindings = [];
  let highlightedElement = null;
  let activeBadge = null;

  /**
   * Filters out elements in sensitive input contexts (passwords, credit cards, CVV).
   * Ensures shopper privacy by design.
   */
  function isSensitiveContext(el) {
    if (!el) return false;
    const sensitiveSelector = 'input[type="password"], [autocomplete*="cc-"], [autocomplete*="password"], [name*="creditCard"], [name*="cvv"]';
    return Boolean(el.matches(sensitiveSelector) || el.closest(sensitiveSelector));
  }

  /**
   * Executes a complete scan of the webpage DOM using both:
   * 1. Deterministic structural heuristics (DarkPatternHeuristics)
   * 2. Local in-browser NLP classifier (DarkPatternML)
   */
  function runFullScan() {
    try {
      // 1. Run DOM Heuristics
      const heuristicFindings = (typeof DarkPatternHeuristics !== 'undefined' && DarkPatternHeuristics.scanDocument)
        ? DarkPatternHeuristics.scanDocument(document)
        : [];

      // 2. Run Local ML Classifier
      const mlFindings = (typeof DarkPatternML !== 'undefined' && typeof DarkPatternModelWeights !== 'undefined')
        ? DarkPatternML.scanTextNodes(document, DarkPatternModelWeights)
        : [];

      // 3. Merge & Deduplicate Findings
      const merged = [];
      const seenSnippets = new Set();

      // Process heuristics first
      for (const h of heuristicFindings) {
        if (isSensitiveContext(h.element)) continue;
        
        // Check if an ML finding reinforces this heuristic
        const matchingML = mlFindings.find(m => {
          return m.category === h.category && 
            (m.element === h.element || h.evidence.includes(m.element.textContent.trim().substring(0, 30)));
        });

        if (matchingML) {
          // Upgrade to Hybrid detection
          h.detectionMethod = 'hybrid';
          h.confidence = Math.min(0.98, Math.max(h.confidence, matchingML.confidence) + 0.05);
          h.explanation += ` [Validated by both structural heuristic and local NLP text classifier].`;
        }

        const snippetKey = (h.evidence || '').toLowerCase().replace(/\s+/g, ' ').substring(0, 60);
        seenSnippets.add(snippetKey);
        merged.push(h);
      }

      // Add remaining independent ML findings
      for (const m of mlFindings) {
        if (isSensitiveContext(m.element)) continue;
        const snippetKey = (m.evidence || '').toLowerCase().replace(/\s+/g, ' ').substring(0, 60);
        if (!seenSnippets.has(snippetKey)) {
          seenSnippets.add(snippetKey);
          merged.push(m);
        }
      }

      // Format summary metrics
      const categoryCounts = {};
      merged.forEach(f => {
        categoryCounts[f.category] = (categoryCounts[f.category] || 0) + 1;
      });

      currentFindings = merged;

      const summary = {
        total: merged.length,
        url: window.location.href,
        hostname: window.location.hostname,
        categories: categoryCounts,
        scannedAt: new Date().toISOString()
      };

      // Notify background service worker to update action badge
      chrome.runtime.sendMessage({
        type: "SCAN_RESULTS_READY",
        findings: merged.map(f => ({
          id: f.id,
          category: f.category,
          patternName: f.patternName,
          explanation: f.explanation,
          evidence: f.evidence,
          detectionMethod: f.detectionMethod,
          severity: f.severity,
          confidence: f.confidence,
          limitation: f.limitation,
          selector: f.selector
        })),
        summary
      }).catch(() => {
        // Service worker may be inactive or waking up
      });

      return { findings: currentFindings, summary };
    } catch (err) {
      console.error("[DarkPatternDetector] Scan error:", err);
      return { findings: [], summary: { total: 0, error: err.message } };
    }
  }

  /**
   * Highlights a specific element on the webpage with a gentle outline and badge.
   * Scrolls smoothly to the element.
   */
  function highlightElement(selector, category, severity = 'medium') {
    clearHighlights();

    let target = null;
    try {
      if (selector) {
        target = document.querySelector(selector);
      }
    } catch (e) {
      // Selector may have characters that failed querySelector
    }

    if (!target) {
      // Fallback: search by ID in current findings
      const match = currentFindings.find(f => f.selector === selector || f.id === selector);
      if (match && match.element) {
        target = match.element;
      }
    }

    if (!target) return false;

    // Apply highlight class
    target.classList.add('dp-element-highlight');
    if (severity === 'high') {
      target.classList.add('dp-element-highlight-high');
    }
    highlightedElement = target;

    // Create floating badge tag
    const badge = document.createElement('div');
    badge.className = `dp-badge-tag ${severity === 'high' ? 'dp-badge-high' : ''}`;
    badge.innerHTML = `
      <svg class="dp-badge-icon" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
      <span>Dark Pattern: ${category || 'Manipulative Element'}</span>
      <button class="dp-badge-close" title="Dismiss highlight">✕</button>
    `;

    // Dismiss button on badge
    badge.querySelector('.dp-badge-close').addEventListener('click', (e) => {
      e.stopPropagation();
      clearHighlights();
    });

    // Mount badge relative to target or body
    const rect = target.getBoundingClientRect();
    if (rect.top < 35) {
      // Position below if element is at the very top of viewport
      badge.style.top = 'auto';
      badge.style.bottom = '-28px';
    }

    target.appendChild(badge);
    activeBadge = badge;

    // Smooth scroll into view
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }

  /**
   * Cleans up all active visual highlights and badges.
   */
  function clearHighlights() {
    if (highlightedElement) {
      highlightedElement.classList.remove('dp-element-highlight', 'dp-element-highlight-high');
      highlightedElement = null;
    }
    if (activeBadge) {
      activeBadge.remove();
      activeBadge = null;
    }
    // Safeguard cleanup of any orphaned badges
    document.querySelectorAll('.dp-badge-tag').forEach(b => b.remove());
    document.querySelectorAll('.dp-element-highlight').forEach(el => {
      el.classList.remove('dp-element-highlight', 'dp-element-highlight-high');
    });
  }

  /**
   * Message listener for communications from the extension popup.
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) {
      sendResponse({ status: "error", error: "Missing message type" });
      return false;
    }

    switch (message.type) {
      case "START_SCAN": {
        const result = runFullScan();
        sendResponse({
          status: "success",
          findings: result.findings.map(f => ({
            id: f.id,
            category: f.category,
            patternName: f.patternName,
            explanation: f.explanation,
            evidence: f.evidence,
            detectionMethod: f.detectionMethod,
            severity: f.severity,
            confidence: f.confidence,
            limitation: f.limitation,
            selector: f.selector
          })),
          summary: result.summary
        });
        break;
      }

      case "GET_FINDINGS": {
        sendResponse({
          status: "success",
          findings: currentFindings.map(f => ({
            id: f.id,
            category: f.category,
            patternName: f.patternName,
            explanation: f.explanation,
            evidence: f.evidence,
            detectionMethod: f.detectionMethod,
            severity: f.severity,
            confidence: f.confidence,
            limitation: f.limitation,
            selector: f.selector
          })),
          url: window.location.href
        });
        break;
      }

      case "HIGHLIGHT_ELEMENT": {
        const ok = highlightElement(message.selector, message.category, message.severity);
        sendResponse({ status: ok ? "highlighted" : "not_found" });
        break;
      }

      case "CLEAR_HIGHLIGHTS": {
        clearHighlights();
        sendResponse({ status: "cleared" });
        break;
      }

      case "DISMISS_FINDING": {
        currentFindings = currentFindings.filter(f => f.id !== message.findingId);
        clearHighlights();
        // Update badge
        chrome.runtime.sendMessage({
          type: "SCAN_RESULTS_READY",
          findings: currentFindings,
          summary: { total: currentFindings.length }
        }).catch(() => {});
        sendResponse({ status: "dismissed", remaining: currentFindings.length });
        break;
      }

      default:
        sendResponse({ status: "ignored" });
        break;
    }

    return false;
  });

  // Automatically execute scan once document is interactive / idle
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runFullScan);
  } else {
    // Small timeout to allow dynamic initial scripts to settle
    setTimeout(runFullScan, 300);
  }
})();
