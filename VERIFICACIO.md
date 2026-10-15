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

## Publicació a GitHub Pages · 14/10/2026

- Repositori públic: https://github.com/danipsi/eina-castellar. Web: https://danipsi.github.io/eina-castellar/.
- Execució https://github.com/danipsi/eina-castellar/actions/runs/38536588603: compilació, proves Python i desplegament finalitzats correctament sobre el commit `2b3f677`.
- Web i catàleg amb resposta HTTP 200; SHA-256 del catàleg remot idèntic al local validat. Cerca `CONT2400054` comprovada al web públic.
- La captura publicada és la del 13/10/2026. La programació diària està configurada; la consulta de fonts des dels servidors de GitHub encara no s’ha executat. Aquest resultat actualitza l’estat pendent descrit als apartats històrics anteriors.

## Millores de consulta · 14/10/2026

Implementació i verificació locals; aquest apartat no acredita una nova publicació al web públic.

- Cerca exacta: el cas `CONT2400054` retorna 4 registres contractuals i 3 sessions de la captura actual. Les aproximacions són opcionals i s’identifiquen separadament. Un codi inexistent no retorna expedients semblants com si fossin coincidències exactes.
- Dates futures: el registre de 09/12/2026 no encapçala la portada ni entra al filtre ordinari. Es pot consultar amb el selector de dates, conserva el valor original i l’exportació inclou l’avís.
- Enllaços: filtres, ordenació, pàgina, cerca, comparació i fitxes es restauren en recarregar o en un altre navegador. Les fitxes retirades tenen estat de no disponibilitat. Comprovats Enrere/Endavant i el mecanisme alternatiu quan el navegador denega copiar al portapapers.
- Comparació anual: taula d’inicial/definitiu/liquidat amb diferències en euros i percentatges, fonts per exercici i exportació CSV. Exemple verificat: personal liquidat 2024–2025, +652.559,34 € i 5,5 %. Un capítol absent impedeix calcular el total; amb base zero no es calcula el percentatge.
- Canvis: cada alta o modificació posterior a la primera captura té registre consultable. Imports i camps estructurats segurs disposen d’abans/després; els textos no es reprodueixen a l’historial. Retirades només agregades. El detall de la UI s’ha verificat amb dades de prova interceptades al navegador, sense alterar els JSON reals. La captura existent manté el recompte antic fins a una nova captura amb canvis materials.
- 12 proves Python superades (capturador i estat de Pages), executades amb el Python del runtime i temporals dins `dades/staging`.
- 11 proves de navegador superades a Edge, incloent persistència/importació de dossiers, CSV, comparació, novetats i mòbil sense desbordament.
- Compilació final amb base `/eina-castellar/` i 2 proves de producció superades, incloent recàrrega d’una fitxa amb enllaç directe i comparació pressupostària.
- Inspecció visual de la comparació integrada en el disseny existent. Captura: `docs/captures/comparacio-anual.png`.

No s’han actualitzat les dades municipals, reconstruït diferències històriques ni afegit subvencions, empreses, nous indicadors o un servei de notificacions. El lot públic de canvis és l’últim lot material, no un historial acumulatiu. Les versions privades de SQLite i l’historial de Git mantenen els límits de retirada ja documentats.

## Correccions de la revisió · 15/10/2026

Implementació local de les sis correccions i les dues millores de manteniment. No s’ha modificat la captura municipal ni publicat aquesta versió.

