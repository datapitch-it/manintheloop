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

def get_wikidata_countries(qids):
    """
    Fetch country labels for a list of QIDs in a single SPARQL query.
    """
    if not qids:
        return {}
    
    qids_str = " ".join([f"wd:{q}" for q in qids])
    query = f"""
    SELECT ?item ?countryLabel WHERE {{
      VALUES ?item {{ {qids_str} }}
      ?item wdt:P17 ?country.
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }}
    """
    url = "https://query.wikidata.org/sparql"
    headers = {'User-Agent': 'ManintheloopSync/1.0', 'Accept': 'application/sparql-results+json'}
    
    countries = {}
    try:
        res = requests.get(url, params={'query': query}, headers=headers)
        data = res.json()
        for binding in data['results']['bindings']:
            qid = binding['item']['value'].split('/')[-1]
            label = binding['countryLabel']['value']
            countries[qid] = label
    except Exception as e:
        print(f"  [!] Error fetching countries: {e}")
    
    return countries

def normalize_country(name):
    """
    Unify country names (e.g., China, People's Republic of China, Cina -> China).
    """
    if not name or str(name).lower() == 'nan':
        return "Unknown"
    
    name_clean = name.strip().lower()
    
    # China normalization
    china_variants = ["china", "people's republic of china", "cina", "prc"]
    if any(v == name_clean for v in china_variants) or "people's republic of china" in name_clean:
        return "China"
    
    # USA normalization
    usa_variants = ["united states", "usa", "united states of america", "u.s.a.", "u.s."]
    if any(v == name_clean for v in usa_variants) or "united states of america" in name_clean:
        return "United States"

    # UK normalization
    uk_variants = ["united kingdom", "uk", "u.k.", "great britain"]
    if any(v == name_clean for v in uk_variants):
        return "United Kingdom"

    # Czechia normalization
    czech_variants = ["czech republic", "czechia", "czech rep."]
    if any(v == name_clean for v in czech_variants):
        return "Czechia"
    
    # Taiwan normalization
    taiwan_variants = ["taiwan", "republic of china", "taiwan, province of china"]
    if any(v == name_clean for v in taiwan_variants):
        return "Taiwan"

    # Netherlands normalization
    netherlands_variants = ["netherlands", "the netherlands", "kingdom of the netherlands"]
    if any(v == name_clean for v in netherlands_variants):
        return "Netherlands"

    # UK normalization
    uk_variants = ["united kingdom", "uk", "u.k.", "great britain"]
    if any(v == name_clean for v in uk_variants):
        return "United Kingdom"

    # South Korea normalization
    skorea_variants = ["south korea", "republic of korea", "korea, south", "korea (republic of)"]
    if any(v == name_clean for v in skorea_variants):
        return "South Korea"

    # Russia normalization
    russia_variants = ["russia", "russian federation"]
    if any(v == name_clean for v in russia_variants):
        return "Russia"
        
    return name.strip().title() # title() ensures 'France', not 'france' or 'FRANCE'

def sync_anagrafica():
    print("--- Starting Sync: CSV -> JSON (with Wikidata Country Enrichment) ---")
    
    # 1. Load Source of Truth (CSV)
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found.")
        return
    
    df_csv = pd.read_csv(CSV_PATH)
    print(f"Loaded {len(df_csv)} rows from CSV.")

    # 2. Load Existing Cache (JSON)
    existing_data = {}
    if os.path.exists(JSON_PATH):
        with open(JSON_PATH, 'r') as f:
            try:
                json_list = json.load(f)
                for item in json_list:
                    existing_data[item['label']] = item
                print(f"Loaded {len(json_list)} existing entries from JSON.")
            except json.JSONDecodeError:
                print("Warning: JSON file corrupted or empty. Starting fresh.")

    # 3. Merge & Identify IDs to fetch countries for
    temp_list = []
    seen_ids = set()
    
    for index, row in df_csv.iterrows():
        company_name = str(row.get('COMPANY', '')).strip()
        if not company_name or company_name.lower() == 'nan':
            continue
            
        description = str(row.get('MAIN FOCUS', row.get('SECTOR', 'nan')))
        csv_country = normalize_country(row.get('COUNTRY', 'Unknown'))
        
        entry = {
            "id": None,
            "label": company_name,
            "description": description,
            "country": csv_country # Default to normalized CSV, will be overridden by Wikidata
        }

        if company_name in existing_data:
            entry['id'] = existing_data[company_name]['id']
        
        if (entry['id'] is None) and ('Wikidata' in row) and pd.notna(row['Wikidata']):
            wid = str(row['Wikidata']).strip()
            if wid.startswith('Q'):
                entry['id'] = wid

        if entry['id'] is None:
            print(f"Searching Wikidata ID for: {company_name}")
            found_id = get_wikidata_id_safe(company_name)
            if found_id:
                entry['id'] = found_id
                time.sleep(0.5)
        
        if entry['id'] and entry['id'] not in seen_ids:
            temp_list.append(entry)
            seen_ids.add(entry['id'])

    # 4. Batch Enrichment of Countries from Wikidata
    print("Enriching countries from Wikidata...")
    all_ids = [e['id'] for e in temp_list if e['id']]
    # Split into chunks of 50 for SPARQL
    chunk_size = 50
    wikidata_countries = {}
    for i in range(0, len(all_ids), chunk_size):
        chunk = all_ids[i:i+chunk_size]
        wikidata_countries.update(get_wikidata_countries(chunk))
        time.sleep(1)

    for entry in temp_list:
        qid = entry['id']
        if qid in wikidata_countries:
            entry['country'] = normalize_country(wikidata_countries[qid])

    # 5. Save
    temp_list.sort(key=lambda x: x['label'].lower())
    print(f"Saving {len(temp_list)} companies to {JSON_PATH}...")
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(temp_list, f, indent=2, ensure_ascii=False)
    
    print("Sync complete.")

if __name__ == "__main__":
    sync_anagrafica()
