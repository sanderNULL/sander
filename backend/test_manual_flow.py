import requests
import json
import uuid

BASE_URL = "http://localhost:8001"

def test_manual_entry():
    # 1. Check if server is up
    try:
        requests.get(BASE_URL)
    except:
        print("Server not running at http://localhost:8000. Please run the server first.")
        return

    # 2. Create Manual Entry
    payload = {
        "folio_fiscal": str(uuid.uuid4()),
        "rfc_emisor": "TEST010101000",
        "rfc_receptor": "REC010101000",
        "nombre_emisor": "Test Manual Emisor",
        "nombre_receptor": "Juan Perez",
        "puesto": "Desarrollador",
        "subtotal": "1500.00",
        "total_deducciones": "100.00",
        "total_neto": "1400.00",
        "categoria": "Honorarios",
        "origen": "Campo"
    }
    
    print(f"Sending manual entry: {payload['folio_fiscal']}")
    res = requests.post(f"{BASE_URL}/api/manual", json=payload)
    print(f"POST status: {res.status_code}")
    print(f"POST response: {res.json()}")
    
    if res.status_code != 200 or res.json().get("status") != "success":
        print("FAILED to create manual entry")
        return

    # 3. Verify it appears in list
    print("Verifying in list...")
    res_list = requests.get(f"{BASE_URL}/api/procesar?categoria=Honorarios&filtro_origen=Todos")
    if res_list.status_code != 200:
        print("FAILED to get list")
        return
    
    items = res_list.json()
    found = False
    for item in items:
        if item.get("folio_fiscal") == payload["folio_fiscal"]:
            found = True
            print("SUCCESS: Found manual entry in list")
            print(item)
            break
            
    if not found:
        print("FAILED: Manual entry not found in list")

    # 4. Verify Totals
    print("Verifying totals...")
    res_total = requests.get(f"{BASE_URL}/api/resumen")
    print(res_total.json())

    # 5. Verify Deletion
    print("Verifying deletion...")
    if not found:
        print("Skipping deletion test because item was not found")
        return

    # Need filename from the list item
    target_filename = None
    for item in items:
        if item.get("folio_fiscal") == payload["folio_fiscal"]:
            target_filename = item["archivo"]
            break
            
    if target_filename:
        print(f"Deleting {target_filename}...")
        del_payload = {
            "filename": target_filename,
            "categoria": "Honorarios"
        }
        res_del = requests.post(f"{BASE_URL}/api/eliminar", json=del_payload)
        print(f"DELETE status: {res_del.status_code}")
        print(f"DELETE response: {res_del.json()}")
        
        if res_del.status_code == 200 and res_del.json().get("status") == "success":
            print("SUCCESS: Deletion successful")
            
            # Verify it's gone
            res_list_after = requests.get(f"{BASE_URL}/api/procesar?categoria=Honorarios&filtro_origen=Todos")
            items_after = res_list_after.json()
            still_there = any(x['archivo'] == target_filename for x in items_after)
            if not still_there:
                 print("SUCCESS: verified removed from list")
            else:
                 print("FAILURE: Item still in list")
        else:
            print("FAILURE: Delete API failed")

if __name__ == "__main__":
    test_manual_entry()
