import requests
import json

BASE_URL = "http://localhost:8001"
CATEGORIA = "Honorarios"

def debug_delete():
    # 1. List files
    print(f"Listing files in {CATEGORIA}...")
    res = requests.get(f"{BASE_URL}/api/procesar?categoria={CATEGORIA}&filtro_origen=Todos")
    if res.status_code != 200:
        print("Error getting list")
        return

    items = res.json()
    print(f"Found {len(items)} items")
    
    if not items:
        print("No items to delete")
        return

    # 2. Pick the first one
    target = items[0]
    filename = target["archivo"]
    print(f"Targeting: {filename}")
    
    # 3. Try to delete
    payload = {
        "filename": filename,
        "categoria": CATEGORIA
    }
    
    print(f"Sending DELETE request for {filename}...")
    print(f"Payload: {payload}")
    
    res_del = requests.post(f"{BASE_URL}/api/eliminar", json=payload)
    print(f"Status: {res_del.status_code}")
    print(f"Response: {res_del.text}")

if __name__ == "__main__":
    debug_delete()
