# AI Instructions for Manintheloop Project

## 1. Fonte della Verità (Source of Truth)
- La fonte dati primaria è il Google Sheet accessibile via CSV qui:
  `https://docs.google.com/spreadsheets/d/e/2PACX-1vSg4v9OkP8ZAmUQ_AOukHt8-_jjoiZR62_aeIvay9SqLv6GVxgnZbzT9hckXN0lq8WyHcxZ3smmGvsI/pub?gid=766453961&single=true&output=csv`
- Il file locale `data/companies.csv` deve essere una copia aggiornata di questo URL.
- Il file `data/companies.json` è un **artefatto derivato** e protetto.

## 2. Flusso di Lavoro (Workflow Operativo)
Quando avviato, l'agente AI deve seguire questa sequenza:

1.  **Fetch:** Scaricare i dati più recenti dall'URL dello Sheet e salvarli in `data/companies.csv`.
2.  **Check Uniqueness:** Eseguire la sincronizzazione assicurandosi che ogni azienda sia presente una sola volta nel JSON (identificata univocamente dal suo Wikidata ID).
3.  **Store & Merge:** Aggiornare `data/companies.json` mantenendo gli ID Wikidata già validati e aggiungendo le nuove entry provenienti dal CSV.
4.  **Enrichment (Wikidata ID):** Per le aziende che NON hanno un ID nel CSV o nel JSON, eseguire la ricerca automatica su Wikidata.
5.  **Enrichment (Country):** Recuperare la nazione ufficiale da Wikidata per tutte le aziende (standardizzazione).
6.  **Alphabetical Sort:** Salvare il JSON finale ordinato per `label` A-Z.

## 3. Regole di Sicurezza e Integrità
- **Protezione ID:** Non sovrascrivere MAI un ID Wikidata esistente nel JSON con uno nuovo cercato automaticamente, a meno di esplicita correzione nel CSV.
- **Validazione Incrociata:** Se un'azienda ha un nome nel CSV molto diverso dal Label trovato su Wikidata per l'ID associato, segnalare l'anomalia.
- **Output per la App:** Il JSON risultante deve essere pronto per le query SPARQL eseguite da `index.html`.

## 4. Script da Utilizzare
- `python3 scripts/sync_anagrafica.py`: Esegue fetch (opzionale), merge, check unicità, arricchimento nazioni e sort.
- `python3 scripts/verify_data_integrity.py`: Verifica che gli ID nel JSON corrispondano effettivamente alle aziende indicate.
- `python3 scripts/extract_company_data.py`: Test di estrazione SPARQL per singola azienda.
