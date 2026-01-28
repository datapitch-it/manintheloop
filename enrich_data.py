import pandas as pd
import requests
import time
import json
import io

CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSg4v9OkP8ZAmUQ_AOukHt8-_jjoiZR62_aeIvay9SqLv6GVxgnZbzT9hckXN0lq8WyHcxZ3smmGvsI/pub?gid=766453961&single=true&output=csv"

def is_company_on_wikidata(qid):
    """
    Verifies if a QID is an instance of a business, company, or similar.
    P31 = Instance of
    Q4830453 = business enterprise
    Q783794 = company
    Q6881511 = enterprise
    """
    if not qid or not qid.startswith('Q'): return False
    
    url = f"https://www.wikidata.org/w/api.php?action=wbgetentities&ids={qid}&props=claims&format=json"
    try:
        res = requests.get(url, headers={'User-Agent': 'WikidataInspector/1.5'})
        data = res.json()
        claims = data.get('entities', {}).get(qid, {}).get('claims', {})
        
        # P31 is 'instance of'
        p31 = claims.get('P31', [])
        company_types = ['Q4830453', 'Q783794', 'Q6881511', 'Q43229', 'Q161227', 'Q2028343']
        
        for claim in p31:
            val = claim.get('mainsnak', {}).get('datavalue', {}).get('value', {}).get('id')
            if val in company_types:
                return True
        return False
    except:
        return False

def get_wikidata_id_safe(name):
    # Special case for Czechoslovak Group
    if "Czechoslovak Group" in name:
        return "Q27350567"
        
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
        res = requests.get(url, params=params, headers={'User-Agent': 'WikidataInspector/1.5'})
        results = res.json().get('search', [])
        for r in results:
            qid = r['id']
            # Verify it's a company
            if is_company_on_wikidata(qid):
                return qid
    except:
        pass
    return None

def main():
    print("Resetting data to original Google Sheets version...")
    response = requests.get(CSV_URL)
    df = pd.read_csv(io.StringIO(response.content.decode('utf-8')))
    
    # Track stats
    original_ids = df['Wikidata'].notna().sum()
    print(f"Original IDs preserved: {original_ids}")

    count_added = 0
    for index, row in df.iterrows():
        # Only try to find ID if it's missing
        if pd.isna(row['Wikidata']) or str(row['Wikidata']).strip() == '' or str(row['Wikidata']) == 'nan':
            name = row['COMPANY']
            print(f"Searching for missing ID: {name}...", end="", flush=True)
            new_id = get_wikidata_id_safe(name)
            if new_id:
                df.at[index, 'Wikidata'] = new_id
                print(f" Found and verified: {new_id}")
                count_added += 1
            else:
                print(" Not found or not a company.")
            time.sleep(0.2)

    # Final Save
    df.to_csv('data/companies.csv', index=False)
    
    app_data = []
    final_df = df[df['Wikidata'].notna() & (df['Wikidata'].astype(str).str.strip() != '')]
    for _, row in final_df.iterrows():
        app_data.append({
            'id': str(row['Wikidata']).strip(),
            'label': row['COMPANY'],
            'description': str(row.get('MAIN FOCUS', row.get('SECTOR', '')))
        })
    
    with open('data/companies.json', 'w', encoding='utf-8') as f:
        json.dump(app_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nRestoration complete! App now has {len(app_data)} companies.")
    print(f"({original_ids} original + {count_added} new verified)")

if __name__ == '__main__':
    main()
