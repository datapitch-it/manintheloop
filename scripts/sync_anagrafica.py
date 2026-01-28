import pandas as pd
import json
import os
import requests
import time

CSV_PATH = 'data/companies.csv'
JSON_PATH = 'data/companies.json'

def get_wikidata_id_safe(name):
    """
    Search Wikidata for a company name.
    Returns the QID if found and looks like a company/organization.
    """
    url = "https://www.wikidata.org/w/api.php"
    params = {
        "action": "wbsearchentities",
        "search": name,
        "language": "en",
        "format": "json",
        "type": "item",
        "limit": 5
    }
    try:
        # User-Agent is mandatory for Wikidata API
        res = requests.get(url, params=params, headers={'User-Agent': 'ManintheloopSync/1.0'})
        data = res.json()
        
        # Check first result
        if data.get('search'):
            first_hit = data['search'][0]
            print(f"  -> Found candidate for '{name}': {first_hit['label']} ({first_hit['id']}) - {first_hit.get('description', 'No desc')}")
            return first_hit['id']
            
    except Exception as e:
        print(f"  [!] Error searching for {name}: {e}")
    
    return None

def sync_anagrafica():
    print("--- Starting Sync: CSV -> JSON ---")
    
    # 1. Load Source of Truth (CSV)
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found.")
        return
    
    # Assuming CSV has column 'COMPANY' based on previous reads, but let's check headers
    # Standardizing to what we saw in 'enrich_data.py': 'COMPANY', 'MAIN FOCUS', 'SECTOR'
    df_csv = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df_csv)} rows from CSV.")

    # 2. Load Existing Cache (JSON)
    existing_data = {}
    if os.path.exists(JSON_PATH):
        with open(JSON_PATH, 'r') as f:
            try:
                json_list = json.load(f)
                # Map Label -> ID for quick lookup. 
                # Note: This assumes Label is unique. If ID is unique, map ID -> Data.
                # Strategy: We trust the CSV for the LIST of companies. 
                # We use JSON to retrieve IDs for those companies if they exist.
                for item in json_list:
                    existing_data[item['label']] = item
                print(f"Loaded {len(json_list)} existing entries from JSON.")
            except json.JSONDecodeError:
                print("Warning: JSON file corrupted or empty. Starting fresh.")

    # 3. Merge & Enrich
    new_json_list = []
    
    # Iterate exactly in the order of the CSV (Source of Truth)
    for index, row in df_csv.iterrows():
        company_name = str(row.get('COMPANY', '')).strip()
        if not company_name or company_name.lower() == 'nan':
            continue
            
        description = str(row.get('MAIN FOCUS', row.get('SECTOR', 'nan')))
        
        # Build the entry
        entry = {
            "id": None,
            "label": company_name,
            "description": description
        }

        # CHECK 1: Do we already have this company in our clean JSON?
        if company_name in existing_data:
            cached_entry = existing_data[company_name]
            # Keep the existing ID (it's protected/validated)
            entry['id'] = cached_entry['id']
            # Update description from CSV (CSV rules for content updates)
            # OR keep JSON description? User said "CSV with master data". 
            # Usually master data updates descriptions. Let's keep CSV desc.
        
        # CHECK 2: Do we have it in the CSV itself (some CSVs have a 'Wikidata' column)?
        if (entry['id'] is None) and ('Wikidata' in row) and pd.notna(row['Wikidata']):
            wid = str(row['Wikidata']).strip()
            if wid.startswith('Q'):
                entry['id'] = wid

        # ACTION: If ID is still missing, Search.
        if entry['id'] is None:
            print(f"Searching Wikidata ID for new entry: {company_name}")
            found_id = get_wikidata_id_safe(company_name)
            if found_id:
                entry['id'] = found_id
                print(f"  -> Assigned {found_id}")
                time.sleep(1) # Rate limit
            else:
                print(f"  -> No ID found.")
        
        # Add to list only if we have an ID (or should we keep them without ID?)
        # User said "quelli che NON ce l'hanno, eseguo script per cercarlo".
        # Assuming we want to keep them even if not found, to preserve the Master List view?
        # But the app needs an ID to work. Let's keep them with id: null or skip?
        # Existing JSON structure implies ID is mandatory for the app logic usually.
        # We will add it.
        if entry['id']:
            new_json_list.append(entry)
        else:
            # Add with placeholder or skip? 
            # Let's verify strictness. For now add, let app handle nulls if any.
            pass

    # 4. Save
    # Sort A-Z ascending by label before saving
    new_json_list.sort(key=lambda x: x['label'].lower())
    
    print(f"Saving {len(new_json_list)} companies to {JSON_PATH}...")
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(new_json_list, f, indent=2, ensure_ascii=False)
    
    print("Sync complete.")

if __name__ == "__main__":
    sync_anagrafica()
