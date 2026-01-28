import pandas as pd
import requests
import time
import json
import io
import re

CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSg4v9OkP8ZAmUQ_AOukHt8-_jjoiZR62_aeIvay9SqLv6GVxgnZbzT9hckXN0lq8WyHcxZ3smmGvsI/pub?gid=766453961&single=true&output=csv"

def clean_name(name):
    # Fix: Correctly escape parentheses in regex
    name = re.sub(r'\(.*?\)', '', name)
    return name.strip()

def is_definitely_not_company(description, label):
    if not description: return False
    desc = description.lower()
    
    # Blacklist for entities that often shadow companies
    blacklist = [
        'country', 'sovereign state', 'nation', 'republic', 'former country',
        'city', 'municipality', 'village', 'human', 'person', 'born 19', 'born 20',
        'chemical element', 'isotope', 'mythological', 'asteroid', 'comet', 'island'
    ]
    
    if any(word in desc for word in blacklist):
        return True
    return False

def is_likely_company(description, label, original_name):
    if is_definitely_not_company(description, label):
        return False
        
    desc = description.lower()
    label_lower = label.lower()
    orig_lower = original_name.lower()
    
    # Positive markers
    if any(word in desc for word in ['company', 'enterprise', 'business', 'manufacturer', 'corporation', 'firm', 'subsidiary', 'industry', 'provider', 'holding', 'defense', 'mining', 'technology', 'group']):
        return True
        
    # If the original name contains "Group" or "Ltd", it's a good sign if the label matches
    if any(w in orig_lower for w in ['group', 'ltd', 'spa', 'corp']):
        return True

    return True

def get_wikidata_id_strict(company_name, country=None):
    base_url = "https://www.wikidata.org/w/api.php"
    
    search_queries = []
    if country: search_queries.append(f"{company_name} {country}")
    search_queries.append(company_name)
    search_queries.append(f"{clean_name(company_name)} company")

    headers = {'User-Agent': 'WikidataInspectorEnricher/1.4'}

    for query in search_queries:
        params = {
            "action": "wbsearchentities",
            "search": query,
            "language": "en",
            "format": "json",
            "type": "item",
            "limit": 10
        }
        
        try:
            response = requests.get(base_url, params=params, headers=headers)
            if response.status_code == 200:
                results = response.json().get('search', [])
                for res in results:
                    label = res.get('label', '')
                    desc = res.get('description', '')
                    
                    if not is_definitely_not_company(desc, label):
                        if is_likely_company(desc, label, company_name):
                            return res['id']
        except:
            pass
    return None

def main():
    print(f"Downloading data and performing strict validation...")
    try:
        response = requests.get(CSV_URL)
        df = pd.read_csv(io.StringIO(response.content.decode('utf-8')))
    except:
        df = pd.read_csv(CSV_URL)
    
    if 'Wikidata' not in df.columns: df['Wikidata'] = ''

    for index, row in df.iterrows():
        original_name = str(row['COMPANY'])
        country = str(row.get('COUNTRY', '')) if pd.notna(row.get('COUNTRY')) else None
        
        new_id = get_wikidata_id_strict(original_name, country)
        
        if new_id:
            df.at[index, 'Wikidata'] = new_id
            print(f"Verified '{original_name}': {new_id}")
        else:
            print(f"COULD NOT VERIFY '{original_name}'")
            df.at[index, 'Wikidata'] = ''
        
        time.sleep(0.05)

    df.to_csv('data/companies.csv', index=False)
    
    app_data = []
    enriched_df = df[df['Wikidata'].notna() & (df['Wikidata'].astype(str).str.strip() != '') & (df['Wikidata'].astype(str).str.strip() != 'nan')]
    for _, row in enriched_df.iterrows():
        app_data.append({
            'id': str(row['Wikidata']).strip(),
            'label': row['COMPANY'],
            'description': str(row.get('MAIN FOCUS', row.get('SECTOR', '')))
        })
    
    with open('data/companies.json', 'w', encoding='utf-8') as f:
        json.dump(app_data, f, indent=2, ensure_ascii=False)
    
    print(f"\nDone! App now has {len(app_data)} verified companies.")

if __name__ == '__main__':
    main()