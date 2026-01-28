import requests
import json
import sys

def get_sparql_results(query):
    url = 'https://query.wikidata.org/sparql'
    headers = {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'WikidataInspector/1.0 (https://github.com/nelsonmau/Manintheloop)'
    }
    response = requests.get(url, params={'query': query}, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def get_core_info_query(wikidata_id):
    return f"""SELECT ?WIKIDATA
        (SAMPLE(?COMPANY_label) AS ?COMPANY_label)
        (SAMPLE(?description) AS ?DESCRIPTION)
        (SAMPLE(?COUNTRY_label) AS ?COUNTRY_label)
        (SAMPLE(?wikipedia_url) AS ?WIKIPEDIA_URL)
        (SAMPLE(?inception_date) AS ?INCEPTION_DATE)
        (SAMPLE(?legal_form_label) AS ?LEGAL_FORM)
        (SAMPLE(?named_after_label) AS ?NAMED_AFTER)
        (SAMPLE(?slogan) AS ?SLOGAN)
        (SAMPLE(?employees_count) AS ?EMPLOYEES_COUNT)
        (SAMPLE(?replaces_label) AS ?REPLACES)
        (SAMPLE(?replaced_by_label) AS ?REPLACED_BY)
        (SAMPLE(?lei) AS ?LEGAL_ENTITY_IDENTIFIER)
        (GROUP_CONCAT(DISTINCT ?SECTOR_label; separator=", ") AS ?SECTORS)
        (GROUP_CONCAT(DISTINCT ?HEADQUARTERS_label; separator=", ") AS ?HEADQUARTERS)
        (GROUP_CONCAT(DISTINCT ?founder_label; separator=", ") AS ?FOUNDED_BY)
        WHERE {{
            VALUES ?WIKIDATA {{ wd:{wikidata_id} }}
            ?WIKIDATA rdfs:label ?COMPANY_label. FILTER(LANG(?COMPANY_label) = "en")

            OPTIONAL {{?WIKIDATA schema:description ?description. FILTER(LANG(?description) = "en")}}
            OPTIONAL {{
                ?WIKIDATA wdt:P17 ?COUNTRY.
                ?COUNTRY rdfs:label ?COUNTRY_label. FILTER(LANG(?COUNTRY_label) = "en")
            }}
            OPTIONAL {{?WIKIDATA wdt:P571 ?inception_date.}}
            OPTIONAL {{?wikipedia_url schema:about ?WIKIDATA; schema:inLanguage "en"; schema:isPartOf <https://en.wikipedia.org/>.}}
            OPTIONAL {{?WIKIDATA wdt:P452 ?SECTOR. ?SECTOR rdfs:label ?SECTOR_label. FILTER(LANG(?SECTOR_label) = "en")}}
            OPTIONAL {{?WIKIDATA wdt:P159 ?HEADQUARTERS. ?HEADQUARTERS rdfs:label ?HEADQUARTERS_label. FILTER(LANG(?HEADQUARTERS_label) = "en")}}
            OPTIONAL {{?WIKIDATA wdt:P1454 ?legal_form. ?legal_form rdfs:label ?legal_form_label. FILTER(LANG(?legal_form_label) = "en")}}
            OPTIONAL {{?WIKIDATA wdt:P112 ?founder. ?founder rdfs:label ?founder_label. FILTER(LANG(?founder_label) = "en")}}
            OPTIONAL {{?WIKIDATA wdt:P138 ?named_after. ?named_after rdfs:label ?named_after_label. FILTER(LANG(?named_after_label) = "en")}}
            OPTIONAL {{?WIKIDATA wdt:P1451 ?slogan. FILTER(LANG(?slogan) = "en")}}
            OPTIONAL {{?WIKIDATA wdt:P1128 ?employees_count.}}
            OPTIONAL {{?WIKIDATA wdt:P1365 ?replaces. ?replaces rdfs:label ?replaces_label. FILTER(LANG(?replaces_label) = "en")}}
            OPTIONAL {{?WIKIDATA wdt:P1366 ?replaced_by. ?replaced_by rdfs:label ?replaced_by_label. FILTER(LANG(?replaced_by_label) = "en")}}
            OPTIONAL {{?WIKIDATA wdt:P1278 ?lei.}}
        }} GROUP BY ?WIKIDATA"""

def get_people_query(wikidata_id):
    return f"""SELECT (GROUP_CONCAT(DISTINCT ?ceo_formatted; separator="; ") AS ?CEOS_HISTORY) (GROUP_CONCAT(DISTINCT ?owner_formatted; separator="; ") AS ?OWNERS_HISTORY) (GROUP_CONCAT(DISTINCT ?BOARD_MEMBER_label; separator=", ") AS ?BOARD_MEMBERS) WHERE {{
        VALUES ?WIKIDATA {{ wd:{wikidata_id} }}
        OPTIONAL {{
            ?WIKIDATA p:P169 ?ceo_statement. ?ceo_statement ps:P169 ?ceo_item.
            ?ceo_item rdfs:label ?ceo_label. FILTER(LANG(?ceo_label) = "en").
            OPTIONAL {{ ?ceo_statement pq:P580 ?start_date. }} OPTIONAL {{ ?ceo_statement pq:P582 ?end_date. }}
            BIND(CONCAT(?ceo_label, " (from ", COALESCE(STR(YEAR(?start_date)), "?"), " to ", COALESCE(STR(YEAR(?end_date)), "present"), ")") AS ?ceo_formatted)
        }}
        OPTIONAL {{
            ?WIKIDATA p:P127 ?owner_statement. ?owner_statement ps:P127 ?owner_item.
            ?owner_item rdfs:label ?owner_label. FILTER(LANG(?owner_label) = "en").
            OPTIONAL {{ ?owner_statement pq:P585 ?owner_date. }}
            BIND(CONCAT(?owner_label, " (as of ", COALESCE(STR(YEAR(?owner_date)), "?"), ")") AS ?owner_formatted)
        }}
        OPTIONAL {{?WIKIDATA wdt:P3320 ?BOARD_MEMBER. ?BOARD_MEMBER rdfs:label ?BOARD_MEMBER_label. FILTER(LANG(?BOARD_MEMBER_label) = "en")}}
    }} GROUP BY ?WIKIDATA"""

def get_corporate_query(wikidata_id):
    return f"""SELECT (GROUP_CONCAT(DISTINCT ?PARENT_ORGANIZATION_label; separator=", ") AS ?PARENT_ORGANIZATIONS) (GROUP_CONCAT(DISTINCT ?SUBSIDIARY_label; separator=", ") AS ?SUBSIDIARIES) (GROUP_CONCAT(DISTINCT ?PRODUCT_label; separator=", ") AS ?PRODUCTS_SERVICES) WHERE {{
        VALUES ?WIKIDATA {{ wd:{wikidata_id} }}
        OPTIONAL {{?WIKIDATA wdt:P749 ?PARENT_ORGANIZATION. ?PARENT_ORGANIZATION rdfs:label ?PARENT_ORGANIZATION_label. FILTER(LANG(?PARENT_ORGANIZATION_label) = "en")}}
        OPTIONAL {{?WIKIDATA wdt:P355 ?SUBSIDIARY. ?SUBSIDIARY rdfs:label ?SUBSIDIARY_label. FILTER(LANG(?SUBSIDIARY_label) = "en")}}
        OPTIONAL {{?WIKIDATA wdt:P1056 ?PRODUCT. ?PRODUCT rdfs:label ?PRODUCT_label. FILTER(LANG(?PRODUCT_label) = "en")}}
    }} GROUP BY ?WIKIDATA"""

def get_social_query(wikidata_id):
    return f"""SELECT
        (SAMPLE(?official_website) AS ?OFFICIAL_WEBSITE)
        (SAMPLE(?logo_image) AS ?LOGO_IMAGE)
        (GROUP_CONCAT(DISTINCT ?twitter_username; separator=", ") AS ?TWITTER_HANDLES)
        (GROUP_CONCAT(DISTINCT ?linkedin_id; separator=", ") AS ?LINKEDIN_IDS)
        (GROUP_CONCAT(DISTINCT ?facebook_id; separator=", ") AS ?FACEBOOK_IDS)
        (GROUP_CONCAT(DISTINCT ?instagram_username; separator=", ") AS ?INSTAGRAM_HANDLES)
        (GROUP_CONCAT(DISTINCT ?youtube_channel; separator=", ") AS ?YOUTUBE_CHANNELS)
        (GROUP_CONCAT(DISTINCT ?github_username; separator=", ") AS ?GITHUB_USERNAMES)
        (SAMPLE(?crunchbase_profile) AS ?CRUNCHBASE_PROFILE)
        (SAMPLE(?bloomberg_id) AS ?BLOOMBERG_ID)
        (SAMPLE(?opencorporates_id) AS ?OPENCORPORATES_ID)
        WHERE {{
        VALUES ?WIKIDATA {{ wd:{wikidata_id} }}
        OPTIONAL {{?WIKIDATA wdt:P856 ?official_website.}}
        OPTIONAL {{?WIKIDATA wdt:P154 ?logo_image.}}
        OPTIONAL {{?WIKIDATA wdt:P2002 ?twitter_username.}}
        OPTIONAL {{?WIKIDATA wdt:P4264 ?linkedin_id.}}
        OPTIONAL {{?WIKIDATA wdt:P2013 ?facebook_id.}}
        OPTIONAL {{?WIKIDATA wdt:P2003 ?instagram_username.}}
        OPTIONAL {{?WIKIDATA wdt:P2397 ?youtube_channel.}}
        OPTIONAL {{?WIKIDATA wdt:P2037 ?github_username.}}
        OPTIONAL {{?WIKIDATA wdt:P2088 ?crunchbase_profile.}}
        OPTIONAL {{?WIKIDATA wdt:P3052 ?bloomberg_id.}}
        OPTIONAL {{?WIKIDATA wdt:P1320 ?opencorporates_id.}}
    }} GROUP BY ?WIKIDATA"""

def get_stock_info_query(wikidata_id):
    return f"""SELECT
        (GROUP_CONCAT(DISTINCT ?stock_exchange_label; separator=", ") AS ?STOCK_EXCHANGES)
        (GROUP_CONCAT(DISTINCT ?ticker_symbol; separator=", ") AS ?TICKER_SYMBOLS)
        (GROUP_CONCAT(DISTINCT ?isin; separator=", ") AS ?ISIN_CODES)
        (SAMPLE(?sec_cik) AS ?SEC_CIK_NUMBER)
        (SAMPLE(?swift_bic) AS ?SWIFT_BIC_CODE)
        WHERE {{
        VALUES ?WIKIDATA {{ wd:{wikidata_id} }}
        OPTIONAL {{?WIKIDATA wdt:P414 ?stock_exchange. ?stock_exchange rdfs:label ?stock_exchange_label. FILTER(LANG(?stock_exchange_label) = "en")}}
        OPTIONAL {{?WIKIDATA wdt:P249 ?ticker_symbol.}}
        OPTIONAL {{?WIKIDATA wdt:P946 ?isin.}}
        OPTIONAL {{?WIKIDATA wdt:P5531 ?sec_cik.}}
        OPTIONAL {{?WIKIDATA wdt:P2627 ?swift_bic.}}
    }} GROUP BY ?WIKIDATA"""

def get_financial_history_query(wikidata_id):
    return f"""SELECT ?metric_label ?value (SAMPLE(?date) AS ?date) WHERE {{
        VALUES ?WIKIDATA {{ wd:{wikidata_id} }}
        {{
          ?WIKIDATA p:P2226 ?statement. BIND("Market Cap" AS ?metric_label)
          ?statement ps:P2226 ?value.
          OPTIONAL {{ ?statement pq:P585 ?date. }}
        }} UNION {{
          ?WIKIDATA p:P2139 ?statement. BIND("Total Revenue" AS ?metric_label)
          ?statement ps:P2139 ?value.
          OPTIONAL {{ ?statement pq:P585 ?date. }}
        }} UNION {{
          ?WIKIDATA p:P2295 ?statement. BIND("Net Income" AS ?metric_label)
          ?statement ps:P2295 ?value.
          OPTIONAL {{ ?statement pq:P585 ?date. }}
        }} UNION {{
          ?WIKIDATA p:P3362 ?statement. BIND("Operating Income" AS ?metric_label)
          ?statement ps:P3362 ?value.
          OPTIONAL {{ ?statement pq:P585 ?date. }}
        }} UNION {{
          ?WIKIDATA p:P2403 ?statement. BIND("Total Assets" AS ?metric_label)
          ?statement ps:P2403 ?value.
          OPTIONAL {{ ?statement pq:P585 ?date. }}
        }} UNION {{
          ?WIKIDATA p:P2137 ?statement. BIND("Total Equity" AS ?metric_label)
          ?statement ps:P2137 ?value.
          OPTIONAL {{ ?statement pq:P585 ?date. }}
        }} UNION {{
          ?WIKIDATA p:P2138 ?statement. BIND("Total Liabilities" AS ?metric_label)
          ?statement ps:P2138 ?value.
          OPTIONAL {{ ?statement pq:P585 ?date. }}
        }} UNION {{
          ?WIKIDATA p:P2133 ?statement. BIND("Total Debt" AS ?metric_label)
          ?statement ps:P2133 ?value.
          OPTIONAL {{ ?statement pq:P585 ?date. }}
        }} UNION {{
          ?WIKIDATA p:P1128 ?statement. BIND("Employees" AS ?metric_label)
          ?statement ps:P1128 ?value.
          OPTIONAL {{ ?statement pq:P585 ?date. }}
        }}
    }} GROUP BY ?metric_label ?value ?date ORDER BY DESC(?date)"""

def get_brands_query(wikidata_id):
    return f"""SELECT
        (GROUP_CONCAT(DISTINCT ?brand_owned_label; separator=", ") AS ?BRANDS_OWNED)
        (GROUP_CONCAT(DISTINCT ?parent_brand_label; separator=", ") AS ?PARENT_BRANDS)
        WHERE {{
        VALUES ?WIKIDATA {{ wd:{wikidata_id} }}
        OPTIONAL {{?WIKIDATA wdt:P1830 ?brand_owned. ?brand_owned rdfs:label ?brand_owned_label. FILTER(LANG(?brand_owned_label) = "en")}}
        OPTIONAL {{?WIKIDATA wdt:P8345 ?parent_brand. ?parent_brand rdfs:label ?parent_brand_label. FILTER(LANG(?parent_brand_label) = "en")}}
    }} GROUP BY ?WIKIDATA"""

def main():
    wikidata_id = "Q182439" # Nvidia
    if len(sys.argv) > 1:
        wikidata_id = sys.argv[1]

    print(f"Extracting data for {wikidata_id}...")

    results = {
        'core': get_sparql_results(get_core_info_query(wikidata_id)),
        'people': get_sparql_results(get_people_query(wikidata_id)),
        'corporate': get_sparql_results(get_corporate_query(wikidata_id)),
        'social': get_sparql_results(get_social_query(wikidata_id)),
        'stock': get_sparql_results(get_stock_info_query(wikidata_id)),
        'brands': get_sparql_results(get_brands_query(wikidata_id)),
        'financialHistory': get_sparql_results(get_financial_history_query(wikidata_id))
    }

    # Merge results
    merged_binding = {}
    all_vars = []

    for key in ['core', 'people', 'corporate', 'social', 'stock', 'brands']:
        res = results[key]
        if res and res['results']['bindings']:
            merged_binding.update(res['results']['bindings'][0])
        if res and 'head' in res and 'vars' in res['head']:
            all_vars.extend(res['head']['vars'])

    if results['financialHistory'] and results['financialHistory']['results']['bindings']:
        merged_binding['FINANCIAL_HISTORY'] = { 'value': results['financialHistory']['results']['bindings'] }
        all_vars.append('FINANCIAL_HISTORY')

    unique_vars = list(set(all_vars))
    final_output = { 'head': { 'vars': unique_vars }, 'results': { 'bindings': [merged_binding] } }

    output_path = f"tests/nvidia.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(final_output, f, indent=2, ensure_ascii=False)

    print(f"Data saved to {output_path}")

if __name__ == "__main__":
    main()
