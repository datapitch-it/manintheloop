import pandas as pd
import json
import os

CSV_PATH = 'data/companies.csv'
JSON_PATH = 'data/companies.json'

def back_sync_csv():
    if not os.path.exists(JSON_PATH) or not os.path.exists(CSV_PATH):
        return

    # Load clean JSON
    with open(JSON_PATH, 'r') as f:
        json_data = json.load(f)
    
    label_to_id = {item['label']: item['id'] for item in json_data if item['id']}

    # Load CSV
    df = pd.read_csv(CSV_PATH)

    # Update Wikidata column based on Label matching
    count = 0
    for index, row in df.iterrows():
        name = str(row['COMPANY']).strip()
        if name in label_to_id:
            new_id = label_to_id[name]
            old_id = str(row.get('Wikidata', ''))
            if old_id != new_id:
                df.at[index, 'Wikidata'] = new_id
                count += 1
    
    # Save CSV
    df.to_csv(CSV_PATH, index=False)
    print(f"Back-synced {count} IDs to {CSV_PATH}")

if __name__ == "__main__":
    back_sync_csv()
