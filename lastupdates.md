# Last Updates - Wikidata Inspector

### 1. Nuova Gestione dei Dati
*   **Sorgente Remota**: Il progetto ora utilizza come "fonte della verità" il CSV pubblicato via Google Sheets (gid=766453961).
*   **Mirror Locale (`data/companies.csv`)**: Viene scaricato e aggiornato localmente durante l'arricchimento.
*   **Dataset App (`data/companies.json`)**: Espanso a **111 aziende** verificate (rispetto alle 55 iniziali).

### 2. Script di Arricchimento (`enrich_data.py`)
Creato uno script per il recupero e la validazione degli ID Wikidata mancanti:
*   **Validazione Semantica**: Verifica tramite API Wikidata che l'entità sia un'**istanza di azienda** (proprietà `P31` = *business enterprise*, *public company*, ecc.).
*   **Anti-Falsi Positivi**: Previene l'associazione errata di nomi aziendali a nazioni (es. Cecoslovacchia), persone o frutti (es. Apple).
*   **Gestione Casi Speciali**: Inserita mappatura manuale per entità ambigue (es. *Czechoslovak Group* -> `Q27350567`).

### 3. Aggiornamento Backend Proxy (`proxy.js`)
*   **CORS Dinamico**: Il proxy accetta ora richieste da qualsiasi porta su `localhost`, eliminando i blocchi durante lo sviluppo locale.
*   **Logging**: Migliorata la diagnostica degli errori (500, Rate Limiting) con log dettagliati nel terminale.

### 4. Workflow di Aggiornamento
Il nuovo comando per sincronizzare e arricchire i dati dal cloud è:
```bash
python3 enrich_data.py
```
Questo automatizza il ciclo: **Download → Ricerca ID → Verifica "Instance of" → Generazione JSON.**

### 5. Correzione Allineamento Dataset
Risolto un problema di "scivolamento" degli ID Wikidata nel dataset originale, ripristinando la corretta associazione tra nomi delle aziende e i rispettivi codici (es. correzione per Nvidia, Microsoft, Apple).
