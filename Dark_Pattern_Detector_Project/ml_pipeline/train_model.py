"""
Machine Learning Training Pipeline for Dark Pattern Detection
Algorithm: TF-IDF Vectorizer (Unigrams + Bigrams) + Linear Support Vector Machine (LinearSVC)

Features:
- Stratified Train/Test Split (prevents class imbalance leakage)
- Explainable Linear Weights (direct feature importance attribution)
- Dual serialization: Joblib (Python artifact) and JSON export ready
"""

import os
import re
import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix

def clean_text(text: str) -> str:
    """Preprocesses and normalizes text for NLP feature extraction."""
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[\r\n\t]+', ' ', text)
    text = re.sub(r'[^\w\s$%.,!-]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def train():
    data_path = os.path.join(os.path.dirname(__file__), "data", "dataset.csv")
    print(f"[*] Loading benchmark dataset from: {data_path}")
    df = pd.read_csv(data_path)
    
    print(f"[+] Dataset shape: {df.shape}")
    print("[+] Class distribution:")
    print(df['label'].value_counts())
    
    # Preprocessing
    df['clean_text'] = df['text'].apply(clean_text)
    
    # Stratified Split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        df['clean_text'],
        df['label'],
        test_size=0.20,
        random_state=42,
        stratify=df['label']
    )
    
    print(f"\n[*] Training samples: {len(X_train)}, Testing samples: {len(X_test)}")
    
    # ML Pipeline: Sublinear TF scaling with unigrams & bigrams, followed by LinearSVC
    pipeline = Pipeline([
        ('tfidf', TfidfVectorizer(
            ngram_range=(1, 2),
            sublinear_tf=True,
            min_df=1,
            token_pattern=r'(?u)\b\w+\b|[^\w\s]'
        )),
        ('clf', LinearSVC(C=1.0, random_state=42, max_iter=2000))
    ])
    
    print("[*] Training TF-IDF + LinearSVC model...")
    pipeline.fit(X_train, y_train)
    
    # Evaluation on held-out test set
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"\n[+] Test Set Accuracy: {acc * 100:.2f}%\n")
    print("Classification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))
    
    # Save the pipeline
    output_model_path = os.path.join(os.path.dirname(__file__), "model.joblib")
    joblib.dump(pipeline, output_model_path)
    print(f"[+] Model pipeline saved to: {output_model_path}")
    
    # Save test partition for standalone evaluation script
    test_data_path = os.path.join(os.path.dirname(__file__), "data", "test_split.csv")
    test_df = pd.DataFrame({'text': X_test, 'label': y_test})
    test_df.to_csv(test_data_path, index=False)
    print(f"[+] Test partition saved to: {test_data_path}")

if __name__ == "__main__":
    train()
