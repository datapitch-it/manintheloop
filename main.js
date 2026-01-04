document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const searchInput = document.getElementById('search-input');
    const searchModeToggle = document.getElementById('search-mode-toggle');
    const companyListContainer = document.getElementById('company-list-container');
    const localCompanyListEl = document.getElementById('local-company-list');
    const liveSearchContainer = document.getElementById('live-search-container');
    const autocompleteResults = document.getElementById('autocomplete-results');
    const resultsContainer = document.getElementById('results-container');
    const errorContainer = document.getElementById('error-container');
    const loader = document.getElementById('loader');
    const mainTitle = document.getElementById('main-title'); 

    // --- State Management ---
    let debounceTimer;
    const localCompanyList = [
        { id: 'Q821293', label: 'Rio Tinto', description: 'Mining' },
        { id: 'Q625713', label: 'BHP Group', description: 'Mining' },
        { id: 'Q202841', label: 'Zijin Mining', description: 'Mining' },
        { id: 'Q1073509', label: 'China Shenhua Energy', description: 'Mining' },
        { id: 'Q7569806', label: 'Southern Copper Corporation', description: 'Mining' },
        { id: 'Q1785405', label: 'Newmont Corporation', description: 'Mining' },
        { id: 'Q38676', label: 'Agnico Eagle Mines', description: 'Mining' },
        { id: 'Q136990728', label: 'Ma’aden', description: 'Mining' },
        { id: 'Q623591', label: 'Grupo México', description: 'Mining' },
        { id: 'Q583268', label: 'Vale S.A.', description: 'Mining' },
        { id: 'Q124976', label: 'Coal India', description: 'Mining' },
        { id: 'Q1438957', label: 'Fortescue Metals Group', description: 'Mining' },
        { id: 'Q808908', label: 'Barrick Gold', description: 'Mining' },
        { id: 'Q541451', label: 'Anglo American', description: 'Mining' },
        { id: 'Q1747133', label: 'Wheaton Precious Metals', description: 'Mining' },
        { id: 'Q182477', label: 'Nvidia', description: 'Tech' },
        { id: 'Q2283', label: 'Microsoft', description: 'Tech' },
        { id: 'Q312', label: 'Apple', description: 'Tech' },
        { id: 'Q20800404', label: 'Alphabet (Google)', description: 'Tech' },
        { id: 'Q3884', label: 'Amazon', description: 'Tech' },
        { id: 'Q380', label: 'Meta Platforms', description: 'Tech' },
        { id: 'Q790060', label: 'Broadcom', description: 'Tech' },
        { id: 'Q713418', label: 'TSMC', description: 'Tech' },
        { id: 'Q478214', label: 'Tesla', description: 'Tech' },
        { id: 'Q19900', label: 'Oracle', description: 'Tech' },
        { id: 'Q907311', label: 'Netflix', description: 'Tech' },
        { id: 'Q552581', label: 'SAP', description: 'Tech' },
        { id: 'Q297879', label: 'ASML', description: 'Tech' },
        { id: 'Q20718', label: 'Samsung Electronics', description: 'Tech' },
        { id: 'Q37156', label: 'IBM', description: 'Tech' },
        { id: 'Q173395', label: 'Cisco Systems', description: 'Tech' },
        { id: 'Q128896', label: 'AMD', description: 'Tech' },
        { id: 'Q544847', label: 'Qualcomm', description: 'Tech' },
        { id: 'Q248', label: 'Intel', description: 'Tech' },
        { id: 'Q11463', label: 'Adobe', description: 'Tech' },
        { id: 'Q89368734', label: 'RTX (Raytheon Technologies)', description: 'Defence' },
        { id: 'Q1886126', label: 'Safran', description: 'Defence' },
        { id: 'Q898208', label: 'Honeywell', description: 'Defence' },
        { id: 'Q7240', label: 'Lockheed Martin', description: 'Defence' },
        { id: 'Q161544', label: 'Rheinmetall', description: 'Defence' },
        { id: 'Q502940', label: 'General Dynamics', description: 'Defence' },
        { id: 'Q329953', label: 'Northrop Grumman', description: 'Defence' },
        { id: 'Q739416', label: 'BAE Systems', description: 'Defence' },
        { id: 'Q1161666', label: 'Thales', description: 'Defence' },
        { id: 'Q30291091', label: 'L3Harris Technologies', description: 'Defence' },
        { id: 'Q357095', label: 'Hindustan Aeronautics', description: 'Defence' },
        { id: 'Q910379', label: 'Leonardo', description: 'Defence' },
        { id: 'Q3630918', label: 'Bharat Electronics', description: 'Defence' },
        { id: 'Q219501', label: 'Saab AB', description: 'Defence' },
        { id: 'Q297600', label: 'Aselsan', description: 'Defence' },
        { id: 'Q919300', label: 'AeroVironment', description: 'Defence' },
        { id: 'Q16858667', label: 'Kratos Defense & Security Solutions', description: 'Defence' },
        { id: 'Q21236526', label: 'Hensoldt', description: 'Defence' },
        { id: 'Q7257522', label: 'Huntington Ingalls Industries', description: 'Defence' },
        { id: 'Q1661823', label: 'Indra Sistemas', description: 'Defence' }
    ];

    // --- Initial Setup ---
    updateFavicon('default');
    renderLocalCompanyList();
    // No dynamic title update yet, just original h1 content


    // --- Event Listeners ---
    searchModeToggle.addEventListener('change', (e) => {
        const isWikidataMode = e.target.checked;
        companyListContainer.classList.toggle('d-none', isWikidataMode);
        liveSearchContainer.classList.toggle('d-none', !isWikidataMode);
        clearAll();
    });

    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const searchTerm = searchInput.value.trim();
        autocompleteResults.innerHTML = '';
        if (searchTerm.length > 0) {
            debounceTimer = setTimeout(() => {
                fetchWikidataAutocomplete(searchTerm);
            }, 300);
        }
    });

    document.addEventListener('click', (e) => {
        if (!liveSearchContainer.contains(e.target)) {
            autocompleteResults.innerHTML = '';
        }
    });

    // --- Main Functions ---
    function renderLocalCompanyList() {
        localCompanyListEl.innerHTML = '';
        localCompanyList.forEach(item => {
            const itemElement = document.createElement('a');
            itemElement.href = '#';
            itemElement.className = 'list-group-item list-group-item-action';
            itemElement.dataset.id = item.id;
            itemElement.textContent = item.label;
            
            itemElement.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('#local-company-list .list-group-item').forEach(el => el.classList.remove('active'));
                e.target.classList.add('active');
                triggerFullQuery(item.id, item.label); // Pass label, but not used for title yet
            });
            localCompanyListEl.appendChild(itemElement);
        });
    }

    async function fetchWikidataAutocomplete(searchTerm) {
        try {
            const response = await fetch(`http://localhost:3000/autocomplete?search=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) throw new Error('Autocomplete search failed');
            const results = await response.json();
            
            autocompleteResults.innerHTML = '';
            results.forEach(item => {
                const itemElement = document.createElement('a');
                itemElement.href = '#';
                itemElement.className = 'list-group-item list-group-item-action';
                itemElement.innerHTML = `<div class="fw-bold">${item.label}</div><div class="small text-muted">${item.description || ''}</div>`;
                
                itemElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    searchInput.value = item.label;
                    autocompleteResults.innerHTML = '';
                    triggerFullQuery(item.id, item.label); // Pass label, not used for title yet
                });
                autocompleteResults.appendChild(itemElement);
            });
        } catch (error) {
            console.error('Autocomplete Error:', error);
        }
    }

    async function triggerFullQuery(wikidataId, companyLabel = '') {
        if (!wikidataId) return;

        clearAll(false);
        loader.classList.remove('d-none');
        updateFavicon('active');

        try {
            const [
                coreInfo,
                peopleInfo,
                corporateInfo,
                socialInfo,
                financialHistory 
            ] = await Promise.all([
                executeQuery(getCoreInfoQuery(wikidataId)),
                executeQuery(getPeopleQuery(wikidataId)),
                executeQuery(getCorporateQuery(wikidataId)),
                executeQuery(getSocialQuery(wikidataId)),
                executeQuery(getFinancialHistoryQuery(wikidataId)) 
            ]);

            const mergedData = mergeResults({
                core: coreInfo,
                people: peopleInfo,
                corporate: corporateInfo,
                social: socialInfo,
                financialHistory: financialHistory 
            });

            renderResults(mergedData, companyLabel); // companyLabel passed, but not used by renderResults for title
            updateFavicon('complete');
        } catch (err) {
            showError(`Failed to fetch data: ${err.message}`);
            updateFavicon('error');
        } finally {
            loader.classList.add('d-none');
        }
    }
    
    function mergeResults(results) {
        const mergedBinding = {};
        const allVars = [];

        ['core', 'people', 'corporate', 'social'].forEach(key => {
            const result = results[key];
            if (result && result.results.bindings.length > 0) {
                Object.assign(mergedBinding, result.results.bindings[0]);
            }
            if (result && result.head.vars) {
                allVars.push(...result.head.vars);
            }
        });

        if (results.financialHistory && results.financialHistory.results.bindings.length > 0) {
            mergedBinding['FINANCIAL_HISTORY'] = { value: results.financialHistory.results.bindings };
            allVars.push('FINANCIAL_HISTORY');
        }

        const uniqueVars = [...new Set(allVars)];
        return { head: { vars: uniqueVars }, results: { bindings: [mergedBinding] } };
    }

    async function executeQuery(sparqlQuery) {
        if (!sparqlQuery) return { head: { vars: [] }, results: { bindings: [] } };
        const endpointUrl = 'http://localhost:3000/wikidata-sparql';
        const fullUrl = `${endpointUrl}?query=${encodeURIComponent(sparqlQuery)}`;
        const response = await fetch(fullUrl, { headers: { 'Accept': 'application/sparql-results+json' }});
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`SPARQL query failed: ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    }

    // --- Query Definitions ---
    function getCoreInfoQuery(wikidataId) {
        // This query is now more robust. (This comment was added during the problematic fix)
        return `SELECT ?WIKIDATA
            (SAMPLE(?COMPANY_label) AS ?COMPANY_label)
            (SAMPLE(?COUNTRY_label) AS ?COUNTRY_label)
            (SAMPLE(?wikipedia_url) AS ?WIKIPEDIA_URL)
            (SAMPLE(?inception_date) AS ?INCEPTION_DATE)
            (GROUP_CONCAT(DISTINCT ?SECTOR_label; separator=", ") AS ?SECTORS)
            (GROUP_CONCAT(DISTINCT ?HEADQUARTERS_label; separator=", ") AS ?HEADQUARTERS)
            WHERE {
                VALUES ?WIKIDATA { wd:${wikidataId} }
                ?WIKIDATA rdfs:label ?COMPANY_label. FILTER(LANG(?COMPANY_label) = "en")
                
                OPTIONAL {
                    ?WIKIDATA wdt:P17 ?COUNTRY.
                    ?COUNTRY rdfs:label ?COUNTRY_label. FILTER(LANG(?COUNTRY_label) = "en")
                }
                OPTIONAL {?WIKIDATA wdt:P571 ?inception_date.}
                OPTIONAL {?wikipedia_url schema:about ?WIKIDATA; schema:inLanguage "en"; schema:isPartOf <https://en.wikipedia.org/>.}
                OPTIONAL {?WIKIDATA wdt:P452 ?SECTOR. ?SECTOR rdfs:label ?SECTOR_label. FILTER(LANG(?SECTOR_label) = "en")}
                OPTIONAL {?WIKIDATA wdt:P159 ?HEADQUARTERS. ?HEADQUARTERS rdfs:label ?HEADQUARTERS_label. FILTER(LANG(?HEADQUARTERS_label) = "en")}
            } GROUP BY ?WIKIDATA`;
    }

    function getPeopleQuery(wikidataId) { /* Unchanged */ 
        return `SELECT (GROUP_CONCAT(DISTINCT ?ceo_formatted; separator="; ") AS ?CEOS_HISTORY) (GROUP_CONCAT(DISTINCT ?owner_formatted; separator="; ") AS ?OWNERS_HISTORY) (GROUP_CONCAT(DISTINCT ?BOARD_MEMBER_label; separator=", ") AS ?BOARD_MEMBERS) WHERE {
            VALUES ?WIKIDATA { wd:${wikidataId} }
            OPTIONAL {
                ?WIKIDATA p:P169 ?ceo_statement. ?ceo_statement ps:P169 ?ceo_item.
                ?ceo_item rdfs:label ?ceo_label. FILTER(LANG(?ceo_label) = "en").
                OPTIONAL { ?ceo_statement pq:P580 ?start_date. } OPTIONAL { ?ceo_statement pq:P582 ?end_date. }
                BIND(CONCAT(?ceo_label, " (from ", COALESCE(STR(YEAR(?start_date)), "?"), " to ", COALESCE(STR(YEAR(?end_date)), "present"), ")") AS ?ceo_formatted)
            }
            OPTIONAL {
                ?WIKIDATA p:P127 ?owner_statement. ?owner_statement ps:P127 ?owner_item.
                ?owner_item rdfs:label ?owner_label. FILTER(LANG(?owner_label) = "en").
                OPTIONAL { ?owner_statement pq:P585 ?owner_date. }
                BIND(CONCAT(?owner_label, " (as of ", COALESCE(STR(YEAR(?owner_date)), "?"), ")") AS ?owner_formatted)
            }
            OPTIONAL {?WIKIDATA wdt:P3320 ?BOARD_MEMBER. ?BOARD_MEMBER rdfs:label ?BOARD_MEMBER_label. FILTER(LANG(?BOARD_MEMBER_label) = "en")}
        } GROUP BY ?WIKIDATA`;
    }
    function getCorporateQuery(wikidataId) { /* Unchanged */ 
        return `SELECT (GROUP_CONCAT(DISTINCT ?PARENT_ORGANIZATION_label; separator=", ") AS ?PARENT_ORGANIZATIONS) (GROUP_CONCAT(DISTINCT ?SUBSIDIARY_label; separator=", ") AS ?SUBSIDIARIES) (GROUP_CONCAT(DISTINCT ?PRODUCT_label; separator=", ") AS ?PRODUCTS_SERVICES) WHERE {
            VALUES ?WIKIDATA { wd:${wikidataId} }
            OPTIONAL {?WIKIDATA wdt:P749 ?PARENT_ORGANIZATION. ?PARENT_ORGANIZATION rdfs:label ?PARENT_ORGANIZATION_label. FILTER(LANG(?PARENT_ORGANIZATION_label) = "en")}
            OPTIONAL {?WIKIDATA wdt:P355 ?SUBSIDIARY. ?SUBSIDIARY rdfs:label ?SUBSIDIARY_label. FILTER(LANG(?SUBSIDIARY_label) = "en")}
            OPTIONAL {?WIKIDATA wdt:P1056 ?PRODUCT. ?PRODUCT rdfs:label ?PRODUCT_label. FILTER(LANG(?PRODUCT_label) = "en")}
        } GROUP BY ?WIKIDATA`;
    }
    function getSocialQuery(wikidataId) { /* Unchanged */ 
        return `SELECT (SAMPLE(?official_website) AS ?OFFICIAL_WEBSITE) (SAMPLE(?logo_image) AS ?LOGO_IMAGE) (GROUP_CONCAT(DISTINCT ?twitter_username; separator=", ") AS ?TWITTER_HANDLES) (GROUP_CONCAT(DISTINCT ?linkedin_id; separator=", ") AS ?LINKEDIN_IDS) WHERE {
            VALUES ?WIKIDATA { wd:${wikidataId} }
            OPTIONAL {?WIKIDATA wdt:P856 ?official_website.}
            OPTIONAL {?WIKIDATA wdt:P154 ?logo_image.}
            OPTIONAL {?WIKIDATA wdt:P2002 ?twitter_username.}
            OPTIONAL {?WIKIDATA wdt:P4264 ?linkedin_id.}
        } GROUP BY ?WIKIDATA`;
    }

    function getFinancialHistoryQuery(wikidataId) { /* Unchanged */
        return `SELECT ?metric_label ?value (SAMPLE(?date) AS ?date) WHERE {
            VALUES ?WIKIDATA { wd:${wikidataId} }
            {
              ?WIKIDATA p:P2226 ?statement. BIND("Market Cap" AS ?metric_label)
              ?statement ps:P2226 ?value.
              OPTIONAL { ?statement pq:P585 ?date. }
            } UNION {
              ?WIKIDATA p:P2139 ?statement. BIND("Total Revenue" AS ?metric_label)
              ?statement ps:P2139 ?value.
              OPTIONAL { ?statement pq:P585 ?date. }
            } UNION {
              ?WIKIDATA p:P2295 ?statement. BIND("Net Income" AS ?metric_label)
              ?statement ps:P2295 ?value.
              OPTIONAL { ?statement pq:P585 ?date. }
            }
        } GROUP BY ?metric_label ?value ?date ORDER BY DESC(?date)`;
    }

    function renderResults(data, companyLabel) {
        const result = data.results.bindings[0];
        if (!result) { showError('No data found for this Wikidata ID.'); return; }

        // mainTitle.textContent = `${DEFAULT_TITLE}: ${companyLabel || (result.COMPANY_label ? result.COMPANY_label.value : '')}`; // This line caused the issue

        const table = document.createElement('table');
        table.className = 'table table-bordered table-striped';
        const tbody = document.createElement('tbody');
        
        const fieldOrder = [
            'COMPANY_label', 'SECTORS', 'WIKIPEDIA_URL', 'WIKIDATA', 'COUNTRY_label', 'HEADQUARTERS', 'INCEPTION_DATE',
            'CEOS_HISTORY', 'BOARD_MEMBERS', 'OWNERS_HISTORY',
            'FINANCIAL_HISTORY',
            'PARENT_ORGANIZATIONS', 'SUBSIDIARIES', 'PRODUCTS_SERVICES',
            'OFFICIAL_WEBSITE', 'TWITTER_HANDLES', 'LINKEDIN_IDS', 'LOGO_IMAGE'
        ];

        fieldOrder.forEach(key => {
            const row = document.createElement('tr');
            const fieldCell = document.createElement('th');
            fieldCell.textContent = key.replace(/_/g, ' ');
            row.appendChild(fieldCell);
            
            const valueCell = document.createElement('td');
            const dataItem = result[key];
            const dataValue = dataItem ? dataItem.value : "N/A";

            if (key === 'FINANCIAL_HISTORY') {
                if (dataValue !== "N/A" && Array.isArray(dataValue)) {
                    const yearlyData = dataValue.reduce((acc, item) => {
                        const year = item.date ? new Date(item.date.value).getFullYear().toString() : '?';
                        if (!acc[year]) {
                            acc[year] = { year: year, 'Market Cap': 'N/A', 'Net Income': 'N/A', 'Total Revenue': 'N/A' };
                        }
                        const formattedVal = `${(parseFloat(item.value.value) / 1_000_000_000).toFixed(1)}B`;
                        acc[year][item.metric_label.value] = formattedVal;
                        return acc;
                    }, {});

                    const sortedYears = Object.keys(yearlyData).sort((a, b) => parseInt(b) - parseInt(a));

                    const nestedTable = document.createElement('table');
                    nestedTable.className = 'table table-sm table-bordered mb-0';
                    nestedTable.innerHTML = `<thead><tr><th>Year</th><th>Market Cap</th><th>Total Revenue</th><th>Net Income</th></tr></thead>`;
                    const nestedTbody = document.createElement('tbody');

                    sortedYears.forEach(year => {
                        const rowData = yearlyData[year];
                        nestedTbody.innerHTML += `<tr>
                            <td>${rowData.year}</td>
                            <td>${rowData['Market Cap']}</td>
                            <td>${rowData['Total Revenue']}</td>
                            <td>${rowData['Net Income']}</td>
                        </tr>`;
                    });
                    
                    nestedTable.appendChild(nestedTbody);
                    valueCell.appendChild(nestedTable);

                } else {
                    valueCell.textContent = "N/A";
                }
            } else if (dataValue === "N/A") {
                valueCell.textContent = dataValue;
            } else if (dataItem.type === 'uri' && dataValue.startsWith('http')) {
                const link = document.createElement('a');
                link.href = dataValue;
                link.target = '_blank';
                if (/\.(jpg|jpeg|png|gif|svg)$/i.test(dataValue)) {
                    const img = document.createElement('img');
                    img.src = dataValue;
                    img.style.maxWidth = '200px';
                    img.style.maxHeight = '200px';
                    link.appendChild(img);
                } else { link.textContent = dataValue; }
                valueCell.appendChild(link);
            } else {
                (dataValue.toString()).split('; ').forEach((part, index) => {
                    if (index > 0) valueCell.appendChild(document.createElement('br'));
                    valueCell.appendChild(document.createTextNode(part));
                });
            }
            row.appendChild(valueCell);
            tbody.appendChild(row);
        });

        table.appendChild(tbody);
        resultsContainer.appendChild(table);
    }
    
    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.classList.remove('d-none');
    }

    function clearAll(clearInput = true) {
        if (clearInput) searchInput.value = '';
        resultsContainer.innerHTML = '';
        autocompleteResults.innerHTML = '';
        errorContainer.classList.add('d-none');
        errorContainer.textContent = '';
        // mainTitle.textContent = DEFAULT_TITLE; // This was here before
    }
    
    function updateFavicon(status) {
        try {
            let link = document.querySelector("link[rel='icon']") || document.querySelector("link[rel='shortcut icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            const canvas = document.createElement('canvas');
            canvas.width = 32; canvas.height = 32;
            const ctx = canvas.getContext('2d');
            let bgColor = '#6c757d';
            if (status === 'active') bgColor = '#0d6efd';
            else if (status === 'complete') bgColor = '#198754';
            else if (status === 'error') bgColor = '#dc3545';
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.arc(16, 16, 16, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 18px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('W', 16, 17);
            link.href = canvas.toDataURL('image/png');
        } catch(e) {
            console.error(e);
        }
    }
});