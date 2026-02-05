import requests
import json
import uuid
import time

BASE_URL = "http://localhost:8001"

def test_filtering_bug():
    # 1. Create Manual Entry (Defaults to Centrales)
    ui_uuid = str(uuid.uuid4())
    payload = {
        "folio_fiscal": ui_uuid,
        "rfc_emisor": "TESTFILTER",
        "rfc_receptor": "REC010101000",
        "nombre_emisor": "Test Filter Emisor",
        "subtotal": "500.00",
        "categoria": "Honorarios",
        "origen": "Centrales" 
    }
    
    print(f"Creating manual entry: {ui_uuid} [Centrales]")
    res = requests.post(f"{BASE_URL}/api/manual", json=payload)
    if res.status_code != 200:
        print("Error creating invoice")
        return
    
    filename = res.json().get("archivo")
    print(f"Created file: {filename}")

    # 2. Filter by "Centrales" (Should find it)
    print("Filtering by 'Centrales'...")
    res = requests.get(f"{BASE_URL}/api/procesar?categoria=Honorarios&filtro_origen=Centrales")
    items = res.json()
    found = any(i['archivo'] == filename for i in items)
    if found:
        print("SUCCESS: Found in 'Centrales'")
    else:
        print("FAILURE: NOT Found in 'Centrales'")

    # 3. Filter by "Campo" (Should NOT find it)
    print("Filtering by 'Campo'...")
    res = requests.get(f"{BASE_URL}/api/procesar?categoria=Honorarios&filtro_origen=Campo")
    items = res.json()
    found = any(i['archivo'] == filename for i in items)
    if not found:
        print("SUCCESS: NOT Found in 'Campo'")
    else:
        print("FAILURE: Found in 'Campo' (Should not be there)")

    # 4. Toggle to "Campo"
    print("Toggling to 'Campo'...")
    toggle_payload = {
        "filename": filename,
        "categoria": "Honorarios",
        "new_origen": "Campo"
    }
    res = requests.post(f"{BASE_URL}/api/actualizar_origen", json=toggle_payload)
    if res.status_code == 200 and res.json()['status'] == 'success':
        new_filename = res.json()['new_filename']
        print(f"Toggled success. New name: {new_filename}")
    else:
        print(f"Toggle failed: {res.text}")
        return

    # 5. Filter by "Campo" (Should find it now)
    print("Filtering by 'Campo' (Expect match)...")
    res = requests.get(f"{BASE_URL}/api/procesar?categoria=Honorarios&filtro_origen=Campo")
    items = res.json()
    found = any(i['archivo'] == new_filename for i in items)
    if found:
        print("SUCCESS: Found in 'Campo'")
    else:
        print("FAILURE: NOT Found in 'Campo' after toggle")

if __name__ == "__main__":
    test_filtering_bug()
