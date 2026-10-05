"""
Lightweight Local Python Inference Server (Built-in http.server, zero-dependency)
Serves REST API on http://127.0.0.1:5000/predict for Python-based testing and demonstration.
"""

import os
import json
import joblib
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

# Load the trained pipeline
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.joblib")
PIPELINE = None

if os.path.exists(MODEL_PATH):
    PIPELINE = joblib.load(MODEL_PATH)
    print(f"[+] Loaded trained model from {MODEL_PATH}")
else:
    print("[-] model.joblib not found. Run train_model.py first.")

class InferenceHandler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        self._set_headers(200)

    def do_GET(self):
        if self.path == "/health":
            self._set_headers(200)
            self.wfile.write(json.dumps({"status": "healthy", "service": "Dark Pattern ML API"}).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

    def do_POST(self):
        if self.path == "/predict":
            if PIPELINE is None:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": "Model not loaded"}).encode("utf-8"))
                return

            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            
            try:
                data = json.loads(body)
                text = data.get("text", "")
                if not text:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({"error": "Missing 'text' field"}).encode("utf-8"))
                    return

                prediction = PIPELINE.predict([text])[0]
                decision = PIPELINE.decision_function([text])[0]
                classes = PIPELINE.named_steps['clf'].classes_

                scores = {cls: round(float(score), 4) for cls, score in zip(classes, decision)}
                is_dark = (prediction != "legitimate")

                response = {
                    "text": text,
                    "prediction": prediction,
                    "is_dark_pattern": bool(is_dark),
                    "decision_scores": scores
                }

                self._set_headers(200)
                self.wfile.write(json.dumps(response, indent=2).encode("utf-8"))

            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint not found"}).encode("utf-8"))

def run(port=5000):
    server_address = ("127.0.0.1", port)
    httpd = HTTPServer(server_address, InferenceHandler)
    print(f"[*] Dark Pattern Python Inference Server listening at http://127.0.0.1:{port}/")
    print(f"[*] Test with: curl -X POST http://127.0.0.1:{port}/predict -H 'Content-Type: application/json' -d '{{\"text\": \"Hurry! Sale ends in 5 minutes!\"}}'")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Stopping server.")
        httpd.server_close()

if __name__ == "__main__":
    run()
