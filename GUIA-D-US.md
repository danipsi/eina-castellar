# Guia d’ús de l’Observatori de Castellar

## Obre l’eina

Fes doble clic a **Obre-observatori.cmd**. S’obrirà una finestra de terminal i el navegador. Mantén la finestra oberta mentre facis servir l’eina. Per aturar-la, tanca la finestra.

Adreça habitual: **http://127.0.0.1:4173/**. Si la previsualització ja està oberta, utilitza aquesta mateixa adreça; no cal iniciar-la una altra vegada. Els dossiers pertanyen a una adreça i un navegador concrets: exporta una còpia abans de canviar d’adreça.

La consulta funciona amb la captura inclosa; no cal actualitzar les dades per provar-la. Cal Node.js 24 per executar-la en local. La primera instal·lació de dependències necessita connexió a Internet.

## Prova el recorregut principal

1. A Visió general, prem **Explora un cas real**, o cerca `CONT2400054` al camp superior i prem Retorn.
2. Obre un resultat de la PSCP: veuràs els lots, els imports i les observacions de les altres fonts.
3. A Cronologia documentada, consulta el punt 6 del ple de **31/03/2026**. És una menció a l’ordre del dia, no una confirmació del resultat de la votació.
4. Prem **Afegeix al dossier**, crea un dossier i posa-hi un nom.
5. A Dossiers, afegeix una pregunta o nota. Les hipòtesis s’identifiquen explícitament i tenen estat de revisió.
6. Prem **Còpia JSON**. Aquest és el fitxer que permet restaurar fonts i notes amb **Importa còpia**. Markdown és per llegir o editar el dossier; Imprimeix permet desar-lo com a PDF des del navegador.

## Consulta i exporta dades

- **Contractació:** tria PSCP o RPC, any, procediment i text. El CSV inclou exactament les files filtrades, encara que la taula tingui diverses pàgines. Els imports desconeguts queden buits. No es barregen totals de les dues fonts.
- **Pressupost:** tria exercici i despeses o ingressos. Les barres tenen una taula equivalent amb imports exactes. «No informat» no és zero. La liquidació no és un registre de pagaments.
- **Sessions:** cerca dins dels punts indexats i obre acta/vídeo a la font original. Les juntes de govern només tenen catàleg i enllaç. No tots els punts dels plens s’indexen.
- **Fonts i qualitat:** consulta captura, cobertura, exclusions i canvis. Una data de captura recent no garanteix que l’editor hagi publicat tota l’activitat recent.
- **Ctrl+K:** porta el focus al cercador global. Esc tanca les fitxes.

## Conserva els dossiers

Els dossiers es desen a IndexedDB **només al navegador actual**. No se sincronitzen entre ordinadors, perfils, ports o dominis. Si es netegen les dades del navegador, es poden perdre. Descarrega periòdicament una còpia JSON i importa-la al navegador nou. La importació crea un dossier separat per evitar sobreescriure’n un d’existent.

Les notes personals no entren al paquet del web. No hi ha comptes ni un servidor de dossiers. Evita dades identificatives de persones i informació sensible a les notes i còpies.

## Actualitza la captura

Fes doble clic a **Actualitza-dades.cmd**. Necessita Python 3.13 i connexió a Internet. La captura pot trigar uns minuts perquè comprova els índexs de sessions i les APIs.

Si una font crítica falla o la resposta és incompleta, es manté el catàleg anterior i es mostra un avís d’actualització fallida. Per activar la captura diària al núvol, segueix la [guia de GitHub gratuït](./GUIA-GITHUB.md). El flux està preparat, pendent de pujar el projecte i activar Pages.

Les versions locals de registres publicables es conserven a `dades/observatori.sqlite`. No es desen HTML cru, transcripcions, NIF personals ni notes del navegador en aquesta base. La carpeta `dades` no entra a Netlify.

## Penja’l a Netlify

L’opció triada per automatitzar aquest projecte és [GitHub Pages + GitHub Actions](./GUIA-GITHUB.md). Els passos següents es conserven com a alternativa de publicació manual.

1. Fes doble clic a **Prepara-netlify.cmd**.
2. Obre [Netlify Drop](https://app.netlify.com/drop) amb el teu compte.
3. Arrossega-hi **només la carpeta dist** generada. També es lliura `observatori-netlify.zip` com a còpia del paquet construït en aquesta sessió.
4. Quan Netlify et doni l’adreça, prova la cerca `CONT2400054` i obre un original.
5. Importa la còpia JSON dels dossiers si vols treballar des del domini nou.

Per actualitzar el web: torna a capturar les dades, genera `dist` de nou i puja aquesta carpeta al mateix lloc de Netlify. El ZIP lliurat no s’actualitza sol. El cost dependrà del pla i l’ús; no s’ha creat cap compte ni contractat cap servei.

Alternativa amb repositori: configuració inclosa a `netlify.toml`, ordre `npm run build`, carpeta `dist`, Node.js 24. No cal servidor d’API, clau secreta ni cap variable d’entorn. Documentació de [Vite a Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/vite/).

Abans d’obrir-lo a tercers, concreta el responsable del web, les condicions de reutilització i revisa els fragments publicables. El filtre de privacitat és preventiu, no una auditoria jurídica ni una anonimització acreditada de tot el corpus.

## Límits d’aquesta versió

- La cerca cobreix registres i punts d’ordre del dia indexats. No cerca dins dels vídeos ni de tots els PDFs.
- El catàleg de sessions està contrastat amb els índexs anuals del portal; els punts tenen cobertura parcial per privacitat i estructura documental.
- Les relacions automàtiques són per codi exacte d’expedient. No es dedueixen relacions entre factures, proveïdors o persones.
- Es detecten canvis del contingut normalitzat dels registres i dels punts indexats. No es descarreguen ni es versionen els fitxers binaris de tots els documents originals.
- PSCP i RPC poden tenir dates, estats i cobertura diferents. Els imports compostos no interpretats es deixen sense import i s’avisa a la fitxa.
- Les retirades desapareixen del catàleg web nou. Una retirada per privacitat també requereix revisar les còpies locals de SQLite, els ZIP i les versions antigues de l’allotjament; no s’ha automatitzat aquesta purga.
- No hi ha factures, xat amb IA, col·laboració, avisos per correu ni programació d’actualitzacions activada.
