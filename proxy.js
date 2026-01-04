// proxy.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

app.use(cors({ origin: 'http://localhost:8000' })); 

const userAgent = 'MyWikidataInspector/1.0 (https://github.com/user/my-repo; user@example.com)';

// Endpoint for SPARQL queries
app.get('/wikidata-sparql', async (req, res) => {
    const wikidataEndpoint = 'https://query.wikidata.org/sparql';
    const query = req.query.query;

    if (!query) {
        return res.status(400).send('Missing SPARQL query parameter.');
    }

    try {
        const fullUrl = `${wikidataEndpoint}?query=${encodeURIComponent(query)}`;
        const wikidataResponse = await fetch(fullUrl, {
            headers: { 'Accept': 'application/sparql-results+json', 'User-Agent': userAgent }
        });

        if (!wikidataResponse.ok) {
            const errorText = await wikidataResponse.text();
            throw new Error(`Wikidata API error: ${wikidataResponse.status} - ${wikidataResponse.statusText} - ${errorText}`);
        }

        const data = await wikidataResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Wikidata', details: error.message });
    }
});

// New endpoint for autocomplete search
app.get('/autocomplete', async (req, res) => {
    const search = req.query.search;
    if (!search) {
        return res.status(400).send('Missing search parameter.');
    }

    // Using the official MediaWiki API for entity search
    const autocompleteEndpoint = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&continue=0&search=${encodeURIComponent(search)}`;

    try {
        const autocompleteResponse = await fetch(autocompleteEndpoint, {
            headers: { 'Accept': 'application/json', 'User-Agent': userAgent }
        });

        if (!autocompleteResponse.ok) {
            const errorText = await autocompleteResponse.text();
            throw new Error(`Wikidata Autocomplete API error: ${autocompleteResponse.status} - ${autocompleteResponse.statusText} - ${errorText}`);
        }

        const data = await autocompleteResponse.json();
        res.json(data.search || []); // The results are in the 'search' property
    } catch (error) {
        console.error('Autocomplete proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch autocomplete data from Wikidata', details: error.message });
    }
});


app.listen(PORT, () => {
    console.log(`CORS proxy server running on http://localhost:${PORT}`);
});
