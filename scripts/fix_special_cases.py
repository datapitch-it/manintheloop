import pandas as pd

CSV_PATH = 'data/companies.csv'
df = pd.read_csv(CSV_PATH)

fixes = {
    'AVIC': 'Q790835',
    'CASC': 'Q1073145',
    'Eviden': 'Q118322695'
}

for name, qid in fixes.items():
    df.loc[df['COMPANY'] == name, 'Wikidata'] = qid

df.to_csv(CSV_PATH, index=False)
print("Manually fixed AVIC, CASC, and Eviden in CSV.")
