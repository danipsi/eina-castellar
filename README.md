# Observatori de Castellar

MVP funcional d’exploració municipal, en català i amb estètica de tauler sobri. Construït el 13/10/2026. Consulta estàtica, cerca local i dossiers privats al navegador. Compatible amb Netlify i altres servidors estàtics.

**Per començar sense terminal:** doble clic a `Obre-observatori.cmd`. [Guia d’ús i publicació](./GUIA-D-US.md).

**Web públic:** [Observatori de Castellar](https://danipsi.github.io/eina-castellar/), publicat el 14/10/2026. [Repositori](https://github.com/danipsi/eina-castellar) · [Guia de GitHub Pages](./GUIA-GITHUB.md).

## Funcions

- Contractació PSCP/RPC separada, filtres compartibles, dates futures apartades per defecte i CSV equivalent als filtres amb adjudicatari publicable.
- Cerca exacta d’expedients amb aproximacions opcionals; cerca temàtica MiniSearch i fitxes compartibles amb lots, fonts i cronologia.
- Pressupostos 2022–2026 i liquidacions 2022–2025 per capítol econòmic, comparació anual d’inicial/definitiu/liquidat i exportació de diferències.
- Catàleg Ple/JGL i punts indexats dels plens amb filtre preventiu de privacitat.
- Execució de les inversions (capítol 6) per exercici, a la portada i a Pressupost, amb crèdit inicial, definitiu, liquidat i crèdit no executat.
- Seguiment de mocions del Ple: grup i títol extrets de l’ordre del dia, recompte per grup i any, temes recurrents, i estat de la votació, compliment i notes marcats a mà al navegador, amb exportació i importació JSON i CSV.
- Patrons a revisar en contractes menors: imports entre el 90 i el 100 % del llindar legal, diversos contractes del mateix adjudicatari o del mateix CPV en un exercici que sumats hi arriben, amb exportació CSV.
- Venciments i pròrrogues: calendari de la fi del termini inicial dels contractes no menors (data publicada o estimada a partir de la durada) i expedients amb pròrrogues encadenades o extraordinàries segons les fites d’execució de la PSCP, amb exportació CSV.
- Canal RSS `ple.xml` amb els 25 plens més recents i els punts indexats, generat en compilar a partir de la mateixa captura.
- Dossiers IndexedDB amb notes, preguntes, hipòtesis, estat de revisió, còpia JSON, Markdown i impressió. Generador de preguntes al Ple, precs i sol·licituds d’informació amb les notes i fonts del dossier, i seguiment de la presentació i la resposta. Intercanvi dins del grup per fitxer JSON (dossier o paquet amb tots els dossiers i el seguiment de mocions): vista prèvia, fusió element a element amb la versió més recent, eliminacions propagades i inicials de l’autor a cada nota. Control de versions entre pestanyes, esborranys per dossier i accés independent del catàleg públic.
- Fonts, cobertura, qualitat i detall dels registres nous o modificats del darrer lot de canvis entre captures. Els recomptes antics es mantenen sense inventar-ne detalls.

## Ordres

```powershell
npm ci
npm run dev -- --port 4173
npm run build
npm run preview -- --port 4174
```

`npm run build` genera **dist**, l’única carpeta que s’ha de publicar. `netlify.toml` configura ordre de build, Node.js 24, carpeta i capçaleres. No hi ha secrets ni consultes obligatòries a portals externs durant la consulta web. Les fonts tipogràfiques se serveixen localment.

```powershell
py -3.13 scripts/ingest.py
py -3.13 -m unittest discover -s tests -p test_ingest.py
npm test
npm run test:pages
```

Les proves de navegador utilitzen Microsoft Edge instal·lat i el port 4173. En un altre sistema es pot canviar `channel` a `playwright.config.ts` i instal·lar el navegador de Playwright. Simulació de fallada: `py -3.13 scripts/ingest.py --simulate-failure`; genera l’avís i conserva el catàleg. Una captura correcta elimina l’avís.

GitHub Actions instal·la Chromium i executa les proves de navegador abans de capturar dades, i les proves del paquet de producció abans de publicar-lo. Les comprovacions de producció utilitzen la mateixa base `PAGES_BASE` que la compilació. Una fallada de les proves impedeix el desplegament.

El període es configura una sola vegada a `config/period.json`: `startYear`, `endYear` i `latestLiquidationYear`. El capturador Python i la interfície comparteixen aquesta configuració validada. Els valors inicials són 2022, 2026 i 2025; no avancen automàticament amb el calendari. Després de canviar-los, cal completar una captura correcta i tornar a compilar abans de publicar. La captura exigeix els capítols pressupostaris inicials 1–9 per any i costat; si falten, es conserva la captura anterior. Els imports absents de liquidació continuen sent desconeguts.

## Estructura

| Ubicació | Contingut |
|---|---|
| `src/` | React, TypeScript, cerca, càlculs, dossiers i estils |
| `public/data/catalog.json` | Captura normalitzada publicable inclosa al build |
| `public/data/status.json` | Resultat de la darrera actualització |
| `scripts/ingest.py` | Adaptadors Python stdlib, validació i publicació atòmica |
| `dades/observatori.sqlite` | Versions normalitzades excloses del web i de Git |
| `dades/staging/` | Preparació privada; no entra al build |
| `tests/` | Proves de dades i fluxos de navegador |
| `GUIA-D-US.md` | Instruccions d’ús sense coneixements de programació |
| `VERIFICACIO.md` | Evidències i límits de la versió |

## Criteris que es preserven

No sumar PSCP i RPC; no sumar jerarquies pressupostàries; imports desconeguts diferents de zero; IVA explícit. Les dates futures s’avisen sense corregir-les per intuïció. Les mencions d’ordre del dia no són acords verificats. No s’exporten NIF personals ni es reconstrueixen identitats ocultes. Les notes personals no surten del navegador llevat d’exportació explícita.

La captura té paginació contrastada, reintents, validació territorial, bloqueig d’un únic escriptor i substitució atòmica. Un error conserva l’últim catàleg. SQLite guarda versions per hash del registre normalitzat, excloent la data de captura; una captura igual no genera versions ni novetats materials. Els documents originals es referencien: no s’arxiven ni es versionen tots els seus binaris.

Si Windows bloqueja una substitució, tanca la previsualització i repeteix l’actualització. Després d’una captura correcta cal recarregar el navegador; la vigilància de fitxers ignora les dades per evitar bloquejos.

Flux de GitHub Actions actiu a `.github/workflows/pages.yml`, amb captura diària programada a les 04.23 UTC, publicació a Pages i historial de captures JSON a Git. La primera publicació ha finalitzat correctament amb la captura inclosa del 13/10/2026; encara no s’ha verificat una captura nova des de GitHub. El filtre preventiu de textos no substitueix una revisió de privacitat. Consulta els límits detallats a la guia.

## Recerca de partida

Es conserven els documents de la fase prèvia sense reescriure’n les conclusions històriques:

1. [Estudi de viabilitat i especificació](./ESTUDI-DE-VIABILITAT.md).
2. [Mapa de 35 fonts o famílies de fonts](./MAPA-DE-FONTS.md).
3. [Evidència agregada de l’auditoria inicial](./recerca/auditoria-api.json).
4. [Script de la ronda base d’auditoria](./recerca/audita-fonts.ps1).

Factures/proveïdors, IA, OCR, col·laboració i notificacions externes queden fora d’aquest MVP.
