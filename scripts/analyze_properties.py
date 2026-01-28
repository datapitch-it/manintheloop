import json
import requests

KNOWN_PROPERTIES = {
    'P17', 'P571', 'P1454', 'P138', 'P1451', 'P1128', 'P1365', 'P1366', 'P452', 'P159', 'P112', 
    'P169', 'P127', 'P3320', 'P749', 'P355', 'P1056', 'P856', 'P154', 'P2002', 'P4264', 'P2013', 
    'P2003', 'P2397', 'P2037', 'P2088', 'P3052', 'P414', 'P249', 'P946', 'P5531', 'P2226', 'P2139', 
    'P2295', 'P3362', 'P2403', 'P2138', 'P1830', 'P8345'
}

def get_property_labels(property_ids):
    if not property_ids:
        return {}
    
    # Chunking to avoid URL length limits if too many
    labels = {}
    chunk_size = 50
    props_list = list(property_ids)
    
    for i in range(0, len(props_list), chunk_size):
        chunk = props_list[i:i+chunk_size]
        values = " ".join([f"wd:{p}" for p in chunk])
        query = f"""
        SELECT ?property ?propertyLabel WHERE {{
          VALUES ?property {{ {values} }}
          SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
        }}
        """
        
        url = 'https://query.wikidata.org/sparql'
        headers = {
            'Accept': 'application/sparql-results+json',
            'User-Agent': 'WikidataInspector/1.0'
        }
        try:
            response = requests.get(url, params={'query': query}, headers=headers)
            data = response.json()
            for binding in data['results']['bindings']:
                p_id = binding['property']['value'].split('/')[-1]
                label = binding['propertyLabel']['value']
                labels[p_id] = label
        except Exception as e:
            print(f"Error fetching labels: {e}")
            
    return labels

with open('tests/nvidia_full.json', 'r') as f:
    data = json.load(f)

entity = data['entities'].get('Q182477')
if not entity:
    print("Entity Q182477 not found in JSON")
    exit()

claims = entity.get('claims', {})
all_properties = set(claims.keys())
new_properties = all_properties - KNOWN_PROPERTIES

print(f"Total properties found: {len(all_properties)}")
print(f"Known properties: {len(all_properties & KNOWN_PROPERTIES)}")
print(f"New properties: {len(new_properties)}")

if new_properties:
    print("\nFetching labels for new properties...")
    labels = get_property_labels(new_properties)
    
    print("\nPotentially useful new properties:")
    for p_id in new_properties:
        label = labels.get(p_id, "Unknown Label")
        # Get a sample value to see what it looks like
        sample_val = "Complex Value"
        try:
            claim = claims[p_id][0]
            mainsnak = claim.get('mainsnak', {})
            if mainsnak.get('datatype') == 'string':
                sample_val = mainsnak.get('datavalue', {}).get('value')
            elif mainsnak.get('datatype') == 'url':
                 sample_val = mainsnak.get('datavalue', {}).get('value')
            elif mainsnak.get('datatype') == 'external-id':
                 sample_val = mainsnak.get('datavalue', {}).get('value')
            elif mainsnak.get('datatype') == 'quantity':
                 sample_val = mainsnak.get('datavalue', {}).get('value', {}).get('amount')
            elif mainsnak.get('datatype') == 'wikibase-item':
                 sample_val = "Item Link (needs resolution)"
            elif mainsnak.get('datatype') == 'time':
                 sample_val = mainsnak.get('datavalue', {}).get('value', {}).get('time')
        except:
            pass
            
        print(f"{p_id}: {label} (Sample: {sample_val})")
