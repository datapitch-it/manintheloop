# AI Instructions for Manintheloop Project

## 1. Fonte della Verità (Source of Truth)
- La fonte dati primaria (Master Data) è il file **Google Sheet** (o la sua esportazione `data/companies.csv`).
- Il file `data/companies.json` è un **artefatto derivato**. Non deve MAI essere modificato manualmente per cambiare nomi o aggiungere aziende.
- Le modifiche all'anagrafica (nuove aziende, correzioni nomi) devono arrivare dal CSV.

## 2. Flusso di Lavoro (Workflow)
Per aggiornare i dati, segui RIGOROSAMENTE questa procedura:
1.  **Input:** Leggi `data/companies.csv` (nuovi dati) e `data/companies.json` (dati esistenti/arricchiti).
2.  **Merge & Validate:**
    - Itera sulle righe del CSV.
    - Se l'azienda ha già un ID Wikidata valido nel JSON esistente, **MANTIENILO** (non rischiare nuove query errate).
    - Se l'azienda NON ha un ID Wikidata (o è una nuova entry), esegui lo script di ricerca (es. `scripts/enrich_data.py`).
3.  **Output:** Salva il risultato in `data/companies.json`.

## 3. Regole di Sicurezza
- **Nessuna "Guess":** Se c'è un dubbio su un ID (es. discrepanza nome), logga l'errore ma non sovrascrivere dati esistenti validati.
- **Validazione:** Dopo ogni aggiornamento, esegui `scripts/verify_data_integrity.py` per assicurarti che non ci siano disallineamenti (es. Label "Amazon" con ID di "Meta").

## 4. Script Disponibili
- `scripts/verify_data_integrity.py`: Controlla che gli ID nel JSON corrispondano ai Label su Wikidata.
- `scripts/extract_company_data.py`: Estrae dati dettagliati da Wikidata per un singolo ID.
- `scripts/sync_anagrafica.py` (To be created): Script master per la sincronizzazione CSV -> JSON.
