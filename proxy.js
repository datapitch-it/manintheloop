// proxy.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Dynamic CORS to allow any localhost port or specific production domains
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        
        const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
        const allowedOrigins = ['https://datapitch-it.github.io'];
        
        if (isLocalhost || allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            console.log("CORS blocked for origin:", origin);
            return callback(new Error('Not allowed by CORS'), false);
        }
    }
})); 

const userAgent = 'WikidataInspector/1.1 (https://github.com/user/my-repo; contact: nelsonmau@example.com)';

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
            console.error(`Wikidata SPARQL Error: ${wikidataResponse.status}`, errorText);
            return res.status(wikidataResponse.status).json({ error: 'Wikidata API error', details: errorText });
        }

        const data = await wikidataResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy internal error:', error);
        res.status(500).json({ error: 'Failed to fetch data from Wikidata', details: error.message });
    }
});

// Endpoint for autocomplete search
app.get('/autocomplete', async (req, res) => {
    const search = req.query.search;
    if (!search) {
        return res.status(400).send('Missing search parameter.');
    }

    const autocompleteEndpoint = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&continue=0&search=${encodeURIComponent(search)}`;

    try {
        const autocompleteResponse = await fetch(autocompleteEndpoint, {
            headers: { 'Accept': 'application/json', 'User-Agent': userAgent }
        });

        if (!autocompleteResponse.ok) {
            const errorText = await autocompleteResponse.text();
            console.error(`Wikidata Autocomplete Error: ${autocompleteResponse.status}`, errorText);
            return res.status(autocompleteResponse.status).json({ error: 'Autocomplete API error', details: errorText });
        }

        const data = await autocompleteResponse.json();
        res.json(data.search || []);
    } catch (error) {
        console.error('Autocomplete proxy error:', error);
        res.status(500).json({ error: 'Failed to fetch autocomplete data from Wikidata', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`CORS proxy server running on http://localhost:${PORT}`);
});