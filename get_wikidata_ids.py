
import pandas as pd
from playwright.sync_api import sync_playwright

def get_wikidata_id(url):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            page.goto(url)
            # Get the href attribute of the wikidata item
            wikidata_link = page.query_selector('li#t-wikibase > a')
            if wikidata_link:
                href = wikidata_link.get_attribute('href')
                wikidata_id = href.split('/')[-1]
                return wikidata_id
        except Exception as e:
            print(f"Could not get Wikidata ID for {url}: {e}")
        finally:
            browser.close()
    return None

def main():
    df = pd.read_csv('data/companies.csv')
    for index, row in df.iterrows():
        if pd.isna(row['Wikidata']) or row['Wikidata'] == '':
            print(f"Getting Wikidata ID for {row['COMPANY']}...")
            wikidata_id = get_wikidata_id(row['Wikipedia url'])
            if wikidata_id:
                df.loc[index, 'Wikidata'] = wikidata_id
                print(f"Found Wikidata ID: {wikidata_id}")
    df.to_csv('data/companies.csv', index=False)
    print("Finished getting Wikidata IDs. The results are in data/companies.csv")

if __name__ == '__main__':
    main()
