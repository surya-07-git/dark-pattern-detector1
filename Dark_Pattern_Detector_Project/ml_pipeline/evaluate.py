"""
Model Evaluation and Explainability Module
Loads the saved pipeline, calculates the Confusion Matrix, Macro/Weighted F1,
and extracts top explainability features (highest SVM weights per class).
"""

import os
import joblib
import pandas as pd
import numpy as np
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

def explain_features(vectorizer, clf, n_top=5):
    """Prints the top indicative words/bigrams for each dark pattern class."""
    feature_names = np.array(vectorizer.get_feature_names_out())
    classes = clf.classes_
    
    print("\n" + "=" * 60)
    print("EXPLAINABILITY: TOP INDICATIVE FEATURES PER CLASS")
    print("=" * 60)
    
    for i, class_name in enumerate(classes):
        top_indices = np.argsort(clf.coef_[i])[-n_top:][::-1]
        top_features = feature_names[top_indices]
        top_weights = clf.coef_[i][top_indices]
        feature_str = ", ".join([f"'{f}' ({w:.2f})" for f, w in zip(top_features, top_weights)])
        print(f"\n[{class_name.upper()}]:")
        print(f"  --> {feature_str}")

def evaluate():
    model_path = os.path.join(os.path.dirname(__file__), "model.joblib")
    test_path = os.path.join(os.path.dirname(__file__), "data", "test_split.csv")
    
    if not os.path.exists(model_path) or not os.path.exists(test_path):
        print("[-] Model or test partition missing. Run train_model.py first.")
        return
        
    pipeline = joblib.load(model_path)
    test_df = pd.read_csv(test_path)
    
    X_test = test_df['text']
    y_test = test_df['label']
    
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    
    print("=" * 60)
    print("DARK PATTERN CLASSIFIER - HELD-OUT EVALUATION RESULTS")
    print("=" * 60)
    print(f"Overall Accuracy: {acc * 100:.2f}%\n")
    
    print("Classification Report:")
    print(classification_report(y_test, y_pred, digits=3))
    
    labels = sorted(list(set(y_test)))
    cm = confusion_matrix(y_test, y_pred, labels=labels)
    
    print("\nConfusion Matrix:")
    header = f"{'True / Pred':<22}" + "".join([f"{l[:6]:>8}" for l in labels])
    print(header)
    print("-" * len(header))
    for i, row_label in enumerate(labels):
        row_str = f"{row_label:<22}" + "".join([f"{val:>8}" for val in cm[i]])
        print(row_str)
        
    # Feature Explainability
    explain_features(pipeline.named_steps['tfidf'], pipeline.named_steps['clf'])

if __name__ == "__main__":
    evaluate()
