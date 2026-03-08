import requests
import json

url = "http://localhost:8000/api/v1/judge/evaluate"

params = {
    "prompt": "What is machine learning?",
    "response_a": "Machine learning is a subset of AI that enables systems to learn from data.",
    "response_b": "ML is when computers learn patterns from examples without being explicitly programmed.",
    "mode": "pairwise"
}

response = requests.post(url, params=params)
print(f"Status Code: {response.status_code}")
print(json.dumps(response.json(), indent=2))