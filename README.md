# Wikidata Inspector

A web application for inspecting and exploring Wikidata entities, with a focus on companies in the Mining, Tech, and Defence sectors.

## Features

- Browse a curated list of companies from Mining, Tech, and Defence sectors
- Search all of Wikidata with autocomplete suggestions
- View detailed Wikidata information for entities
- CORS proxy server for Wikidata API requests

## Project Structure

```
.
├── index.html              # Frontend HTML
├── main.js                 # Frontend JavaScript
├── proxy.js                # Express CORS proxy server
├── get_wikidata_ids.py     # Python script to fetch Wikidata IDs from Wikipedia
├── data/                   # Data files
│   ├── companies.csv
│   └── companies_with_wikidata.csv
└── package.json            # Node.js dependencies
```

## Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. For the Python script, install dependencies:
```bash
pip install pandas playwright
playwright install chromium
```

## Usage

### Running the Application

1. Start the CORS proxy server:
```bash
node proxy.js
```

2. Serve the frontend (using any HTTP server):
```bash
python -m http.server 8000
# or
npx http-server -p 8000
```

3. Open your browser to `http://localhost:8000`

### Using the Python Script

To fetch Wikidata IDs from Wikipedia URLs:
```bash
python get_wikidata_ids.py
```

This reads `data/companies.csv` and outputs `data/companies_with_wikidata.csv` with Wikidata IDs populated.

## API Endpoints

The proxy server (`proxy.js`) provides:

- `GET /wikidata-sparql?query=<SPARQL_query>` - Proxy for Wikidata SPARQL queries
- `GET /autocomplete?search=<search_term>` - Autocomplete search for Wikidata entities

## Technologies

- Frontend: Vanilla JavaScript, Bootstrap 5
- Backend: Node.js, Express
- Data Processing: Python, Pandas, Playwright
