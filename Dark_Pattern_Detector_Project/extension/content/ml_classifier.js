/**
 * In-Browser Machine Learning Inference Engine (TF-IDF + Linear SVM)
 * 
 * Runs 100% locally inside the Chrome Extension content script with zero network calls.
 * Implements:
 * - Sublinear TF-IDF vectorization (unigrams + bigrams)
 * - L2-normalization
 * - Linear SVM dot product scoring with class intercepts
 * - Softmax calibrated confidence estimation
 * - Token attribution / explainability (identifying top driving words)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DarkPatternML = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  /**
   * Normalizes raw text into clean tokens and n-grams matching scikit-learn's preprocessor.
   */
  function tokenize(text, ngramRange = [1, 2]) {
    if (!text || typeof text !== 'string') return [];
    
    // Lowercase and strip control characters
    const clean = text.toLowerCase().replace(/[\r\n\t]+/g, ' ');
    
    // Match word tokens and punctuation symbols like '$', '%', '!', etc.
    const tokenRegex = /\b\w+\b|[^\w\s]/g;
    const matches = clean.match(tokenRegex) || [];
    
    const ngrams = [];
    const minN = ngramRange[0];
    const maxN = ngramRange[1];
    
    // Unigrams
    if (minN <= 1 && maxN >= 1) {
      for (let i = 0; i < matches.length; i++) {
        ngrams.push(matches[i]);
      }
    }
    
    // Bigrams
    if (minN <= 2 && maxN >= 2) {
      for (let i = 0; i < matches.length - 1; i++) {
        ngrams.push(`${matches[i]} ${matches[i + 1]}`);
      }
    }
    
    return ngrams;
  }

  /**
   * Evaluates text using the exported model weights.
   * @param {string} text - Webpage text snippet
   * @param {Object} modelData - Exported weights dictionary (from model_weights.js)
   * @returns {Object} Prediction details { label, confidence, scores, explainability }
   */
  function predict(text, modelData) {
    if (!modelData || !modelData.vocabulary) {
      return { label: 'legitimate', confidence: 1.0, isDarkPattern: false, error: 'Model data not loaded' };
    }

    const ngrams = tokenize(text, modelData.ngram_range || [1, 2]);
    if (ngrams.length === 0) {
      return { label: 'legitimate', confidence: 1.0, isDarkPattern: false };
    }

    // 1. Calculate Term Frequencies (TF)
    const counts = new Map();
    for (const token of ngrams) {
      if (token in modelData.vocabulary) {
        counts.set(token, (counts.get(token) || 0) + 1);
      }
    }

    if (counts.size === 0) {
      // Out of vocabulary
      return { label: 'legitimate', confidence: 0.5, isDarkPattern: false, note: 'Out of vocabulary' };
    }

    // 2. Vectorize with sublinear TF and IDF: v_i = (1 + ln(tf)) * idf
    const sparseVec = new Map();
    let normSq = 0;

    for (const [token, tf] of counts.entries()) {
      const idx = modelData.vocabulary[token];
      const idf = modelData.idf[idx];
      const weight = (1 + Math.log(tf)) * idf;
      sparseVec.set(idx, { weight, token });
      normSq += weight * weight;
    }

    // 3. L2 Unit Normalization
    const norm = Math.sqrt(normSq) || 1.0;
    const unitVec = new Map();
    for (const [idx, data] of sparseVec.entries()) {
      unitVec.set(idx, { weight: data.weight / norm, token: data.token });
    }

    // 4. Compute decision function for each class: score = dot(unitVec, coef_c) + intercept_c
    const classes = modelData.classes;
    const scores = {};
    const attributions = {};

    let maxScore = -Infinity;
    let predictedClass = 'legitimate';

    for (let c = 0; c < classes.length; c++) {
      const className = classes[c];
      const coefRow = modelData.coef[c];
      let score = modelData.intercept[c];
      const classTokens = [];

      for (const [idx, data] of unitVec.entries()) {
        const coef = coefRow[idx];
        const contribution = data.weight * coef;
        score += contribution;
        if (contribution > 0.05) {
          classTokens.push({ token: data.token, contribution });
        }
      }

      scores[className] = score;
      // Sort contributing tokens descending
      classTokens.sort((a, b) => b.contribution - a.contribution);
      attributions[className] = classTokens.slice(0, 4);

      if (score > maxScore) {
        maxScore = score;
        predictedClass = className;
      }
    }

    // 5. Softmax Calibration for relative confidence
    const expScores = {};
    let sumExp = 0;
    for (const cls of classes) {
      // Numerical stability shift by maxScore
      const exp = Math.exp(scores[cls] - maxScore);
      expScores[cls] = exp;
      sumExp += exp;
    }

    const probabilities = {};
    for (const cls of classes) {
      probabilities[cls] = sumExp > 0 ? (expScores[cls] / sumExp) : 0;
    }

    const confidence = probabilities[predictedClass] || 0.5;
    const isDarkPattern = predictedClass !== 'legitimate' && confidence >= 0.38;

    return {
      label: predictedClass,
      confidence: parseFloat(confidence.toFixed(3)),
      isDarkPattern,
      scores,
      probabilities,
      topFeatures: attributions[predictedClass] || []
    };
  }

  /**
   * Scans a list of text nodes across the DOM using the ML model.
   * Filters out trivial/short text and joins findings.
   */
  function scanTextNodes(doc, modelData) {
    if (!doc || !modelData) return [];

    const candidates = doc.querySelectorAll('p, span, div, h2, h3, h4, small, b, strong, button, a');
    const findings = [];
    let mlIdx = 0;

    candidates.forEach(el => {
      // Scan compact leaf nodes with meaningful character counts
      if (el.children.length > 2) return;
      const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
      if (text.length < 15 || text.length > 200) return;

      const result = predict(text, modelData);
      if (result.isDarkPattern) {
        // Map ML class label to human-readable category
        const categoryMap = {
          'false_urgency': 'False Urgency',
          'scarcity_claims': 'Scarcity Claims',
          'confirmshaming': 'Confirmshaming',
          'forced_continuity': 'Forced Continuity',
          'hidden_costs': 'Hidden Costs',
          'preselected_options': 'Preselected Options'
        };

        const topWords = result.topFeatures.map(f => `'${f.token}'`).join(', ');

        findings.push({
          id: `ml-finding-${++mlIdx}`,
          category: categoryMap[result.label] || result.label,
          patternName: `ML Detected: ${categoryMap[result.label] || result.label}`,
          explanation: `Statistical NLP classifier flagged this text with ${(result.confidence * 100).toFixed(1)}% model confidence. Key indicative tokens: ${topWords || 'contextual phrasing'}.`,
          evidence: `Text snippet: "${text}"`,
          detectionMethod: 'ml',
          severity: result.confidence >= 0.70 ? 'high' : 'medium',
          confidence: result.confidence,
          limitation: 'Machine learning predictions are probabilistic and may reflect stylistic marketing copy rather than intentional deception.',
          element: el,
          selector: el.id ? `#${el.id}` : (el.className ? `.${el.className.split(/\s+/)[0]}` : el.tagName.toLowerCase())
        });
      }
    });

    return findings;
  }

  return {
    tokenize,
    predict,
    scanTextNodes
  };
}));
