import requests
import json
import uuid
import time
import os

BASE_URL = "http://localhost:8001"

def test_toggle_stress():
    # 1. Create
    print("Creating entry...")
    ui_uuid = str(uuid.uuid4())
    payload = {
        "folio_fiscal": ui_uuid,
        "categoria": "Honorarios",
        "origen": "Centrales"
    }
    res = requests.post(f"{BASE_URL}/api/manual", json=payload)
    if res.status_code != 200:
        print("Create failed")
        return
    
    current_filename = res.json()['archivo']
    print(f"Created: {current_filename}")
    
    # 2. Toggle Loop
    for i in range(5):
        print(f"\n--- Iteration {i+1} ---")
        
        # Determine target
        is_centrales = "Centrales" in current_filename
        target = "Campo" if is_centrales else "Centrales"
        
        print(f"Toggling to {target}...")
        
        toggle_payload = {
            "filename": current_filename,
            "categoria": "Honorarios",
            "new_origen": target
        }
        
        start_time = time.time()
        res = requests.post(f"{BASE_URL}/api/actualizar_origen", json=toggle_payload)
        end_time = time.time()
        
        if res.status_code != 200:
            print(f"FAILED: Status {res.status_code} - {res.text}")
            break
            
        json_res = res.json()
        if json_res['status'] != 'success':
            print(f"FAILED: API Error - {json_res.get('message')}")
            break
            
        new_filename = json_res['new_filename']
        print(f"API returned new name: {new_filename} (took {end_time - start_time:.4f}s)")
        
        # Verify Listing immediately
        # Simulating the frontend immediate fetch
        res_list = requests.get(f"{BASE_URL}/api/procesar?categoria=Honorarios&filtro_origen=Todos")
        items = res_list.json()
        
        found_names = [x['archivo'] for x in items if x['folio_fiscal'] == ui_uuid] # Assuming manual entry has unique UUID we can track, oh wait, listing doesn't return UUID always? Manuel entry returns data object.
        # Manual entry saves UUID in json.
        
        # Find by filename in list
        found_in_list = any(x['archivo'] == new_filename for x in items)
        
        if found_in_list:
             print("SUCCESS: Found correct new filename in listing")
        else:
             print(f"FAILURE: New filename {new_filename} NOT FOUND in listing.")
             # Check if OLD filename is there?
             if any(x['archivo'] == current_filename for x in items):
                 print("CRITICAL: Old filename STILl in listing! (Reverted?)")
             else:
                 print("Odd: Neither old nor new filename found (Maybe filtered out?)")

        current_filename = new_filename
        time.sleep(0.5)

if __name__ == "__main__":
    test_toggle_stress()