- **Dossiers entre pestanyes:** comprovació de versió i escriptura dins de la mateixa transacció IndexedDB. Una còpia antiga no pot sobreescriure notes, eliminar canvis nous ni recrear un dossier eliminat. El conflicte actualitza la llista i conserva l’esborrany per revisar-lo i tornar a desar. Els dossiers anteriors sense camp de versió continuen editables.
- **Accés independent:** consulta i còpia JSON disponibles tant amb error HTTP del catàleg com amb una resposta pendent.
- **Esborranys:** text i tipus per dossier a la sessió de la pestanya; persisteixen entre seccions, dossiers i recàrregues. Avís abans de sortir amb text pendent. Si sessionStorage falla, es conserva el text en memòria i s’explica el límit. Un desament endarrerit no elimina esborranys posteriors. Els esborranys de dossiers eliminats es poden copiar o descartar amb confirmació.
- **Pressupostos:** els totals exigeixen els nou capítols únics d’un mateix any i costat, amb tots els imports informats. El capturador rebutja la manca de qualsevol capítol inicial; les liquidacions absents continuen sent `null`, no zero.
- **CSV:** els nombres negatius i decimals catalans validats conserven el valor numèric; les cadenes amb fórmules continuen neutralitzades.
- **Llegibilitat:** textos secundaris i etiquetes de les targetes de portada a 12 px, amb contrast mínim 4,5:1 verificat. Captura mòbil revisada sense desbordament.
- **Període:** configuració compartida Python/TypeScript a `config/period.json`, amb validació d’anys, filtres, consultes de sessions i etiquetes. Es manté 2022–2026 i liquidacions fins al 2025.
- **Publicació:** GitHub Actions instal·la Chromium, comprova els fluxos abans de capturar i prova el paquet de producció amb la seva base URL abans de publicar. Els passos de publicació no s’executen si les proves fallen. L’execució remota d’aquest flux modificat continua pendent.

Verificació executada: 16 proves Python, 22 escenaris de navegador i 2 de producció superats a Windows/Edge. La suite de navegador completa tenia 21 escenaris; després d’afegir el cas de desament endarrerit es van repetir els 8 del bloc de dossiers, i després el cas de descart d’esborranys recuperats. Compilació TypeScript/Vite correcta; es mantenen els avisos ja coneguts de `use client` de la biblioteca d’icones. `git diff --check` correcte. Proves noves a `tests/browser/dossiers-safety.spec.ts`, `tests/browser/data-integrity.spec.ts` i `tests/test_ingest.py`; dades fictícies per als casos de concurrència i pèrdua d’esborranys.

## Eines de seguiment · 15/10/2026

Implementació local; no s’ha publicat ni modificat la captura.

- **Inversions:** sèrie del capítol 6 de despeses per exercici. Execució = obligacions reconegudes / crèdit definitiu; l’exercici sense liquidació apareix com a no calculable. Amb la captura del 13/10/2026: 35,6 % (2022), 59,3 % (2023), 29,1 % (2024) i 41,7 % (2025). La prova compara cada percentatge amb el catàleg.
- **Preguntes formals:** plantilles de sol·licitud d’informació (art. 77 LBRL i art. 164 TRLMRLC), pregunta al Ple i prec. Les hipòtesis i les notes descartades no s’hi inclouen per defecte. Les peticions formen part del dossier local i la importació en valida tipus, estat, data i registre.
- **RSS:** `ple.xml` es genera en compilar (i en el servidor de desenvolupament) a partir de `public/data/catalog.json`. El flux de Pages hi passa l’adreça del web com a `SITE_URL`.

Verificació executada: 25 escenaris de navegador (3 de nous a `tests/browser/seguiment.spec.ts`) i 2 de producció, aquests amb comprovació del canal sota la base del repositori. TypeScript i Vite correctes. Captures revisades d’escriptori i mòbil.

## Seguiment de mocions · 15/10/2026

- **Extracció:** `src/motionData.ts` reconeix als punts dels plens les fórmules «Moció presentada/formulada pel grup municipal…». El nom del grup acaba en la fórmula del títol, en un signe o en una preposició seguida de minúscula; el títol és el text que segueix «porta per títol», «té per títol» o «amb el títol». S’exclouen «Proposicions i mocions sobrevingudes» i les juntes de govern. Les anotacions «sobre la taula» i «retirat de l’ordre del dia» es mostren com a indicació, no com a estat.
- **Duplicats i variants:** les aparicions amb el mateix títol normalitzat i el mateix grup formen una sola moció. Les variants de nom es fusionen quan, sense accents ni signes, una és el començament de l’altra; la resta les uneix l’usuari. Amb la captura del 15/10/2026: 107 punts, 100 mocions i 7 grups abans d’unions manuals.
- **Enllaços:** cada moció té un identificador estable (títol normalitzat i grups) que permet obrir-la des de la fitxa de la sessió i des del resum de la portada (`#motions?motion=…`).
- **Dades locals:** marques i unions a `localStorage` (`observatori.mocions.v1`). La importació valida identificadors, estats, compliment, notes i unions, i fusiona per data de modificació.

