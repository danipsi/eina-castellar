# Guia d’ús de l’Observatori de Castellar

## Obre l’eina

Fes doble clic a **Obre-observatori.cmd**. S’obrirà una finestra de terminal i el navegador. Mantén la finestra oberta mentre facis servir l’eina. Per aturar-la, tanca la finestra.

Adreça habitual: **http://127.0.0.1:4173/**. Si la previsualització ja està oberta, utilitza aquesta mateixa adreça; no cal iniciar-la una altra vegada. Els dossiers pertanyen a una adreça i un navegador concrets: exporta una còpia abans de canviar d’adreça.

La consulta funciona amb la captura inclosa; no cal actualitzar les dades per provar-la. Cal Node.js 24 per executar-la en local. La primera instal·lació de dependències necessita connexió a Internet.

## Prova el recorregut principal

1. A Visió general, prem **Explora un cas real**, o cerca `CONT2400054` al camp superior i prem Retorn.
2. Obre un resultat de la PSCP: veuràs els lots, els imports i les observacions de les altres fonts.
3. A Cronologia documentada, consulta el punt 6 del ple de **31/03/2026**. És una menció a l’ordre del dia, no una confirmació del resultat de la votació.
4. Prem **Afegeix al dossier**, crea un dossier i posa-hi un nom. El mateix botó és a les fitxes de sessió i de pressupost, al detall d’un proveïdor o d’una entitat subvencionada, a cada conveni, a la fitxa d’una moció i al rànquing de la comparació amb municipis. Cada font desa les xifres tal com es veien en aquell moment i un enllaç **Obre a l’Observatori** per tornar a la mateixa vista.
5. A Dossiers, afegeix una pregunta o nota. Les hipòtesis s’identifiquen explícitament i tenen estat de revisió.
6. Prem **Còpia JSON**. Aquest és el fitxer que permet restaurar fonts i notes amb **Importa**. Markdown és per llegir o editar el dossier; Imprimeix permet desar-lo com a PDF des del navegador.

## Consulta i exporta dades

- **Contractació:** tria PSCP o RPC, any, procediment i text. El CSV inclou exactament les files filtrades, encara que la taula tingui diverses pàgines. Els imports desconeguts queden buits. No es barregen totals de les dues fonts.
- **Pressupost:** tria exercici i despeses o ingressos. Les barres tenen una taula equivalent amb imports exactes. «No informat» no és zero. La liquidació no és un registre de pagaments.
- **Sessions:** per defecte mostra els plens; les pestanyes «Junta de Govern» i «Tots els òrgans» canvien la llista i cada una indica quantes sessions hi ha amb la cerca i l’exercici triats. Cerca dins dels punts indexats i obre acta/vídeo a la font original. Les juntes de govern només tenen catàleg i enllaç. No tots els punts dels plens s’indexen.
- **Fonts i qualitat:** consulta captura, cobertura, exclusions i canvis. Una data de captura recent no garanteix que l’editor hagi publicat tota l’activitat recent.
- **Ctrl+K:** porta el focus al cercador global. Esc tanca les fitxes.

## Comparteix consultes i compara exercicis

- **Cerca transversal:** el cercador superior troba contractes, sessions, mocions, proveïdors, entitats subvencionades i convenis. Les pestanyes separen cada tipus amb el seu recompte; contractes i sessions s’obren en fitxa i la resta porta a la seva pàgina amb el filtre ja posat. Proveïdors i entitats s’agrupen pel nom de tots els exercicis: una coincidència de nom no prova que siguin la mateixa entitat.
- **Cerca exacta:** si escrius un codi com `CONT2400054` o `CONV2200024`, només apareixen registres, sessions i convenis que contenen aquest codi exacte. «Mostra resultats aproximats» amplia la cerca explícitament a codis semblants, sense atribuir-los cap relació.
- **Dates futures:** es conserven tal com les publica la font, amb l’avís «Data futura pendent de contrast». No encapçalen la portada i queden fora de Contractació per defecte. El selector de dates permet consultar-les soles o incloure-les.
- **Copia l’enllaç:** disponible a les consultes i a les fitxes. Manté els filtres, l’ordenació, la pàgina de resultats i el registre obert. En un altre navegador s’obre la mateixa vista pública. Si el navegador bloqueja el portapapers, es mostra l’adreça perquè la copiïs. Les notes i els dossiers no formen part de l’enllaç; una fitxa retirada mostra un avís de no disponibilitat.
- **Compara exercicis:** a Pressupost, selecciona l’exercici principal i prem aquest botó. Tria l’any base i una mateixa magnitud: inicial, definitiu o liquidat. La taula mostra diferència en euros i variació percentual; els imports obren la font a través de la fitxa. «Exporta comparació» descarrega aquestes files i els enllaços d’origen. Són imports nominals, sense ajust per inflació. Si falta una dada no es calcula la diferència; amb base zero no es calcula el percentatge.
- **Canvis entre captures:** a Fonts i qualitat, filtra per font i tipus. Les noves captures identifiquen altes i modificacions i permeten obrir la fitxa i consultar els camps alterats. Només es conserven valors anteriors/actuals d’imports i determinats camps estructurats; els textos s’indiquen com a modificats sense reproduir-ne versions antigues. Les retirades són recomptes sense identificadors. Es mostra l’últim lot amb canvis, no un historial acumulatiu. La captura del 13/10/2026 només té recomptes: el detall apareixerà quan una nova actualització detecti canvis.

