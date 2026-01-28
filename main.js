document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const searchInput = document.getElementById('search-input');
    const searchModeToggle = document.getElementById('search-mode-toggle');
    const companyListContainer = document.getElementById('company-list-container');
    const localCompanyListEl = document.getElementById('local-company-list');
    const countryListEl = document.getElementById('country-list');
    const liveSearchContainer = document.getElementById('live-search-container');
    const autocompleteResults = document.getElementById('autocomplete-results');
    const resultsContainer = document.getElementById('results-container');
    const errorContainer = document.getElementById('error-container');
    const loader = document.getElementById('loader');
    const mainTitle = document.getElementById('main-title');

    // --- Environment Detection ---
    const isGitHubPages = window.location.hostname.includes('github.io');
    const USE_PROXY = !isGitHubPages; // Use proxy only on localhost

    // --- State Management ---
    let debounceTimer;
    let localCompanyList = [];
    let selectedCountry = null;

    // --- JSON Loading ---
    async function loadCompaniesFromJSON() {
        try {
            const response = await fetch('data/companies.json');
            if (!response.ok) throw new Error('Failed to load companies file');

            localCompanyList = await response.json();
            // Sort A-Z ascending by label
            localCompanyList.sort((a, b) => a.label.localeCompare(b.label));
            
            renderCountryFilter();
            renderLocalCompanyList();
        } catch (error) {
            console.error('Error loading companies from JSON:', error);
            showError('Failed to load company list. Please refresh the page.');
        }
    }

    // --- Initial Setup ---
    updateFavicon('default');
    loadCompaniesFromJSON();
    // No dynamic title update yet, just original h1 content


    // --- Event Listeners ---
    searchModeToggle.addEventListener('change', (e) => {
        const isWikidataMode = e.target.checked;
        document.getElementById('local-nav-container').classList.toggle('d-none', isWikidataMode);
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
    function renderCountryFilter() {
        const countryCounts = localCompanyList.reduce((acc, company) => {
            const country = company.country || 'Unknown';
            acc[country] = (acc[country] || 0) + 1;
            return acc;
        }, {});

        const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);

        countryListEl.innerHTML = '';
        
        // "All" Option
        const allItem = document.createElement('a');
        allItem.href = '#';
        allItem.className = `list-group-item list-group-item-action ${!selectedCountry ? 'active' : ''}`;
        allItem.textContent = `All (${localCompanyList.length})`;
        allItem.addEventListener('click', (e) => {
            e.preventDefault();
            selectedCountry = null;
            renderCountryFilter();
            renderLocalCompanyList();
        });
        countryListEl.appendChild(allItem);

        sortedCountries.forEach(([country, count]) => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = `list-group-item list-group-item-action ${selectedCountry === country ? 'active' : ''}`;
            item.innerHTML = `${country} <span class="badge bg-secondary rounded-pill float-end">${count}</span>`;
            item.addEventListener('click', (e) => {
                e.preventDefault();
                selectedCountry = country;
                renderCountryFilter();
                renderLocalCompanyList();
            });
            countryListEl.appendChild(item);
        });
    }

    function renderLocalCompanyList() {
        localCompanyListEl.innerHTML = '';
        const filteredList = selectedCountry 
            ? localCompanyList.filter(c => c.country === selectedCountry)
            : localCompanyList;

        filteredList.forEach(item => {
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
            let results;
            if (USE_PROXY) {
                const response = await fetch(`http://localhost:3000/autocomplete?search=${encodeURIComponent(searchTerm)}`);
                if (!response.ok) throw new Error('Autocomplete search failed');
                results = await response.json();
            } else {
                // Direct Wikidata API call
                const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&continue=0&search=${encodeURIComponent(searchTerm)}&origin=*`;
                const response = await fetch(url);
                if (!response.ok) throw new Error('Autocomplete search failed');
                const data = await response.json();
                results = data.search || [];
            }
            
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
                stockInfo,
                brandsInfo,
                financialHistory
            ] = await Promise.all([
                executeQuery(getCoreInfoQuery(wikidataId)),
                executeQuery(getPeopleQuery(wikidataId)),
                executeQuery(getCorporateQuery(wikidataId)),
                executeQuery(getSocialQuery(wikidataId)),
                executeQuery(getStockInfoQuery(wikidataId)),
                executeQuery(getBrandsQuery(wikidataId)),
                executeQuery(getFinancialHistoryQuery(wikidataId))
            ]);

            const mergedData = mergeResults({
                core: coreInfo,
                people: peopleInfo,
                corporate: corporateInfo,
                social: socialInfo,
                stock: stockInfo,
                brands: brandsInfo,
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

        ['core', 'people', 'corporate', 'social', 'stock', 'brands'].forEach(key => {
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

        let fullUrl;
        const headers = { 'Accept': 'application/sparql-results+json' };

        if (USE_PROXY) {
            const endpointUrl = 'http://localhost:3000/wikidata-sparql';
            fullUrl = `${endpointUrl}?query=${encodeURIComponent(sparqlQuery)}`;
        } else {
            // Direct Wikidata SPARQL endpoint
            const endpointUrl = 'https://query.wikidata.org/sparql';
            fullUrl = `${endpointUrl}?query=${encodeURIComponent(sparqlQuery)}`;
            headers['User-Agent'] = 'WikidataInspector/1.0';
        }

        const response = await fetch(fullUrl, { headers });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`SPARQL query failed: ${response.statusText} - ${errorText}`);
        }
        return await response.json();
    }

    // --- Query Definitions ---
    function getCoreInfoQuery(wikidataId) {
        return `SELECT ?WIKIDATA
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
            WHERE {
                VALUES ?WIKIDATA { wd:${wikidataId} }
                ?WIKIDATA rdfs:label ?COMPANY_label. FILTER(LANG(?COMPANY_label) = "en")

                OPTIONAL {?WIKIDATA schema:description ?description. FILTER(LANG(?description) = "en")}
                OPTIONAL {
                    ?WIKIDATA wdt:P17 ?COUNTRY.
                    ?COUNTRY rdfs:label ?COUNTRY_label. FILTER(LANG(?COUNTRY_label) = "en")
                }
                OPTIONAL {?WIKIDATA wdt:P571 ?inception_date.}
                OPTIONAL {?wikipedia_url schema:about ?WIKIDATA; schema:inLanguage "en"; schema:isPartOf <https://en.wikipedia.org/>.}
                OPTIONAL {?WIKIDATA wdt:P452 ?SECTOR. ?SECTOR rdfs:label ?SECTOR_label. FILTER(LANG(?SECTOR_label) = "en")}
                OPTIONAL {?WIKIDATA wdt:P159 ?HEADQUARTERS. ?HEADQUARTERS rdfs:label ?HEADQUARTERS_label. FILTER(LANG(?HEADQUARTERS_label) = "en")}
                OPTIONAL {?WIKIDATA wdt:P1454 ?legal_form. ?legal_form rdfs:label ?legal_form_label. FILTER(LANG(?legal_form_label) = "en")}
                OPTIONAL {?WIKIDATA wdt:P112 ?founder. ?founder rdfs:label ?founder_label. FILTER(LANG(?founder_label) = "en")}
                OPTIONAL {?WIKIDATA wdt:P138 ?named_after. ?named_after rdfs:label ?named_after_label. FILTER(LANG(?named_after_label) = "en")}
                OPTIONAL {?WIKIDATA wdt:P1451 ?slogan. FILTER(LANG(?slogan) = "en")}
                OPTIONAL {?WIKIDATA wdt:P1128 ?employees_count.}
                OPTIONAL {?WIKIDATA wdt:P1365 ?replaces. ?replaces rdfs:label ?replaces_label. FILTER(LANG(?replaces_label) = "en")}
                OPTIONAL {?WIKIDATA wdt:P1366 ?replaced_by. ?replaced_by rdfs:label ?replaced_by_label. FILTER(LANG(?replaced_by_label) = "en")}
                OPTIONAL {?WIKIDATA wdt:P1278 ?lei.}
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
    function getSocialQuery(wikidataId) {
        return `SELECT
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
            WHERE {
            VALUES ?WIKIDATA { wd:${wikidataId} }
            OPTIONAL {?WIKIDATA wdt:P856 ?official_website.}
            OPTIONAL {?WIKIDATA wdt:P154 ?logo_image.}
            OPTIONAL {?WIKIDATA wdt:P2002 ?twitter_username.}
            OPTIONAL {?WIKIDATA wdt:P4264 ?linkedin_id.}
            OPTIONAL {?WIKIDATA wdt:P2013 ?facebook_id.}
            OPTIONAL {?WIKIDATA wdt:P2003 ?instagram_username.}
            OPTIONAL {?WIKIDATA wdt:P2397 ?youtube_channel.}
            OPTIONAL {?WIKIDATA wdt:P2037 ?github_username.}
            OPTIONAL {?WIKIDATA wdt:P2088 ?crunchbase_profile.}
            OPTIONAL {?WIKIDATA wdt:P3052 ?bloomberg_id.}
            OPTIONAL {?WIKIDATA wdt:P1320 ?opencorporates_id.}
        } GROUP BY ?WIKIDATA`;
    }

    function getStockInfoQuery(wikidataId) {
        return `SELECT
            (GROUP_CONCAT(DISTINCT ?stock_exchange_label; separator=", ") AS ?STOCK_EXCHANGES)
            (GROUP_CONCAT(DISTINCT ?ticker_symbol; separator=", ") AS ?TICKER_SYMBOLS)
            (GROUP_CONCAT(DISTINCT ?isin; separator=", ") AS ?ISIN_CODES)
            (SAMPLE(?sec_cik) AS ?SEC_CIK_NUMBER)
            (SAMPLE(?swift_bic) AS ?SWIFT_BIC_CODE)
            WHERE {
            VALUES ?WIKIDATA { wd:${wikidataId} }
            OPTIONAL {?WIKIDATA wdt:P414 ?stock_exchange. ?stock_exchange rdfs:label ?stock_exchange_label. FILTER(LANG(?stock_exchange_label) = "en")}
            OPTIONAL {?WIKIDATA wdt:P249 ?ticker_symbol.}
            OPTIONAL {?WIKIDATA wdt:P946 ?isin.}
            OPTIONAL {?WIKIDATA wdt:P5531 ?sec_cik.}
            OPTIONAL {?WIKIDATA wdt:P2627 ?swift_bic.}
        } GROUP BY ?WIKIDATA`;
    }

    function getFinancialHistoryQuery(wikidataId) {
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
            } UNION {
              ?WIKIDATA p:P3362 ?statement. BIND("Operating Income" AS ?metric_label)
              ?statement ps:P3362 ?value.
              OPTIONAL { ?statement pq:P585 ?date. }
            } UNION {
              ?WIKIDATA p:P2403 ?statement. BIND("Total Assets" AS ?metric_label)
              ?statement ps:P2403 ?value.
              OPTIONAL { ?statement pq:P585 ?date. }
            } UNION {
              ?WIKIDATA p:P2137 ?statement. BIND("Total Equity" AS ?metric_label)
              ?statement ps:P2137 ?value.
              OPTIONAL { ?statement pq:P585 ?date. }
            } UNION {
              ?WIKIDATA p:P2138 ?statement. BIND("Total Liabilities" AS ?metric_label)
              ?statement ps:P2138 ?value.
              OPTIONAL { ?statement pq:P585 ?date. }
            } UNION {
              ?WIKIDATA p:P2133 ?statement. BIND("Total Debt" AS ?metric_label)
              ?statement ps:P2133 ?value.
              OPTIONAL { ?statement pq:P585 ?date. }
            } UNION {
              ?WIKIDATA p:P1128 ?statement. BIND("Employees" AS ?metric_label)
              ?statement ps:P1128 ?value.
              OPTIONAL { ?statement pq:P585 ?date. }
            }
        } GROUP BY ?metric_label ?value ?date ORDER BY DESC(?date)`;
    }

    function getBrandsQuery(wikidataId) {
        return `SELECT
            (GROUP_CONCAT(DISTINCT ?brand_owned_label; separator=", ") AS ?BRANDS_OWNED)
            (GROUP_CONCAT(DISTINCT ?parent_brand_label; separator=", ") AS ?PARENT_BRANDS)
            WHERE {
            VALUES ?WIKIDATA { wd:${wikidataId} }
            OPTIONAL {?WIKIDATA wdt:P1830 ?brand_owned. ?brand_owned rdfs:label ?brand_owned_label. FILTER(LANG(?brand_owned_label) = "en")}
            OPTIONAL {?WIKIDATA wdt:P8345 ?parent_brand. ?parent_brand rdfs:label ?parent_brand_label. FILTER(LANG(?parent_brand_label) = "en")}
        } GROUP BY ?WIKIDATA`;
    }

    function renderResults(data, companyLabel) {
        const result = data.results.bindings[0];
        if (!result) { showError('No data found for this Wikidata ID.'); return; }

        // mainTitle.textContent = `${DEFAULT_TITLE}: ${companyLabel || (result.COMPANY_label ? result.COMPANY_label.value : '')}`; // This line caused the issue

        const table = document.createElement('table');
        table.className = 'table table-bordered table-striped';
        const tbody = document.createElement('tbody');
        
        const fieldOrder = [
            'COMPANY_label', 'DESCRIPTION', 'SECTORS', 'LEGAL_FORM', 'LEGAL_ENTITY_IDENTIFIER', 'FOUNDED_BY', 'NAMED_AFTER', 'SLOGAN',
            'WIKIPEDIA_URL', 'WIKIDATA', 'COUNTRY_label', 'HEADQUARTERS', 'INCEPTION_DATE',
            'EMPLOYEES_COUNT', 'REPLACES', 'REPLACED_BY',
            'CEOS_HISTORY', 'BOARD_MEMBERS', 'OWNERS_HISTORY',
            'STOCK_EXCHANGES', 'TICKER_SYMBOLS', 'ISIN_CODES', 'SEC_CIK_NUMBER', 'SWIFT_BIC_CODE',
            'FINANCIAL_HISTORY',
            'PARENT_ORGANIZATIONS', 'SUBSIDIARIES', 'PRODUCTS_SERVICES',
            'BRANDS_OWNED', 'PARENT_BRANDS',
            'OFFICIAL_WEBSITE', 'TWITTER_HANDLES', 'LINKEDIN_IDS', 'FACEBOOK_IDS',
            'INSTAGRAM_HANDLES', 'YOUTUBE_CHANNELS', 'GITHUB_USERNAMES',
            'CRUNCHBASE_PROFILE', 'BLOOMBERG_ID', 'OPENCORPORATES_ID', 'LOGO_IMAGE'
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
                            acc[year] = {
                                year: year,
                                'Market Cap': 'N/A',
                                'Total Revenue': 'N/A',
                                'Net Income': 'N/A',
                                'Operating Income': 'N/A',
                                'Total Assets': 'N/A',
                                'Total Equity': 'N/A',
                                'Total Liabilities': 'N/A',
                                'Total Debt': 'N/A',
                                'Employees': 'N/A'
                            };
                        }
                        const metricLabel = item.metric_label.value;
                        let formattedVal;
                        if (metricLabel === 'Employees') {
                            formattedVal = parseInt(item.value.value).toLocaleString();
                        } else {
                            formattedVal = `${(parseFloat(item.value.value) / 1_000_000_000).toFixed(1)}B`;
                        }
                        acc[year][metricLabel] = formattedVal;
                        return acc;
                    }, {});

                    const sortedYears = Object.keys(yearlyData).sort((a, b) => parseInt(b) - parseInt(a));

                    const nestedTable = document.createElement('table');
                    nestedTable.className = 'table table-sm table-bordered mb-0';
                    nestedTable.innerHTML = `<thead><tr>
                        <th>Year</th>
                        <th>Market Cap</th>
                        <th>Total Revenue</th>
                        <th>Operating Income</th>
                        <th>Net Income</th>
                        <th>Total Assets</th>
                        <th>Total Equity</th>
                        <th>Total Liabilities</th>
                        <th>Total Debt</th>
                        <th>Employees</th>
                    </tr></thead>`;
                    const nestedTbody = document.createElement('tbody');

                    sortedYears.forEach(year => {
                        const rowData = yearlyData[year];
                        nestedTbody.innerHTML += `<tr>
                            <td>${rowData.year}</td>
                            <td>${rowData['Market Cap']}</td>
                            <td>${rowData['Total Revenue']}</td>
                            <td>${rowData['Operating Income']}</td>
                            <td>${rowData['Net Income']}</td>
                            <td>${rowData['Total Assets']}</td>
                            <td>${rowData['Total Equity']}</td>
                            <td>${rowData['Total Liabilities']}</td>
                            <td>${rowData['Total Debt']}</td>
                            <td>${rowData['Employees']}</td>
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