import pandas as pd
import json

# Read CSV
df = pd.read_csv('data/companies.csv')

# Filter out entries without Wikidata IDs
df = df[df['Wikidata'].notna() & (df['Wikidata'] != '')]

# Convert to list of dictionaries
companies = []
for _, row in df.iterrows():
    companies.append({
        'id': row['Wikidata'],
        'label': row['COMPANY'],
        'description': row['SECTOR']
    })

# Write to JSON
with open('data/companies.json', 'w', encoding='utf-8') as f:
    json.dump(companies, f, indent=2, ensure_ascii=False)

print(f"Converted {len(companies)} companies to JSON")