## Prepara el Ple

- **Inversions:** a la portada i a Pressupost (despeses) hi ha la sèrie del capítol 6 per exercici: crèdit inicial, definitiu, liquidat, percentatge d’execució i crèdit no executat. El crèdit definitiu inclou romanents incorporats d’anys anteriors, de manera que una mateixa obra pot comptar en més d’un exercici: la suma acumulada és orientativa. «Consulta» obre la fitxa amb la font per afegir-la a un dossier.
- **Resum a la portada:** «Venciments pròxims» llista els contractes de la PSCP que acaben el termini inicial i els convenis en curs que vencen en els pròxims sis mesos, i compta els convenis que consten en curs amb la data de fi passada. Al costat, «Castellar entre municipis similars» resumeix la despesa per habitant del darrer exercici liquidat (total i capítols 1, 2 i 6) amb la posició i la mediana del grup; «Comparació completa» porta a la taula de Pressupost. Els criteris són els mateixos que a Contractació, Subvencions i convenis i Pressupost.
- **Preguntes formals:** en un dossier, prem «Prepara una pregunta formal». Tria sol·licitud d’informació, pregunta al Ple o prec; escriu el signant i el grup (es recorden només en aquest navegador) i marca les notes que s’hi inclouen. Per defecte s’hi afegeixen les notes de tipus pregunta i les fonts del dossier com a antecedents. Pots editar el text, copiar-lo o descarregar-lo. Revisa’l amb el Reglament orgànic municipal abans de presentar-lo: l’eina no calcula terminis legals.
- **Seguiment:** «Desa al seguiment» guarda el text dins del dossier. Canvia l’estat quan el presentis; s’hi anota la data d’avui, que pots corregir, i el número de registre. Es mostren els dies transcorreguts mentre no hi hagi resposta. Les peticions s’inclouen a la còpia JSON i al Markdown.
- **Canal RSS del Ple:** a Sessions, copia l’enllaç «Canal RSS del Ple» en un lector de notícies (Feedly, Inoreader, Thunderbird…) per veure els nous ordres del dia després de cada captura. Només inclou plens, no juntes de govern.
- **Seguiment de mocions:** l’apartat «Mocions» (també accessible des de Sessions) llista les mocions dels ordres del dia del Ple indexats, amb el grup proposant i el títol extrets del text publicat. La taula «Mocions per grup i any» filtra la llista amb un clic, i «Temes recurrents» mostra les paraules que surten al títol de tres mocions o més. Una moció que torna al Ple (per exemple, perquè va quedar sobre la taula) es compta una sola vegada i n’apareixen totes les sessions. A la fitxa d’una sessió, els punts que són mocions tenen l’enllaç «Seguiment de la moció», i la portada mostra les mocions aprovades que encara no has marcat com a complertes.
- **Estat i compliment:** l’ordre del dia no inclou el resultat de la votació. Obre la moció, consulta l’acta o el vídeo i marca’n el resultat, el compliment de l’acord i les notes amb l’evidència. Es desa només en aquest navegador; «Exporta seguiment» en fa una còpia JSON que un altre membre del grup pot incorporar amb «Importa seguiment» (si la mateixa moció està marcada als dos llocs, es conserva la marca més recent).
- **Contractes menors:** a Contractació, «Patrons en contractes menors» mostra tres patrons per a la font triada (PSCP o RPC, mai barrejades): imports entre el 90 i el 100 % del llindar (40.000 € en obres, 15.000 € en serveis i subministraments, sense IVA), diversos contractes del mateix adjudicatari i exercici que sumats arriben al llindar, i el mateix per codi CPV (el selector «Agrupació» canvia la precisió del codi). Obre un grup per veure’n els contractes i la fitxa de cadascun; «Exporta els patrons» en baixa la llista. Són senyals per preguntar, no proves de fraccionament: només l’expedient pot dir si els contractes formen una unitat. Fes servir preferentment la PSCP, perquè el RPC no diu si els imports porten IVA.
- **Venciments i pròrrogues:** a Contractació, «Venciments i pròrrogues» mostra, per a la font triada, els contractes no menors que acaben el termini inicial en els pròxims 6, 12 o 24 mesos, o que han vençut l’últim any, agrupats per mes. Cada data indica si és la publicada per la font o una estimació (inici + durada); les del RPC són aproximades perquè parteixen de l’adjudicació. A sota, els expedients amb dues o més pròrrogues registrades (o totes, amb «Inclou les pròrrogues úniques») amb la cronologia i l’enllaç a cada fita. Una pròrroga extraordinària es marca en vermell: convé demanar-ne la justificació. Útil per preparar preguntes abans que un servei venci sense contracte nou.
- **Proveïdors:** la pàgina «Proveïdors» mostra, per exercici, quant ha facturat cada empresa o entitat a l’Ajuntament (amb IVA) segons el registre de factures. Per defecte s’obre el darrer exercici tancat. El primer bloc recull els emissors que superen 18.150 € (el llindar del contracte menor de serveis, 15.000 €, més l’IVA) i dels quals no s’ha trobat cap contracte amb el mateix nom al catàleg. Obre un emissor per veure’n l’evolució per exercici, els contractes trobats i l’enllaç a les factures originals. La relació és només per nom: un contracte anterior al 2022, d’una central de compres o amb l’adjudicatari amagat no hi apareix, i és el primer que cal descartar abans de fer cap pregunta. Les persones físiques no surten mai amb nom.
- **Castellar entre municipis similars:** a «Pressupost», sota la comparació d’exercicis, la taula situa cada capítol de Castellar entre els municipis catalans de 15.000 a 35.000 habitants: import per habitant, mediana del grup, interval central (la meitat dels municipis hi cau a dins) i posició (1 = el més alt). Segueix l’exercici i el costat (despeses o ingressos) triats a dalt; la magnitud és «Liquidat» si l’exercici està tancat i «Inicial» si no. A cada fila, la tira de punts mostra tots els municipis (el punt verd és Castellar i la ratlla, la mediana); passa-hi el ratolí per veure’n el nom. «Rànquing» obre la llista ordenada d’aquell capítol, que es pot exportar en CSV. Són xifres de l’ajuntament sense empreses municipals ni consorcis: abans de treure conclusions, comprova si el servei es presta de la mateixa manera als municipis comparats.
- **Subvencions i convenis:** la pàgina té dues vistes. «Subvencions» mostra, per exercici (per defecte, el darrer tancat), quant ha rebut cada entitat, quina part s’ha atorgat sense convocatòria (nominatives, directes, excepcionals o amb conveni: es dedueix del títol de l’acord) i si la mateixa entitat també factura a l’Ajuntament; obre una entitat per veure’n l’evolució i cada acord, i baixa fins a «Per acord o convocatòria» per veure on va cada bloc de diners. «Convenis» té quatre pestanyes: els que consten «en curs» amb la data de fi ja passada (pot ser una pròrroga que no consta a la font o un estat no actualitzat: és el primer que cal preguntar), els que vencen en els pròxims 12 mesos, els que no tenen data de fi o superen els 4 anys, i tots els convenis amb cercador. El botó «Conveni CONV…» d’una subvenció porta al conveni que cita. Les persones físiques no surten mai amb nom.
- **Noms de grup:** els ordres del dia escriuen el nom d’un grup de maneres diferents. L’eina agrupa les variants que comencen igual i, damunt la taula per grup, suggereix altres possibles variants (sigles, ordre diferent): comprova-les a l’ordre del dia i prem «Uneix» o «Descarta». Per a la resta, fes servir «Unifica noms». Les unions es poden desfer i viatgen amb l’exportació del seguiment.

