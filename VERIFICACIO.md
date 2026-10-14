# Verificació del MVP

Comprovacions del 13/10/2026. Entorn: Windows, Node.js 24.19, Python 3.13, Microsoft Edge amb Playwright. És una verificació funcional local; no acredita un desplegament públic ni una revisió jurídica del corpus.

## Dades carregades

| Conjunt | Resultat |
|---|---:|
| PSCP, observacions i lots del període | 580 |
| RPC, observacions del període | 668 |
| Fites d’execució contractual | 121 |
| Files pressupostàries any/tipus/capítol | 90 |
| Sessions municipals | 270 |
| Plens al catàleg | 59 |
| Juntes de govern, només metadades | 211 |
| Plens amb algun punt indexat | 51 |
| Punts d’ordre del dia indexats | 466 |

La captura íntegra dels datasets d’origen retorna 698 PSCP, 791 RPC, 128 fites, 3.847 files de pressupost detallat i 252 de liquidació per capítols. L’adaptador aplica període, ens i nivell. Els índexs de sessions s’han contrastat amb la unió de cinc consultes anuals. Els punts exclosos o no interpretats no s’inventen.

Una segona ingestió completa amb el mateix lector ha retornat **0 canvis materials**. Les dades publicables pesen aproximadament 984 kB sense compressió, per la qual cosa en aquest MVP es carreguen en un sol catàleg; es pot fragmentar per anys quan el volum ho requereixi.

## Proves superades

- **Sis proves de Python:** imports i dates, privacitat bàsica, truncament de respostes, jerarquia pressupostària, delimitació d’ordre del dia, publicació/versionat/idempotència i conciliació de la mostra comptable. Algunes proves cobreixen més d’un control.
- **Verificació de la captura completa:** identitat i traçabilitat, cas `CONT2400054`, dues publicacions idèntiques sense versions duplicades, conservació del catàleg en registrar una fallada i absència de fitxers pendents dins de la carpeta pública.
- **Cinc escenaris de navegador:** cerca exacta i cronologia amb teclat; CSV equivalent als filtres; dossier amb font, nota i revisió, persistència i restauració JSON; pressupost reconciliat i sis pantalles mòbils sense desbordament de la pàgina; avís de captura fallida amb dades anteriors consultables.
- **Construcció de producció:** TypeScript i Vite correctes. Inspecció visual d’escriptori, pressupost, dossier i mòbil. El build avisa que omet directives `use client` de la biblioteca d’icones; aquesta aplicació és tota de navegador i el comportament comprovat és correcte.
- **Paquet estàtic dist:** HTTP 200, cap error JavaScript i cap petició externa durant càrrega, cerca i obertura de fitxa. Cerca del cas de prova en **195 ms** en l’execució local mesurada, un cop carregada l’aplicació. No és una garantia per a qualsevol dispositiu.
- **Paquet publicable:** inclou `_headers`, assets i dades; no inclou SQLite, fitxers Python, fitxers pendents, `.env` ni dossiers del navegador.

El selector d’una prova es va ajustar en ampliar la cobertura real: hi ha més d’una sessió amb un punt 6 sobre el mateix expedient. La prova comprova explícitament la sessió del 31/03/2026.

## Conciliació comptable

Mostra de despeses a 31/12/2024, contrastada amb [estat d’execució municipal per trimestres de 2024](https://seu.castellarvalles.cat/arxius/document/10016/arxiu/estat_dexecucio_per_trimestres_2024.pdf):

| Capítol | Inicial | Definitiu | Obligacions reconegudes |
|---|---:|---:|---:|
| 1. Personal | 12.212.777,75 € | 12.653.822,61 € | 11.970.386,53 € |
| 2. Béns i serveis | 13.705.636,33 € | 13.845.830,14 € | 11.522.822,62 € |
| 3. Despeses financeres | 78.282,00 € | 78.282,00 € | 54.413,01 € |
| 4. Transferències corrents | 1.525.743,92 € | 1.618.548,51 € | 1.415.862,59 € |

Els imports coincideixen al cèntim. Els capítols no informats a l’API no s’han omplert amb zeros: el total general queda no calculable quan manca algun capítol. Aquesta mostra no és una auditoria completa de totes les anualitats.

## Límits explícits

No hi ha desplegament públic ni planificador activat. La prova de producció s’ha fet amb `vite preview`, no en un compte de Netlify. No s’ha extret tot el text de PDFs o vídeos ni es versionen tots els binaris originals. Els hashes de SQLite corresponen a registres i punts normalitzats. Les relacions entre fonts es basen en el codi exacte; no acrediten per si soles un acord.

La privacitat aplica minimització de camps, exclusió de NIF i filtre preventiu de textos; no garanteix que tot text públic d’origen estigui anonimitzat. Abans d’una publicació oberta cal revisar corpus, responsable i condicions. Els dossiers són locals, sense sincronització; exportar-los continua sent necessari.

## Evidències guardades

- `docs/prova-produccio.json`: resultat de la prova sobre el paquet estàtic.
- `docs/captures/`: captures d’escriptori, pressupost, expedient, dossier i mòbil.
- `tests/test_ingest.py`, `tests/browser/app.spec.ts`, `scripts/verify-snapshot.py`: comprovacions reproduïbles.
- `public/data/status.json`: estat correcte després de verificar la publicació final idempotent.

## Preparació de GitHub Pages · 14/10/2026

- Flux `.github/workflows/pages.yml`: publicació amb canvis a `main`, captura diària a les 04.23 UTC i execució manual. Guarda només els JSON publicables; l’historial remot és Git i la base SQLite local no es puja.
- Compilació de producció correcta amb `npm run build -- --base /eina-castellar/`.
- Vuit proves Python superades: les sis anteriors i dues de conservació del catàleg davant una captura interrompuda o sense dades prèvies.
- Dues proves de navegador superades a Microsoft Edge amb `playwright.pages.config.ts`: càrrega del paquet sota `/eina-castellar/`, recursos sense errors HTTP, recàrrega de la secció de contractes i avís d’error amb dades consultables.
- Les proves Python han utilitzat una carpeta temporal dins de `dades/staging`, perquè l’aïllament de Windows bloquejava la carpeta temporal habitual. La prova de navegador s’ha executat fora de l’aïllament per permetre iniciar el servidor local i Edge.
- No s’ha executat el flux en servidors de GitHub ni publicat el web. Cal completar els passos de `GUIA-GITHUB.md`; la connexió a les fonts des de GitHub i els permisos del compte es confirmaran en la primera execució remota.