Verificació executada: 27 escenaris de navegador (2 de nous a `tests/browser/mocions.spec.ts`, amb grups i mocions inventats) i 2 de producció. TypeScript i Vite correctes. Captures revisades d’escriptori i mòbil.

## Patrons en contractes menors · 15/10/2026

- **Captura:** `scripts/ingest.py` afegeix `cpv` als contractes de les dues fonts (`codi_cpv`). Quan la PSCP en dona diversos separats per «||», es conserva el primer (principal). Un camp nou de l’esquema no genera canvis: el registre de canvis només compara camps presents a les dues versions. Captura del 15/10/2026: CPV a 528 de 581 registres PSCP i a 654 de 668 del RPC; 2 registres nous.
- **Selecció:** `src/minorData.ts` considera contractes menors els de procediment «menor» d’obres, serveis o subministraments; concessions i administratius especials en queden fora perquè no tenen aquest llindar. Llindars de l’article 118.1 de la LCSP, sense IVA, comparats amb l’import d’adjudicació.
- **Duplicats:** la PSCP publica alguns contractes dues vegades (adjudicació i publicació agregada). Els registres amb el mateix expedient i import compten una sola vegada, preferint el que té adjudicatari visible. Captura del 15/10/2026, PSCP: 289 registres, 14 repetits, 275 contractes menors, 51 entre el 90 i el 100 % del llindar i cap igual o per sobre.
- **Grups:** dos o més contractes del mateix exercici d’adjudicació i tipus de llindar que, sumats, hi arriben; per adjudicatari (només formes societàries explícites) o per prefix del CPV (3, 4, 5 o 8 xifres; 4 per defecte). No s’hi infereix cap fraccionament.

Verificació executada: 29 escenaris de navegador (2 de nous a `tests/browser/contractes-menors.spec.ts`, amb contractes inventats) i 2 de producció; 2 proves noves de la captura (CPV i camp nou sense canvis). TypeScript i Vite correctes. Captures revisades d’escriptori i mòbil.

## Venciments i pròrrogues · 15/10/2026

- **Captura:** `scripts/ingest.py` afegeix `formalizedDate`, `termStart`, `termEnd` i `duration` (ISO 8601, p. ex. `P2Y`). La PSCP publica la durada en text lliure: «dd/mm/aaaa a dd/mm/aaaa» dona inici i fi; «N anys/mesos/dies» dona la durada; qualsevol altre text queda buit, sense deduccions. El RPC informa anys, mesos i dies; una durada de zero queda buida. Captura del 15/10/2026, contractes no menors: PSCP 284 (154 amb data de fi, 59 només amb durada, 71 sense), RPC 283 (282 amb durada).
- **Fi del termini inicial:** `src/termData.ts` usa la data de fi publicada; si no n’hi ha, inici + durada − 1 dia, des de la formalització o, si manca, des de l’adjudicació. Els mesos no desborden (31 de gener + 1 mes = final de febrer). Un expedient i lot compta una vegada per font, amb preferència per la data publicada. Els contractes menors en queden fora (art. 29.8 LCSP: no es poden prorrogar).
- **Pròrrogues:** fites d’execució de la PSCP de tipus «Pròrroga», agrupades per expedient i lot (el lot «0» equival a sense lot); la mateixa data i títol compten una vegada. «Extraordinària» es detecta pel títol. Captura del 15/10/2026: 94 fites, 64 expedients i lots, 29 amb dues o més, 1 extraordinària.
- **Referència temporal:** la data d’avui a Europa/Madrid, com la resta de l’eina.

Verificació executada: 31 escenaris de navegador (2 de nous a `tests/browser/venciments.spec.ts`, amb contractes, fites i data inventats) i 2 de producció; 1 prova nova de la captura (lectura de durades). TypeScript i Vite correctes. Captures revisades d’escriptori i mòbil.

## Proveïdors i facturació · 15/10/2026

