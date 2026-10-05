/**
 * Dark Pattern Detector - Popup Controller
 * 
 * Manages UI rendering, category filtering, element inspection commands,
 * dismissal workflows, and real-time communication with the webpage content script.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const statusDot = document.getElementById('statusDot');
  const statusLabel = document.getElementById('statusLabel');
  const rescanBtn = document.getElementById('rescanBtn');
  const privacyBtn = document.getElementById('privacyBtn');
  const summaryCard = document.getElementById('summaryCard');
  const totalCountEl = document.getElementById('totalCount');
  const countHighEl = document.getElementById('countHigh');
  const countMedEl = document.getElementById('countMed');
  const countLowEl = document.getElementById('countLow');
  const filterNav = document.getElementById('filterNav');
  const chipAllCount = document.getElementById('chipAllCount');
  const findingsList = document.getElementById('findingsList');
  const emptyState = document.getElementById('emptyState');
  const loadingState = document.getElementById('loadingState');
  const unsupportedState = document.getElementById('unsupportedState');
  const errorState = document.getElementById('errorState');
  const emptyRescanBtn = document.getElementById('emptyRescanBtn');
  const retryBtn = document.getElementById('retryBtn');
  const clearHighlightsBtn = document.getElementById('clearHighlightsBtn');
  const privacyModal = document.getElementById('privacyModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');

  // Application State
  let activeTabId = null;
  let allFindings = [];
  let currentFilter = 'all';

  /**
   * Initializes communication with the active browser tab.
   */
  async function init() {
    showLoading();
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        showError('Unable to identify active browser tab.');
        return;
      }
      activeTabId = tab.id;

      // Check for restricted URLs (chrome://, edge://, about:, webstore)
      const url = tab.url || '';
      if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.includes('chromewebstore')) {
        showUnsupported('Browser security policies prevent extensions from analyzing browser settings or system pages.');
        return;
      }

      // Request fresh scan from content script
      triggerScan();
    } catch (err) {
      showError(err.message || 'Initialization failed.');
    }
  }

  /**
   * Sends START_SCAN message to the content script.
   */
  function triggerScan() {
    showLoading();
    statusDot.className = 'status-dot scanning';
    statusLabel.textContent = 'Scanning...';

    chrome.tabs.sendMessage(activeTabId, { type: 'START_SCAN' }, (response) => {
      // Check for communication error (e.g. content script not yet injected)
      if (chrome.runtime.lastError || !response) {
        // Attempt to check background cache first
        chrome.runtime.sendMessage({ type: 'GET_SCAN_RESULTS', tabId: activeTabId }, (cacheRes) => {
          if (cacheRes && cacheRes.data && cacheRes.data.findings) {
            handleScanResponse(cacheRes.data);
          } else {
            showError('Content script not detected on this page. Please refresh the page and try again.');
          }
        });
        return;
      }

      if (response.status === 'success') {
        handleScanResponse(response);
      } else {
        showError(response.error || 'Scan failed.');
      }
    });
  }

  /**
   * Processes scan results and updates UI.
   */
  function handleScanResponse(data) {
    allFindings = data.findings || [];
    updateSummary();
    renderFindings();

    statusDot.className = allFindings.length > 0 ? 'status-dot issues' : 'status-dot';
    statusLabel.textContent = allFindings.length > 0 
      ? `${allFindings.length} Pattern${allFindings.length > 1 ? 's' : ''} Flagged` 
      : 'Protected (0 Issues)';
  }

  /**
   * Updates summary cards and severity metrics.
   */
  function updateSummary() {
    const total = allFindings.length;
    let high = 0, med = 0, low = 0;

    allFindings.forEach(f => {
      if (f.severity === 'high') high++;
      else if (f.severity === 'low') low++;
      else med++;
    });

    totalCountEl.textContent = total;
    chipAllCount.textContent = total;
    countHighEl.textContent = high;
    countMedEl.textContent = med;
    countLowEl.textContent = low;

    // Show/hide main summary controls based on findings
    summaryCard.style.display = 'flex';
    filterNav.style.display = total > 0 ? 'flex' : 'none';
  }

  /**
   * Renders finding cards filtered by selected category.
   */
  function renderFindings() {
    findingsList.innerHTML = '';
    hideAllStates();

    if (allFindings.length === 0) {
      emptyState.style.display = 'flex';
      return;
    }

    const filtered = currentFilter === 'all'
      ? allFindings
      : allFindings.filter(f => f.category === currentFilter);

    if (filtered.length === 0) {
      findingsList.innerHTML = `
        <div style="text-align: center; padding: 24px 0; color: #94A3B8;">
          No patterns found under "${escapeHtml(currentFilter)}".
        </div>
      `;
      return;
    }

    filtered.forEach(finding => {
      const card = document.createElement('article');
      card.className = 'finding-card';
      card.dataset.id = finding.id;

      const severityClass = `severity-${finding.severity || 'medium'}`;
      const methodClass = `method-${finding.detectionMethod || 'heuristic'}`;
      const confidencePercent = Math.round((finding.confidence || 0.8) * 100);

      card.innerHTML = `
        <div class="card-header">
          <div class="badge-group">
            <span class="chip-category">${escapeHtml(finding.category)}</span>
            <span class="chip-severity ${severityClass}">${escapeHtml(finding.severity || 'medium')}</span>
            <span class="chip-method ${methodClass}" title="Detection technique">${escapeHtml(finding.detectionMethod || 'heuristic')}</span>
          </div>
          <span style="font-size: 10px; color: #64748B;" title="Model confidence">${confidencePercent}%</span>
        </div>
        
        <h3 class="card-title">${escapeHtml(finding.patternName)}</h3>
        <p class="card-desc">${escapeHtml(finding.explanation)}</p>
        
        <div class="card-evidence">
          <code>${escapeHtml(finding.evidence)}</code>
        </div>
        
        <div class="card-limitation">
          <span>${escapeHtml(finding.limitation)}</span>
        </div>
        
        <div class="card-actions">
          <button class="btn-dismiss" data-action="dismiss" data-id="${escapeHtml(finding.id)}">Dismiss</button>
          <button class="btn-inspect" data-action="inspect" data-selector="${escapeHtml(finding.selector || '')}" data-category="${escapeHtml(finding.category)}" data-severity="${escapeHtml(finding.severity || 'medium')}">
            Inspect on Page
          </button>
        </div>
      `;

      findingsList.appendChild(card);
    });

    // Attach card event listeners
    attachCardListeners();
  }

  /**
   * Attaches click handlers for Inspect and Dismiss buttons.
   */
  function attachCardListeners() {
    findingsList.querySelectorAll('[data-action="inspect"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const selector = btn.dataset.selector;
        const category = btn.dataset.category;
        const severity = btn.dataset.severity;

        chrome.tabs.sendMessage(activeTabId, {
          type: 'HIGHLIGHT_ELEMENT',
          selector,
          category,
          severity
        }, (res) => {
          if (res && res.status === 'highlighted') {
            btn.textContent = 'Highlighted ✓';
            setTimeout(() => { btn.textContent = 'Inspect on Page'; }, 2000);
          }
        });
      });
    });

    findingsList.querySelectorAll('[data-action="dismiss"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        chrome.tabs.sendMessage(activeTabId, {
          type: 'DISMISS_FINDING',
          findingId: id
        }, (res) => {
          allFindings = allFindings.filter(f => f.id !== id);
          updateSummary();
          renderFindings();
        });
      });
    });
  }

  /**
   * Filter Tab click handler.
   */
  filterNav.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      filterNav.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.category;
      renderFindings();
    });
  });

  // Action Buttons
  rescanBtn.addEventListener('click', triggerScan);
  emptyRescanBtn.addEventListener('click', triggerScan);
  retryBtn.addEventListener('click', triggerScan);

  clearHighlightsBtn.addEventListener('click', () => {
    chrome.tabs.sendMessage(activeTabId, { type: 'CLEAR_HIGHLIGHTS' });
  });

  // Privacy Modal
  privacyBtn.addEventListener('click', () => {
    privacyModal.style.display = 'flex';
  });

  modalCloseBtn.addEventListener('click', () => {
    privacyModal.style.display = 'none';
  });

  privacyModal.addEventListener('click', (e) => {
    if (e.target === privacyModal) {
      privacyModal.style.display = 'none';
    }
  });

  // State Presentation Helpers
  function hideAllStates() {
    emptyState.style.display = 'none';
    loadingState.style.display = 'none';
    unsupportedState.style.display = 'none';
    errorState.style.display = 'none';
  }

  function showLoading() {
    hideAllStates();
    loadingState.style.display = 'flex';
    findingsList.innerHTML = '';
  }

  function showUnsupported(reason) {
    hideAllStates();
    summaryCard.style.display = 'none';
    filterNav.style.display = 'none';
    findingsList.innerHTML = '';
    document.getElementById('unsupportedReason').textContent = reason;
    unsupportedState.style.display = 'flex';
    statusDot.className = 'status-dot';
    statusLabel.textContent = 'Restricted';
  }

  function showError(msg) {
    hideAllStates();
    summaryCard.style.display = 'none';
    filterNav.style.display = 'none';
    findingsList.innerHTML = '';
    document.getElementById('errorMessage').textContent = msg;
    errorState.style.display = 'flex';
    statusDot.className = 'status-dot';
    statusLabel.textContent = 'Error';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Start initialization
  init();
});
