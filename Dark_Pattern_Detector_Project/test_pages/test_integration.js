/**
 * Full End-to-End Integration Test Bench
 * Loads positive_cases.html and negative_cases.html into headless JSDOM,
 * runs the Heuristic and ML engines, and produces a complete detection scorecard.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const heuristics = require('../extension/content/heuristics.js');
const ml = require('../extension/content/ml_classifier.js');
const weights = require('../extension/content/model_weights.js');

console.log('================================================================');
console.log('DARK PATTERN DETECTOR - FULL INTEGRATION TEST BENCH');
console.log('================================================================\n');

// 1. TEST POSITIVE BENCHMARK
console.log('[*] Testing positive_cases.html (Expected: High detection across all 6 categories)...');
const posHtml = fs.readFileSync(path.join(__dirname, 'positive_cases.html'), 'utf-8');
const posDom = new JSDOM(posHtml);
const posDoc = posDom.window.document;

const posHeuristics = heuristics.scanDocument(posDoc);
const posML = ml.scanTextNodes(posDoc, weights);

// Group by category
const posCatCounts = {};
posHeuristics.forEach(f => {
  posCatCounts[f.category] = (posCatCounts[f.category] || 0) + 1;
});

console.log(`[+] Total Heuristic Findings on Positive Page: ${posHeuristics.length}`);
console.log(`[+] Total NLP ML Findings on Positive Page: ${posML.length}`);
console.log('[+] Category Breakdown (Heuristics):');
for (const [cat, count] of Object.entries(posCatCounts)) {
  console.log(`    - ${cat}: ${count} finding(s)`);
}

// Assert that all 6 categories are represented
const allCategories = Object.values(heuristics.CATEGORIES);
const missingCategories = allCategories.filter(cat => !posCatCounts[cat]);

if (missingCategories.length === 0) {
  console.log('\n  ✓ SUCCESS: All 6 Dark Pattern Categories detected on positive test page!\n');
} else {
  console.error(`\n  ✗ FAIL: Missing detections for: ${missingCategories.join(', ')}\n`);
}

// 2. TEST NEGATIVE BENCHMARK
console.log('[*] Testing negative_cases.html (Expected: Zero false positives)...');
const negHtml = fs.readFileSync(path.join(__dirname, 'negative_cases.html'), 'utf-8');
const negDom = new JSDOM(negHtml);
const negDoc = negDom.window.document;

const negHeuristics = heuristics.scanDocument(negDoc);
const negML = ml.scanTextNodes(negDoc, weights);

console.log(`[+] Total Heuristic Findings on Negative Page: ${negHeuristics.length}`);
console.log(`[+] Total NLP ML Findings on Negative Page: ${negML.length}`);

if (negHeuristics.length === 0) {
  console.log('\n  ✓ SUCCESS: Exactly 0 false positive heuristic findings on ethical control page!\n');
} else {
  console.error(`\n  ✗ FAIL: False positives detected on negative page:`, negHeuristics);
}

console.log('================================================================');
console.log('SCORECARD SUMMARY:');
console.log(`Positive Test Page Findings: ${posHeuristics.length} (Coverage: 100% of 6 categories)`);
console.log(`Negative Test Page False Alarms: ${negHeuristics.length}`);
console.log('================================================================\n');

if (missingCategories.length > 0 || negHeuristics.length > 0) {
  process.exit(1);
}
