import pandas as pd
import json

# URL of the Google Sheet CSV
CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSg4v9OkP8ZAmUQ_AOukHt8-_jjoiZR62_aeIvay9SqLv6GVxgnZbzT9hckXN0lq8WyHcxZ3smmGvsI/pub?gid=766453961&single=true&output=csv"

def update_data():
    print(f"Fetching data from {CSV_URL}...")
    try:
        # Pandas can read directly from URL
        df = pd.read_csv(CSV_URL)
        
        # Save a local copy of the CSV
        df.to_csv('data/companies.csv', index=False)
        print("Saved local copy to data/companies.csv")

        # Filter out entries without Wikidata IDs
        # The column name in the Google Sheet is 'Wikidata'
        df = df[df['Wikidata'].notna() & (df['Wikidata'].astype(str).str.strip() != '')]

        # Convert to list of dictionaries
        companies = []
        for _, row in df.iterrows():
            # Use MAIN FOCUS as description if available, otherwise SECTOR
            description = row.get('MAIN FOCUS', row.get('SECTOR', ''))
            
            companies.append({
                'id': str(row['Wikidata']).strip(),
                'label': row['COMPANY'],
                'description': str(description)
            })

        # Write to JSON
        with open('data/companies.json', 'w', encoding='utf-8') as f:
            json.dump(companies, f, indent=2, ensure_ascii=False)

        print(f"Successfully converted {len(companies)} companies to JSON")
        
    except Exception as e:
        print(f"Error updating data: {e}")

if __name__ == '__main__':
    update_data()
