import requests

try:
    url = "http://127.0.0.1:8000/api/auth/register"
    data = {
        "username": "TestUser",
        "email": "test@test.com",
        "password": "password123"
    }
    print(f"Sending POST to {url}...")
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response Content: {response.text}")
except Exception as e:
    print(f"Error connecting: {e}")
