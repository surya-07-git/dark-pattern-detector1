/**
 * Unit Test Suite for Dark Pattern Heuristic Rules
 * 
 * Verifies that each of the 6 detection rules correctly flags simulated DOM fixtures,
 * and confirms that legitimate UI elements produce zero false positives.
 */

const { JSDOM } = require('jsdom');
const heuristics = require('../extension/content/heuristics.js');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('====================================================');
console.log('RUNNING HEURISTIC RULE TESTS');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1: FALSE URGENCY
// ----------------------------------------------------
console.log('Rule 1: False Urgency');
{
  const dom = new JSDOM(`
    <div>
      <div id="flash-deal" class="deal-countdown">
        <span>Hurry! Offer expires in: </span>
        <span class="timer-digits">00:14:52</span>
      </div>
      <p class="promo-text">Act fast before it's gone!</p>
    </div>
  `);
  const findings = heuristics.detectFalseUrgency(dom.window.document);
  assert(findings.length >= 1, `Detected ${findings.length} urgency pattern(s)`);
  assert(findings.some(f => f.category === heuristics.CATEGORIES.URGENCY), 'Correct category assigned');
  assert(findings[0].severity === 'medium', 'Correct severity level');
}

// ----------------------------------------------------
// TEST 2: SCARCITY CLAIMS
// ----------------------------------------------------
console.log('\nRule 2: Scarcity Claims');
{
  const dom = new JSDOM(`
    <div>
      <span class="stock-badge">Only 2 left in stock!</span>
      <div class="live-activity">14 people viewing right now</div>
    </div>
  `);
  const findings = heuristics.detectScarcityClaims(dom.window.document);
  assert(findings.length === 2, `Detected exactly 2 scarcity patterns (got ${findings.length})`);
  assert(findings.some(f => f.patternName.includes('Low-Stock')), 'Flagged low stock');
  assert(findings.some(f => f.patternName.includes('Social Proof')), 'Flagged activity ticker');
}

// ----------------------------------------------------
// TEST 3: CONFIRMSHAMING
// ----------------------------------------------------
console.log('\nRule 3: Confirmshaming');
{
  const dom = new JSDOM(`
    <div class="modal">
      <h2>Join VIP Club for 20% Off!</h2>
      <button class="accept-btn">Yes, give me 20% off</button>
      <button class="reject-btn">No thanks, I hate saving money</button>
    </div>
  `);
  const findings = heuristics.detectConfirmshaming(dom.window.document);
  assert(findings.length === 1, `Detected confirmshaming button (got ${findings.length})`);
  assert(findings[0].severity === 'high', 'Confirmshaming is marked high severity');
  assert(findings[0].evidence.includes('hate saving money'), 'Evidence contains guilt phrase');
}

// ----------------------------------------------------
// TEST 4: FORCED CONTINUITY
// ----------------------------------------------------
console.log('\nRule 4: Forced Continuity');
{
  const dom = new JSDOM(`
    <div class="pricing-card">
      <h3>Premium Pro - $1.00 Trial</h3>
      <small class="disclaimer">Renews automatically at $49.99/mo after 7 days unless cancelled.</small>
    </div>
  `);
  const findings = heuristics.detectForcedContinuity(dom.window.document);
  assert(findings.length === 1, `Detected forced continuity (got ${findings.length})`);
  assert(findings[0].category === heuristics.CATEGORIES.FORCED_CONTINUITY, 'Category matches');
  assert(findings[0].evidence.includes('Renews automatically'), 'Evidence captured auto-renewal clause');
}

// ----------------------------------------------------
// TEST 5: HIDDEN COSTS
// ----------------------------------------------------
console.log('\nRule 5: Hidden Costs');
{
  const dom = new JSDOM(`
    <div class="cart-summary">
      <div class="item">Subtotal: $40.00</div>
      <div class="fee-row">Mandatory Processing Fee: $4.99</div>
      <div class="fee-row">Convenience Fee: $2.50</div>
      <div class="total">Total: $47.49</div>
    </div>
  `);
  const findings = heuristics.detectHiddenCosts(dom.window.document);
  assert(findings.length === 2, `Detected 2 hidden fee items (got ${findings.length})`);
  assert(findings.every(f => f.category === heuristics.CATEGORIES.HIDDEN_COSTS), 'All categorized as Hidden Costs');
}

// ----------------------------------------------------
// TEST 6: PRESELECTED OPTIONS
// ----------------------------------------------------
console.log('\nRule 6: Preselected Options');
{
  const dom = new JSDOM(`
    <form>
      <label>
        <input type="checkbox" id="warranty" checked /> Add 2-Year Extended Warranty (+$15.00)
      </label>
      <label>
        <input type="checkbox" id="newsletter" checked /> Subscribe to promotional marketing emails
      </label>
      <label>
        <input type="checkbox" id="terms" required /> I accept Terms and Conditions
      </label>
    </form>
  `);
  const findings = heuristics.detectPreselectedOptions(dom.window.document);
  assert(findings.length === 2, `Detected 2 preselected options (got ${findings.length})`);
  assert(!findings.some(f => f.evidence.includes('Terms and Conditions')), 'Legitimate terms checkbox not flagged');
}

// ----------------------------------------------------
// TEST 7: NEGATIVE TEST (CLEAN LEGITIMATE PAGE)
// ----------------------------------------------------
console.log('\nRule 7: Negative Test (Clean Legitimate Page)');
{
  const cleanDom = new JSDOM(`
    <div class="product-page">
      <h1>Classic Cotton T-Shirt</h1>
      <p class="description">Made of 100% organic cotton. Machine washable.</p>
      <div class="price">$25.00</div>
      <button class="buy-now">Add to Cart</button>
      <a href="/cancel-policy">Cancellation & Refund Policy</a>
    </div>
  `);
  const allFindings = heuristics.scanDocument(cleanDom.window.document);
  assert(allFindings.length === 0, `Zero false positives on clean page (got ${allFindings.length})`);
}

console.log('\n====================================================');
console.log(`SUMMARY: ${passedTests} / ${totalTests} tests passed.`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