- **Captura:** `scripts/ingest.py` llegeix el registre de factures (28.552 files, 2019–2026) i la relació anual de proveïdors (5.558 files) del CKAN de l’AOC, i en publica només els exercicis del període. La relació de proveïdors és la suma de les factures per emissor i exercici: els totals quadren al cèntim i, si no quadressin, la font es marca com a parcial.
- **Privacitat:** el tipus d’emissor es dedueix de la lletra inicial del NIF de la relació de proveïdors, que no es publica. Només surten amb nom les societats (A, B), cooperatives (F), UTE (U), entitats (G, R), administracions (P, Q, S) i altres persones jurídiques (N, V, W). Persones físiques (NIF emmascarat), societats civils i comunitats de béns (que poden dur noms de persones) i noms sense tipus clar s’agreguen en una fila anual sense nom. Captura del 15/10/2026: 2.578 files amb nom i 5 sense; el 2025, 577 emissors amb nom (97 % de l’import) i 182 sense.
- **Patró:** emissor amb nom, que no és una administració, amb facturació anual ≥ 18.150 € i cap contracte del catàleg (qualsevol exercici i font) amb el mateix nom normalitzat (`src/supplierData.ts`). El 2025: 74 emissors per sobre del llindar, 20 sense contracte trobat. Es mostra sempre com «no s’ha trobat contracte amb aquest nom».
- **Dates:** les dates de factura a més d’un any de l’exercici (n’hi ha del 1923) queden sense data; l’import es manté.

Verificació executada: 37 escenaris de navegador (3 de nous a `tests/browser/proveidors.spec.ts`, amb dades inventades) i 2 de producció; 2 proves noves de la captura (privacitat i conciliació; secció nova resumida com a captura inicial). TypeScript i Vite correctes. Captures revisades d’escriptori i mòbil, sense desplaçament horitzontal.

## Subvencions i convenis · 15/10/2026

- **Captura:** `scripts/ingest.py` llegeix del CKAN de l’AOC les concessions de subvencions de l’Ajuntament (rèplica MINHAP/BDNS, filtre `CODI_ENS=805170005`, 686 files del maig del 2022 al juliol del 2026, llicència cc-zero) i el catàleg municipal de convenis (283 convenis del 2015 al 2025; la fitxa no especifica llicència, per això només es reprodueixen metadades amb l’enllaç a l’original).
- **Files repetides:** 98 files de concessions són idèntiques a una altra (mateixa data, acord, beneficiari i import); 79 són la meitat exacta de la convocatòria d’entitats del 2022. Es compten una sola vegada i el registre conserva quantes se n’han apartat (`repeated`).
- **Privacitat:** el tipus de beneficiari es dedueix de la lletra del NIF, que no es publica. Persones físiques (NIF emmascarat), societats civils i comunitats de béns s’agreguen per acord i data sense nom. Captura del 15/10/2026: 574 registres (569 amb nom i 5 agregats) que sumen 588 concessions.
- **Procediment:** «amb convocatòria» si el títol de l’acord diu «convoca», «convoquen» o «convocatòria»; la resta, «sense convocatòria». El 2025: 1.471.411,92 € a 115 entitats amb nom, el 75 % sense convocatòria; 15 entitats tenen factures del mateix nom aquell exercici. Una primera versió només buscava «convoc» i classificava malament les convocatòries d’entitats del 2024 i el 2025 («es convoquen»): s’ha detectat revisant el resultat real i s’ha afegit a la prova.
- **Convenis:** les dates sentinella (1900) i les absents queden sense data i es marquen; una data de fi anterior a l’inici es conserva i es marca (13 casos). Patrons (`src/grantData.ts`), amb referència 15/10/2026: 126 dels 174 convenis «en curs» tenen la data de fi passada (51 no prorrogables), 8 vencen en 12 mesos i 38 tenen la vigència a revisar (en curs sense data de fi, data incoherent o durada superior a 4 anys, Llei 40/2015, art. 49 h).
- **Relacions:** subvenció ↔ conveni només quan el títol de l’acord cita el codi `CONV…` (10 concessions); entitat ↔ factures per nom normalitzat i exercici, com a «Proveïdors».

Verificació executada: 42 escenaris de navegador (5 de nous a `tests/browser/subvencions.spec.ts`, amb dades inventades) i 2 de producció; 23 proves de la captura (2 de noves: privacitat i files repetides de les concessions; vigència declarada dels convenis). TypeScript i Vite correctes. Captures revisades d’escriptori i mòbil amb el catàleg real generat, sense desplaçament horitzontal. El catàleg comprimit passa de 340 a 395 kB.
