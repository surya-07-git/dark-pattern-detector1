/**
 * Verification of Local In-Browser ML Engine (TF-IDF + Linear SVM)
 * Evaluates whether JavaScript inference matches expectations across dark pattern classes.
 */

const weights = require('../extension/content/model_weights.js');
const ml = require('../extension/content/ml_classifier.js');

const testCases = [
  {
    text: "Hurry! Offer expires in 05 minutes and 30 seconds. Act fast!",
    expectedCategory: "false_urgency"
  },
  {
    text: "Only 2 items left in stock. High demand right now!",
    expectedCategory: "scarcity_claims"
  },
  {
    text: "No thanks, I hate saving money and prefer paying full price.",
    expectedCategory: "confirmshaming"
  },
  {
    text: "Renews automatically at $49.99 every month after free trial.",
    expectedCategory: "forced_continuity"
  },
  {
    text: "Mandatory administrative processing fee of $7.50 added at checkout.",
    expectedCategory: "hidden_costs"
  },
  {
    text: "Default selection: Add extended replacement guarantee for $9.99.",
    expectedCategory: "preselected_options"
  },
  {
    text: "Standard cotton t-shirt with 30-day money back guarantee.",
    expectedCategory: "legitimate"
  }
];

console.log('====================================================');
console.log('TESTING IN-BROWSER JAVASCRIPT ML INFERENCE ENGINE');
console.log('====================================================\n');

let pass = 0;
for (const tc of testCases) {
  const result = ml.predict(tc.text, weights);
  const isMatch = result.label === tc.expectedCategory;
  if (isMatch) pass++;

  const status = isMatch ? '✓ PASS' : '✗ FAIL';
  console.log(`${status}: "${tc.text.substring(0, 45)}..."`);
  console.log(`   Predicted: ${result.label} (Confidence: ${(result.confidence * 100).toFixed(1)}%, DarkPattern: ${result.isDarkPattern})`);
  if (result.topFeatures.length > 0) {
    const topStr = result.topFeatures.map(f => `${f.token} (+${f.contribution.toFixed(2)})`).join(', ');
    console.log(`   Explainability tokens: [${topStr}]`);
  }
  console.log('');
}

console.log(`Summary: ${pass} / ${testCases.length} sample predictions matched ground truth.`);
if (pass < testCases.length) {
  process.exit(1);
}
