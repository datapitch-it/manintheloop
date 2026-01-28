import json
import requests
import time

def verify_company_ids(json_path):
    with open(json_path, 'r') as f:
        companies = json.load(f)

    print(f"Verifying {len(companies)} companies...")
    
    mismatches = []
    
    # Batch processing could be better but let's do simple linear check for the problematic ones first or all.
    # To be safe and fast, let's checking only the ones that look suspicious or check all but limit output.
    
    for i, company in enumerate(companies):
        label = company['label']
        current_id = company['id']
        
        # Skip if ID looks like a placeholder or obviously wrong (though format is usually Q...)
        if not current_id.startswith('Q'):
            continue

        try:
            # Fetch entity data from Wikidata for this ID to see its label
            url = f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids={current_id}&props=labels&languages=en&format=json"
            res = requests.get(url, headers={'User-Agent': 'WikidataInspector/1.0 (https://github.com/nelsonmau/Manintheloop)'})
            try:
                data = res.json()
            except json.JSONDecodeError:
                print(f"Error decoding JSON for {label} ({current_id}). Response: {res.text[:100]}")
                continue
            
            entity = data.get('entities', {}).get(current_id)
            if not entity or 'missing' in entity:
                mismatches.append(f"MISSING: {label} has ID {current_id} which does not exist on Wikidata.")
                continue
                
            wikidata_label = entity.get('labels', {}).get('en', {}).get('value', 'No English Label')
            
            # Simple fuzzy match or substring check
            # If the label in JSON is completely different from Wikidata label
            print(f"Checked {label} ({current_id}) -> Wikidata says: {wikidata_label}")
            
            # Heuristic: If "Amazon" vs "Meta Platforms", that's a mismatch.
            # If "Alphabet (Google)" vs "Alphabet Inc.", that's fine.
            
            # Normalize for comparison
            l1 = label.lower()
            l2 = wikidata_label.lower()
            
            if l1 not in l2 and l2 not in l1:
                 # Check for common aliases manually or strictly flag
                 mismatches.append(f"MISMATCH: JSON Label '{label}' has ID {current_id} which is '{wikidata_label}' on Wikidata.")

            time.sleep(0.1) # Be nice to API
            
        except Exception as e:
            print(f"Error checking {label}: {e}")

    print("\n--- Potential Mismatches Found ---")
    for m in mismatches:
        print(m)

if __name__ == "__main__":
    verify_company_ids("data/companies.json")
