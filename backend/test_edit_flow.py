import requests
import json
import uuid
import time

BASE_URL = "http://localhost:8001"
CATEGORIA = "Honorarios"

def test_edit_flow():
    # 1. Create unique Manual Entry
    unique_folio = str(uuid.uuid4())
    print(f"Creating entry: {unique_folio}")
    
    payload = {
        "folio_fiscal": unique_folio,
        "rfc_emisor": "ORIGINAL",
        "nombre_emisor": "Original Name",
        "subtotal": "100.00",
        "categoria": CATEGORIA,
        "origen": "Centrales"
    }
    
    res = requests.post(f"{BASE_URL}/api/manual", json=payload)
    if res.status_code != 200:
        print("Failed to create manual entry")
        return
        
    created_file = res.json().get("archivo")
    print(f"Created file: {created_file}")

    # 2. Edit the entry
    print("Editing entry...")
    # Change Name and Amount
    edit_payload = {
        "filename": created_file,
        "folio_fiscal": unique_folio,
        "rfc_emisor": "EDITED",
        "nombre_emisor": "Edited Name",
        "subtotal": "999.99",
        "categoria": CATEGORIA,
        "origen": "Centrales" # Keep origin same for now
    }
    
    res_edit = requests.post(f"{BASE_URL}/api/editar", json=edit_payload)
    print(f"Edit Status: {res_edit.status_code}")
    print(f"Edit Response: {res_edit.json()}")
    
    if res_edit.status_code != 200 or res_edit.json().get("status") != "success":
        print("FAILED to edit")
        return

    # 3. Verify changes in LIST
    print("Verifying changes...")
    res_list = requests.get(f"{BASE_URL}/api/procesar?categoria={CATEGORIA}&filtro_origen=Todos")
    items = res_list.json()
    
    found_item = next((x for x in items if x["folio_fiscal"] == unique_folio), None)
    
    if found_item:
        print(f"Found item: {found_item.get('nombre_emisor')} - ${found_item.get('subtotal')}")
        if found_item.get("nombre_emisor") == "Edited Name" and found_item.get("subtotal") == "999.99":
            print("SUCCESS: Data updated correctly")
        else:
            print("FAILURE: Data not updated")
    else:
        print("FAILURE: Item lost after edit")

    # 4. Clean up
    print("Cleaning up...")
    if found_item:
        del_payload = {"filename": found_item["archivo"], "categoria": CATEGORIA}
        requests.post(f"{BASE_URL}/api/eliminar", json=del_payload)

if __name__ == "__main__":
    test_edit_flow()