## Conserva els dossiers locals

Els dossiers es desen a IndexedDB **només al navegador actual**. No se sincronitzen entre ordinadors, perfils, ports o dominis. Si es netegen les dades del navegador, es poden perdre. Descarrega periòdicament una còpia JSON i importa-la al navegador nou. Abans d’importar es mostra què canviarà; si el dossier ja hi és, els canvis es fusionen en lloc de duplicar-lo (vegeu l’apartat següent). També el pots importar com a còpia separada.

Pots consultar i exportar els dossiers encara que falli o s’endarrereixi la càrrega de les dades públiques. Si edites el mateix dossier en dues pestanyes, un canvi fet sobre una versió antiga queda bloquejat: es carrega la versió actual, es conserva l’esborrany i se’t demana revisar els canvis abans de tornar a desar. També es comprova la versió abans d’eliminar un dossier.

El text i el tipus de cada nota pendent es conserven separadament per dossier, dins de la pestanya, quan canvies de secció o recarregues. **Prem «Afegeix nota» abans de tancar la pestanya**: un esborrany encara no forma part del dossier ni de la còpia JSON. El navegador avisa si intentes sortir amb text pendent. Si no permet desar esborranys per a una recàrrega, apareix un avís i el text es manté en memòria mentre la pàgina continuï oberta.

## Comparteix dossiers dins del grup

No hi ha cap servidor: l’intercanvi es fa amb fitxers JSON que us passeu per un canal intern del grup (correu, carpeta compartida privada…). El fitxer conté les vostres notes: no el publiqueu ni l’adjunteu a documents oficials.

1. A **Inicials**, al costat de «Afegeix nota», escriu les teves inicials o un àlies. Es recorden en aquest navegador i acompanyen les notes noves, de manera que el grup sap qui ha escrit cada nota. És opcional.
2. Per enviar-ho tot, prem **Paquet del grup**: un sol fitxer amb tots els dossiers i el seguiment de mocions (marques i unions de noms de grup). Per enviar-ne només un, obre’l i prem **Còpia JSON**.
3. Qui el rep prem **Importa** i tria el fitxer. La finestra **Revisa la importació** indica, per a cada dossier, si és nou o si ja el té i què canviarà: fonts i notes noves, elements actualitzats i elements eliminats per qui l’ha enviat. Per a cada dossier es pot triar fusionar-lo, importar-lo com a còpia separada o no importar-lo. El seguiment de mocions es pot incloure o no.
4. Prem **Confirma la importació**.

Com es fusiona:

- Cada font, nota i petició té un identificador propi. Si només és en un dels dos fitxers, s’afegeix; si és als dos amb diferències, es queda la versió canviada més recentment (amb la mateixa data, la teva). Per això el rellotge dels ordinadors ha d’estar en hora.
- Les eliminacions també viatgen: una nota que algú ha eliminat desapareix en importar el seu fitxer i no torna a aparèixer si després s’importa una còpia antiga. Una font que es torna a afegir després d’eliminar-la es conserva.
- El nom del dossier no es canvia en fusionar. Eliminar un dossier sencer no s’envia als altres: cadascú l’elimina al seu navegador.
- Importar dues vegades el mateix fitxer no duplica res. Les còpies exportades abans d’aquesta versió també es fusionen.

Les notes personals no es publiquen al web. No hi ha comptes ni un servidor de dossiers. Evita dades identificatives de persones i informació sensible a les notes i còpies.

## Actualitza la captura

Fes doble clic a **Actualitza-dades.cmd**. Necessita Python 3.13 i connexió a Internet. La captura pot trigar uns minuts perquè comprova els índexs de sessions i les APIs.

Si una font crítica falla o la resposta és incompleta, es manté el catàleg anterior i es mostra un avís d’actualització fallida. Per activar la captura diària al núvol, segueix la [guia de GitHub gratuït](./GUIA-GITHUB.md). El flux està preparat, pendent de pujar el projecte i activar Pages.

Les versions locals de registres publicables es conserven a `dades/observatori.sqlite`. No es desen HTML cru, transcripcions, NIF personals ni notes del navegador en aquesta base. La carpeta `dades` no entra a Netlify.

Per ampliar el període de consulta, modifica `config/period.json`: any inicial (`startYear`), any final (`endYear`) i últim any amb liquidació que vols capturar (`latestLiquidationYear`). Després actualitza la captura i genera el web de nou. No publiquis un canvi de període si la captura ha fallat: els textos de la interfície i les dades han de correspondre al mateix període.

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
