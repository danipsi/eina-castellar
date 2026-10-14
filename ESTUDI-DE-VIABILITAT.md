# Eina de fiscalització municipal de Castellar del Vallès

**Estudi de viabilitat i especificació funcional · 13 d’octubre de 2026 · Versió 1.0**

Estat: investigació i disseny completats amb les limitacions indicades. No s’ha programat ni publicat l’aplicació. S’han fet consultes de fonts públiques i s’ha creat un script d’auditoria, que només conserva esquemes i resultats agregats.

Documents que formen aquesta especificació:

- [Mapa de fonts i accessos](./MAPA-DE-FONTS.md): organismes, URL, cobertura, formats, actualització, claus i automatització.
- [Auditoria reproduïble de les APIs](./recerca/auditoria-api.json): recomptes, camps, absències i consultes.
- [Continuïtat del projecte](./README.md): punt d’entrada per a l’encàrrec «Construeix el MVP».

## 1. Resum executiu

**El projecte és viable i es pot publicar a Netlify. La proposta recomanada és un observatori documental amb exploració de dades i dossiers d’investigació.** El valor principal consisteix a reconstruir la història d’un assumpte, consultar contractació i pressupostos i verificar cada resultat contra la font original.

La recerca ha anat més enllà dels catàlegs: s’han consultat directament les APIs de l’AOC i de la Generalitat, amb filtratge municipal, paginació i comprovacions de cobertura. Els recomptes són files retornades, no necessàriament contractes, empreses o expedients únics.

| Àmbit | Resultat observat | Conseqüència per al producte |
|---|---|---|
| Contractació PSCP | 698 files; 306 amb procediment «Contracte menor» | Exploració real de contractes, sense afirmar exhaustivitat |
| Execució contractual PSCP | 128 files d’actuacions | Seguiment de modificacions, pròrrogues i altres actuacions publicades |
| Registre públic de contractes | 791 files, exercicis 2017–2026 | Contrast entre registres, sense sumar-los |
| Pressupost AOC | 3.847 files, exercicis 2022–2026 | Comparació per classificació i nivell |
| Liquidacions AOC | 5.622 files, exercicis 2010–2025 | Evolució de pressupost i execució amb tractament explícit dels buits |
| Factures municipals | 28.552 files, exercicis 2019–2026 | Exploració de factures registrades; no equival a despesa pagada |
| Proveïdors municipals | 5.558 files anuals | Identitats empresarials i imports, amb identificadors incomplets o ocults |
| Convenis municipals | 283 files | Expedients i vigència declarada; contrast documental necessari |

Fonts: [API de contractació PSCP](https://analisi.transparenciacatalunya.cat/api/views/ybgg-dgi6.json), [execució contractual](https://analisi.transparenciacatalunya.cat/api/views/8idu-wkjv.json), [RPC](https://analisi.transparenciacatalunya.cat/api/views/hb6v-jcbf.json), [catàleg AOC municipal](https://dadesobertes.seu-e.cat/api/3/action/package_search?fq=organization%3Acastellardelvalles&rows=100) i recursos detallats al mapa. Les consultes municipals exactes consten a l’auditoria adjunta.

**Hi ha dues oportunitats especialment sòlides.** Primera, relacionar actes i contractació per expedient: s’ha comprovat un cas concret i s’han trobat 434 codis d’expedient coincidents entre PSCP i RPC. Segona, reconstruir pressupost inicial, modificacions i execució a partir de fonts estructurades i documents, mantenint separats els conceptes comptables.

**Hi ha tres límits que condicionen el disseny.** Les factures municipals no tenen NIF d’emissor, expedient, concepte, partida ni estat de pagament en l’esquema consultat. El CSV de factures només arriba al 7 d’abril de 2026 en data de registre, malgrat les metadades posteriors del catàleg. I la coincidència d’un nom o d’un import no demostra que dos registres corresponguin al mateix negoci jurídic. [CSV original de factures](https://dadesobertes.seu-e.cat/csv/castellardelvalles/factures_dop.csv).

No es proposa un «detector de corrupció». Les deteccions seran avisos revisables amb regla, evidència, limitacions i explicacions alternatives. Les dades objectives, els càlculs, les inferències i les hipòtesis tindran representacions diferents.

### Abast i significat de les etiquetes

- **COMPROVAT**: s’ha llegit la font, el document o la resposta de l’API. Cal precisar si la comprovació és de catàleg, esquema, dades o document.
- **PROBABLE**: hi ha evidències indirectes suficients per orientar una prova, però falta validar el detall.
- **POSSIBLE**: capacitat o relació proposada; encara no demostrada amb dades.
- **NO DISPONIBLE / NO VERIFICAT**: «no disponible en el recurs examinat» o «no verificat en aquesta recerca». No significa necessàriament que l’Ajuntament no ho tingui o que no ho publiqui enlloc.

L’inventari cobreix tots els àmbits demanats i les principals fonts supramunicipals localitzades. No és una certificació d’exhaustivitat de totes les publicacions municipals ni una auditoria de legalitat. La qualitat s’ha perfilat especialment als datasets centrals; no s’han revisat un per un tots els documents i registres.

## 2. Mapa complet de fonts

El [mapa adjunt](./MAPA-DE-FONTS.md) conté 35 fitxes i els accessos tècnics verificats. Distingeix dades publicades pel municipi, rèpliques de dades supramunicipals i fonts de contrast.

Per al nucli del projecte s’utilitzaran aquestes famílies:

1. **AOC municipal:** factures, proveïdors, convenis i catàleg. La consulta de l’organització retorna 12 datasets propis. El portal també presenta conjunts globals; no s’han de confondre amb 12 fonts totals disponibles.
2. **Generalitat:** publicacions PSCP, execució contractual i RPC. Són fonts relacionades, però amb funcions i temporalitat diferents.
3. **AOC econòmic:** pressupostos i liquidacions filtrats pel codi municipal, amb enllaç als originals municipals i a Hisenda quan correspongui.
4. **Ajuntament:** portal de vídeoactes, pressupostos, execució trimestral, RLT, patrimoni i plans.
5. **Contrast i context:** BOPB, CIDO, rendició de comptes, BDNS, RAISC, Idescat, Diputació, Consell Comarcal, ICGC i planejament urbanístic.

Una pàgina amb un epígraf de transparència no acredita que el seu contingut estigui complet. Un catàleg que anuncia una API tampoc acredita que aquesta retorni dades per a Castellar. L’exemple concret és e-FACT: el recurs existeix, però els filtres provats per codi d’ens i NIF municipal han retornat zero files. No s’incorpora com a font operativa del MVP.

## 3. Qualitat i explotabilitat de les dades

### 3.1. Resultats de l’auditoria directa

| Recurs | Evidència observada | Tractament requerit |
|---|---|---|
| Factures | `IMPORT_FACTURA` és text; el CSV incorpora coma decimal, milers i símbol d’euro | Conversió determinista a cèntims, conservant valor original |
| Factures | 592 files atribuïdes a l’exercici 2026, davant de 3.824 el 2025 | No comparar anys complets amb 2026 com si fos complet |
| Factures | CSV: màxima data de factura 23/03/2026; registre 07/04/2026 | Mostrar cobertura real, independentment de la data de descàrrega |
| Factures | API: màxima data de registre 03/12/2026; CSV: cap data de registre posterior al dia de l’estudi | Incidència de representació de dates; preferir el CSV amb format explícit i comparar registres abans de qualsevol correcció |
| Factures | El CSV conté una data de factura de 1923 i 12 dates anteriors a 2019 | Marcar-les; una factura anterior al registre no és automàticament incorrecta; no substituir anys per intuïció |
| Proveïdors | 19 files sense CIF i 1.159 amb asteriscs al camp CIF | No recuperar ni completar identificadors ocults; excloure’ls de unions automàtiques per NIF |
| Proveïdors | 5.529 grups exercici+CIF per a 5.558 files | Aquesta clau no és universalment única; els valors buits o ocults poden agrupar persones diferents |
| Convenis | 18 finals buits; hi apareix 01/01/1900 i finals fins a 2050 | Separar absent, valor sentinella i termini llarg real; no inferir extinció només per la data |
| PSCP | 93 files sense procediment; 410 sense nombre d’ofertes; 72 sense import d’adjudicació sense IVA | Nul no és zero ni absència de concurrència; considerar fase i aplicabilitat del camp |
| PSCP | 1 fila sense expedient; 452 sense número de lot | No rebutjar un contracte sense lots; representar «sense lot» separadament de «lot desconegut» |
| PSCP | La consulta de màxim retorna una adjudicació datada 09/12/2026, posterior a l’estudi | No interpretar-la com un fet ja ocorregut; contrastar la publicació original i la representació de la data |
| Execució PSCP | 13 actuacions sense data; 23 sense import | Poden existir actes no monetaris; no omplir imports amb zero |
| Liquidació detallada | 437 files sense cadascun dels camps d’import principals; `IMP_EXE_TANC` buit en les 5.622 files | No utilitzar aquest darrer camp per a indicadors; revisar buits segons classificació i any |
| Liquidació per capítols | 252 files, amb un buit d’import final i liquidat | No completar totals silenciosament |

Fonts reproduïbles: [factures CSV](https://dadesobertes.seu-e.cat/csv/castellardelvalles/factures_dop.csv), [proveïdors CSV](https://dadesobertes.seu-e.cat/csv/castellardelvalles/proveidors_dop.csv), [convenis API](https://dadesobertes.seu-e.cat/api/3/action/datastore_search?resource_id=a2ca7c35-3afa-41f4-87e6-1d1645d0291a&limit=0) i [auditoria local](./recerca/auditoria-api.json). Les absències descrites no constitueixen, per si mateixes, incompliments administratius.

La diferència de dates entre CSV i DataStore és compatible amb una interpretació incorrecta de dia i mes en algun punt de publicació. **La causa exacta és NO VERIFICADA.** L’aplicació no haurà d’«arreglar» dates amb una regla general d’intercanvi: malmetria les dates correctes. Caldrà comparar els mateixos registres amb claus suficients i anotar quina representació s’ha escollit.

### 3.2. Granularitat, cobertura i versions

La PSCP i el RPC publiquen files que poden representar expedients o lots. No s’ha de sumar l’import d’un expedient repetit per cada lot. La fitxa oficial de la PSCP també informa d’una incidència amb expedients absents en versions del 15 al 19 de juny de 2026: és una raó concreta per conservar versions i evitar interpretar desaparicions com anul·lacions. [Metadades oficials PSCP](https://datos.gob.es/ca/catalogo/a09002970-contratacion-publica-en-catalunya-publicaciones-en-la-plataforma-de-servicios-de-contratacion-publica).

Els pressupostos contenen classificacions i nivells jeràrquics. Sumar capítols, articles, conceptes i subconceptes alhora duplicaria o multiplicaria el total. Cada gràfic fixarà una única classificació i un nivell compatible. Unir pressupost i liquidació exigeix municipi, exercici, ingrés/despesa, classificació, codi, nivell i estructura; no només el codi visible. [Esquema pressupostari](https://dadesobertes.seu-e.cat/api/3/action/datastore_search?resource_id=595f8620-7a3c-4e38-8be2-7cffa744cd44&limit=0).

Les dates «actualització del catàleg», «captura», «publicació» i «fet administratiu» es mostraran separades. La pàgina regenerada avui pot contenir dades antigues. El període de dades declarat tampoc garanteix que no faltin documents intermedis.

### 3.3. Què queda pendent de prova

No s’han mesurat encara la coincidència factura–proveïdor, els duplicats de factures amb claus completes, l’equivalència dels imports AOC–Hisenda ni la precisió de l’extracció massiva de PDFs. Tampoc s’ha provat l’estabilitat de cap font durant setmanes. Aquests punts són portes de validació del desenvolupament, no funcionalitats que es puguin donar per resoltes.

La consulta de metadades també diferencia les llicències: factures i proveïdors consten com `cc-by`, mentre que convenis consta com `notspecified`. La lectura del conveni públic i la seva republicació massiva són decisions diferents; cal aclarir les condicions d’aquest recurs abans d’incorporar-lo a una publicació automatitzada. [Metadades municipals comprovades](https://dadesobertes.seu-e.cat/api/3/action/package_search?fq=organization%3Acastellardelvalles&rows=100).

## 4. Relacions possibles entre datasets

### 4.1. Identificadors de referència

| Identificador | Valor comprovat | Ús |
|---|---|---|
| NIF de l’Ajuntament | `P0805000G` | Receptor de finançament i identitat de l’organització |
| Codi municipal Idescat | `080517` | Estadístiques territorials |
| Codi d’ajuntament | `0805170005` | Correspondències territorials i registre de contractes |
| Codi AOC observat | `805170005` | Versió numèrica sense zero inicial; conservar el valor original |
| Òrgan PSCP | `3411306` | Filtre de contractació de l’Ajuntament |
| DIR3 PSCP | `L01080517` | Identificador administratiu observat |

Fonts: [perfil municipal i NIF](https://www.castellarvalles.cat/19857/descriptiu/), [Idescat](https://www.idescat.cat/codis/?c=080517&id=50&lang=es&n=9&t=01-01-2025) i consultes PSCP de l’auditoria. Els codis s’emmagatzemaran com a text amb el seu sistema d’origen. No s’estendrà el filtre a organismes vinculats sense inventariar-los explícitament.

| Relació | Estat i clau | Condicions i límits |
|---|---|---|
| PSCP ↔ execució PSCP | COMPROVAT: òrgan, expedient i lot presents als esquemes | Una actuació pot afectar un lot o l’expedient; validar cardinalitats |
| PSCP ↔ RPC | COMPROVAT: 434 codis coincidents després d’eliminar espais externs i unificar majúscules | 622 codis no buits diferents a PSCP i 630 al RPC; coincidència de codi no valida imports, lots ni situació jurídica |
| Acta ↔ contracte | COMPROVAT en un cas: codi d’expedient literal | Guardar punt de l’ordre del dia i font; no interpretar l’ordre del dia com un acord aprovat |
| Proveïdor ↔ adjudicatari PSCP | PROBABLE per NIF complet, tipus d’identificador i país | Verificar que no sigui persona física, UTE o identificador ocult; cobertura del creuament no mesurada |
| Factura ↔ proveïdor | POSSIBLE per nom i exercici com a candidatura | Sense NIF a la factura; requereix validació, pot ser ambigu; cap fusió silenciosa |
| Factura ↔ contracte | NO DISPONIBLE com a unió directa en el registre municipal | Import, nom i proximitat temporal només generen hipòtesis |
| Pressupost ↔ liquidació | PROBABLE amb clau comptable composta | Validar diccionari, perímetre i classificacions anuals abans de donar-la per establerta |
| Partida ↔ contracte | POSSIBLE si el plec o acord explicita l’aplicació | Extracció documental revisada; no deduir-la del CPV |
| Conveni ↔ acta | POSSIBLE per `CODI_EXPEDIENT` | Clau disponible; cobertura exacta del creuament pendent |
| Subvenció ↔ conveni | POSSIBLE per codi explícit o document | Mateix beneficiari i import no basten; no duplicar concessió i conveni |
| Municipi ↔ indicadors | COMPROVAT el codi; unió de sèries pendent | Mateix any, unitat, definició i territori |
| Projecte ↔ inversió ↔ contracte | POSSIBLE mitjançant expedient, codi de projecte o revisió | Una obra pot tenir diversos contractes i diverses anualitats |
| Immoble ↔ planejament | POSSIBLE amb referència cadastral o geometria | No prova titularitat ni cost d’una actuació |

### 4.2. Exemple real que orienta el producte

L’ordre del dia del Ple de 31/03/2026 inclou una modificació del lot 1 de l’obra de piscina i vestidors al Parc de Colobrers, amb expedient `CONT2400054`. La PSCP retorna aquest expedient amb els lots 1 i 2. Això permet construir un dossier amb les dues fonts i una referència documental precisa. [Sessió municipal](https://actes.castellarvalles.cat/session/sessionDetail/8a8180849d1882b2019d29b61c150051) · [Publicació contractual](https://contractaciopublica.cat/ca/detall-publicacio/586d8996-d7c2-4049-9a0b-9dfc54679673/300373557).

La consulta d’execució PSCP amb aquest codi exacte no ha retornat files. **No permet concloure que la modificació no existeixi, no s’aprovés o no es publiqués en una altra representació.** Permet marcar «referència a modificació localitzada a l’ordre del dia; cal contrastar acord i publicació d’execució». Aquest és el tipus de discrepància útil que ha de facilitar l’eina.

El resultat viable és una base integrada parcial: registres connectats quan hi ha evidència i registres independents quan no n’hi ha. Un percentatge de relacions pendents visible és preferible a una falsa cobertura del 100%.

## 5. Necessitats de fiscalització detectades

Les necessitats següents es dedueixen de la dispersió i estructura observades; no són acusacions ni troballes d’irregularitat:

- **Reconstruir un assumpte:** trobar l’anunci, els lots, els acords i les modificacions d’una obra sense recórrer manualment diversos portals.
- **Entendre què s’ha pressupostat i executat:** distingir crèdit inicial, definitiu, obligacions reconegudes i pagaments; consultar l’explicació documental d’una modificació.
- **Conèixer la contractació publicada d’un proveïdor:** per període i tipus de contracte, amb imports comparables i límits de cobertura.
- **Preparar un Ple o una investigació:** cercar un expedient o tema i arribar al punt concret de la sessió.
- **Detectar canvis:** saber que s’ha publicat una pròrroga, s’ha substituït un document o hi ha un nou acord rellevant.
- **Distingir absència de dades i absència d’activitat:** una pregunta no resolta ha de generar una necessitat de documentació, no una acusació.

### Priorització explícita

Escala de disseny d’1 a 5 per factor, sense pretensió de mesura científica. El producte dels quatre factors ajuda a ordenar; no és una puntuació sobre l’Ajuntament.

| Funció | Impacte | Utilitat | Fiabilitat actual | Viabilitat | Producte |
|---|---:|---:|---:|---:|---:|
| Cercador d’expedients amb fonts i dossiers | 5 | 5 | 4 | 5 | 500 |
| Explorador de contractació amb lots | 5 | 5 | 4 | 4 | 400 |
| Pressupost i liquidació per capítols | 5 | 5 | 4 | 4 | 400 |
| Canvis i noves publicacions | 4 | 5 | 4 | 4 | 320 |
| Catàleg cercable d’actes i ordres del dia | 5 | 5 | 4 | 3 | 300 |
| Evolució de proveïdors i facturació publicada | 4 | 4 | 2 | 4 | 128 |
| Resums amb IA i citacions | 3 | 4 | 2 | 3 | 72 |
| Enllaç automàtic de cada factura a un contracte | 5 | 5 | 1 | 1 | 25 |
| Puntuació automàtica d’irregularitat | — | — | — | — | Exclosa |

Automatitzar primer captura, normalització, filtres, sumes, comparacions, detecció de versions i extracció de codis. La IA pot ajudar a resumir o suggerir vincles; no ha de calcular imports, decidir identitats ni qualificar conductes.

## 6. Proposta de producte

Nom provisional: **Observatori de Castellar**. Cal presentar-lo com una eina independent si no és un projecte institucional, sense escut ni aparença d’oficialitat que indueixi a confusió.

Usuaris principals: Dani com a investigador; posteriorment periodistes, entitats, representants públics i ciutadania amb interès en un assumpte concret. El primer lliurament serà de consulta amb un espai personal de dossiers al navegador, sense comptes ni col·laboració multiusuari.

La unitat central és l’**assumpte**, creat per l’usuari: una pregunta, un expedient, una obra o un servei. Un dossier agrupa fonts i notes, manté les preguntes pendents i permet exportar una cronologia revisable.

Quatre tipus de contingut, amb etiqueta textual i icona accessibles:

| Tipus | Exemple de representació |
|---|---|
| Dada publicada | «La font informa un import de X, sense IVA» + font i data |
| Càlcul reproduïble | «Suma de les adjudicacions incloses» + filtres, exclusions i fórmula |
| Patró a revisar | «Hi ha diverses adjudicacions amb aquest CPV en el període» + regla |
| Hipòtesi o inferència | Nota separada, autoria, evidència favorable i pendent de contrast |

Aquestes etiquetes descriuen la naturalesa del contingut. Les etiquetes COMPROVAT/PROBABLE/POSSIBLE descriuen el grau de verificació. Són dues dimensions diferents: una dada publicada pot tenir una qualitat deficient o ser corregida posteriorment.

## 7. Arquitectura funcional

### Pantalles

| Pantalla | Contingut i acció principal |
|---|---|
| Inici | Cerca, darreres novetats verificades, data de cobertura i avisos de fonts desactualitzades |
| Explorador | Pestanyes Contractació, Pressupostos, Sessions i, quan superin validació, Factures/Proveïdors |
| Fitxa de registre | Camps, unitats, documents, relacions confirmades, candidates separades i historial |
| Assumpte | Pregunta, cronologia, evidències seleccionades, notes, pendents i exportació |
| Fonts i qualitat | Origen, llicència, cobertura, darrera captura correcta, incidències i metodologia |
| Novetats | Registres nous, canvis materials i avisos vinculats a assumptes seguits |

### Cerca i filtres

Cerca exacta prioritària per expedient; després títol, descripció, empresa i metadades documentals. Normalització d’accents per cercar, conservant text original. La cerca per NIF només s’ofereix per identificadors empresarials complets autoritzats. Un no-resultat dirà «No s’ha trobat al corpus consultable», mostrant-ne la cobertura.

Filtres comuns: àmbit, font, interval de dates amb tipus de data explícit, estat de revisió i document disponible. Contractació: procediment, tipus, CPV, adjudicatari, lot, fase i import amb/sense IVA. Pressupost: exercici, ingrés/despesa, classificació i nivell. Factures: exercici, data de registre, emissor i import, sense filtres de concepte o pagament inexistents.

El recompte i les exportacions han d’aplicar exactament els mateixos filtres. Les files excloses d’un càlcul per import desconegut o identitat ambigua s’indicaran al costat del resultat.

### Flux de treball principal

1. Cercar `CONT2400054` o un tema.
2. Obrir la fitxa i identificar lots i dates.
3. Consultar una sessió relacionada i obrir l’original al punt o pàgina documentats.
4. Afegir la font a un assumpte i escriure una pregunta pendent.
5. Comparar versions o imports només quan siguin equivalents.
6. Exportar dossier amb fonts, dates de consulta i distinció entre dada i nota personal.

### Visualitzacions i alertes

Gràfics inicials: cronologia d’assumpte, barres pressupost inicial/definitiu/obligacions/pagaments quan les quatre magnituds estiguin disponibles, i evolució anual de contractació publicada. Taula accessible equivalent en tots els casos. No s’hi inclourà un mapa o graf de relacions si no resol una pregunta concreta.

Avisos del MVP: nova publicació, canvi d’import o estat, nou document i font sense actualització esperada. Safata dins l’eina; correus, notificacions externes i subscripcions queden per a una fase posterior. Un canvi d’etiqueta o de capçalera d’un web no ha de generar una alerta d’assumpte.

Patrons analítics posteriors: concentració d’adjudicacions per proveïdor i CPV, reiteració temporal o proximitat a llindars. Exigiran períodes comparables, cobertura coneguda i mostra suficient. Una única oferta no serà un indicador vàlid quan el camp no sigui aplicable o sigui buit.

### Citacions, IA i exportació

Una citació inclou organisme, títol, URL original, data de publicació coneguda, data de captura, identificador del registre i localitzador: pàgina PDF, punt de sessió, fila de captura o minut de vídeo comprovat. Si el reproductor no permet salt temporal fiable, obrir sessió i indicar el minut en text.

El MVP exportarà CSV de la taula filtrada i JSON/Markdown del dossier, més vista d’impressió. Les notes personals romandran al dispositiu i s’exportaran només amb una acció explícita. Cal indicar que es perden si es neteja l’emmagatzematge del navegador i no s’ha fet còpia.

La IA no és una dependència del MVP. Més endavant: resum d’un document amb cites, proposta d’etiquetes i preguntes per contrastar. Qualsevol resum generat quedarà identificat i requerirà revisió abans d’integrar-se en un dossier publicable.

## 8. Model de dades

### Entitats i relacions

| Entitat | Camps essencials i relacions |
|---|---|
| `source` | Organisme editor, URL, llicència, cadència declarada, cobertura, prioritat i política de conservació |
| `capture` | Font, URL exacta, data UTC, estat HTTP, ETag/Last-Modified si existeixen, hash, nombre de files i resultat de validació |
| `document` / `document_version` | Identitat lògica, versió, hash, tipus MIME, URL original, publicació, captura, text revisat o pendent |
| `organization` / `external_identifier` | Organisme o empresa, tipus, identificador i sistema, vigència; sense inferir identitat de persones anonimitzades |
| `source_record` / `record_version` | Dataset i clau nativa; valors originals, valors normalitzats, versió del transformador, primera/darrera observació |
| `contract` / `lot` | Òrgan, expedient, lots, procediment, CPV, fases; una identitat lògica pot tenir diverses observacions de fonts |
| `award` / `contract_event` | Adjudicació, modificació, pròrroga o extinció; import i base fiscal explícits, data i evidència |
| `invoice` | Número d’origen si és publicable, emissor d’origen, exercici, dates i import; relació a contracte opcional i justificada |
| `supplier_year` | Relació anual de proveïdors; no confondre-la amb adjudicacions ni amb factura individual |
| `budget_line` / `budget_observation` | Ens, exercici, classificació, nivell, codi i estructura; magnitud comptable, període i import |
| `session` / `agenda_item` / `decision` | Òrgan, sessió, ordre del dia, acord verificat, document i localitzador |
| `agreement` / `grant` | Conveni i subvenció com a entitats diferents; codi extern, dates, import si existeix i documents |
| `project` / `asset` | Agrupació revisada d’actuacions i béns; incorporació posterior |
| `evidence_link` | Registre o afirmació, document/versionat, pàgina/punt/fila, fragment o selector, mètode |
| `relationship` | Origen, destí, tipus, clau utilitzada, mètode, estat candidat/confirmat/rebutjat, revisor i evidència |
| `case_file` / `note` / `watch` | Assumpte personal, notes i seguiment; separat de la capa pública |
| `quality_issue` / `review` | Regla, objecte afectat, severitat, explicació, revisió i resolució |
| `release` | Versió publicada, captures incloses, cobertura, transformadors i comprovacions superades |

Relació bàsica: font → captura → versió de registre/document → evidència → dada o relació → dossier. Una relació molts-a-molts permet que un acord afecti diversos contractes i que un contracte aparegui en diverses sessions.

**Regles estructurals:** imports en cèntims enters quan siguin EUR; monedes separades; IVA `inclòs/exclòs/desconegut`; dates de fet separades de les de captura; períodes amb inici i final; `null` diferent de zero; codis com a text. Els identificadors `_id` d’un DataStore poden canviar en una recàrrega: són localitzadors de la captura, no una garantia d’identitat permanent.

No hi haurà una taula genèrica on «import» signifiqui indistintament previsió, adjudicació, factura i pagament. Són magnituds diferents. Tampoc s’assumirà que el RPC publica un NIF d’adjudicatari: l’esquema actual consultat conté `adjudicatari`, però no un camp NIF separat. [Esquema RPC](https://analisi.transparenciacatalunya.cat/api/views/hb6v-jcbf.json).

Per a conflictes entre fonts, conservar totes les observacions i seleccionar una representació preferent amb motiu explícit. No declarar dues fonts coincidents com dues confirmacions independents si una és rèplica de l’altra.

## 9. Arquitectura tècnica

### 9.1. Decisió recomanada

**Web estàtic amb dades publicables preparades prèviament; procés d’ingestió separat.** El navegador consulta fitxers propis ja validats i no depèn de centenars de peticions en directe a portals oficials. Això redueix errors, càrrega a les fonts i problemes de CORS, i permet publicar el mateix resultat a Netlify, Cloudflare Pages o un altre allotjament estàtic.

| Component | Proposta inicial | Motiu i límit |
|---|---|---|
| Interfície | React + TypeScript + Vite, amb components senzills | Eina navegable amb filtres i dossiers; sense renderització de servidor inicial |
| Ingestió | Python, adaptadors per font i configuració explícita | CSV/JSON i extracció documental; executable també en local |
| Base de treball | SQLite amb esquema versionat | Sense servidor de base de dades per al MVP |
| Publicació | JSON fragmentat per àmbit/exercici, manifest de versió i índex de cerca | Només camps autoritzats; mai la base de treball sencera |
| Cerca web | MiniSearch, carregat per àmbits | Cerca local en memòria; mesurar volum real abans de carregar tot el corpus |
| Dossiers | IndexedDB al navegador + exportació/importació JSON | Ús personal; sense sincronització ni garantia de còpia automàtica |
| PDFs | Extracció de text i taules fora de Netlify; verificació de pàgines i totals | OCR només en pàgines sense text aprofitable |
| Planificador | Flux de GitHub Actions configurable o la mateixa ordre en un equip propi | Flux portable; captura i publicació desacoblades |
| Arxiu de captures | Directori privat local amb còpia de seguretat; després emmagatzematge compatible S3 si cal execució desatesa al núvol | Els artefactes temporals d’un runner no són un arxiu permanent |
| Backend | Cap en la consulta pública inicial | Afegir-lo quan calguin comptes, permisos o col·laboració |

[MiniSearch](https://lucaong.github.io/minisearch/) ofereix cerca local; [SQLite FTS5](https://www.sqlite.org/fts5.html) és una opció per al cercador intern del procés d’ingestió. La versió de cada dependència es fixarà al desenvolupament, amb revisió de llicència i manteniment.

**Decisió d’implementació per defecte:** aquesta combinació s’aplicarà si l’encàrrec següent no la modifica. No s’incorporaran Next.js, Elasticsearch ni una base vectorial al MVP.

### 9.2. Netlify i costos

Netlify és adequat per servir la carpeta de publicació del web. L’extracció massiva de PDFs, l’OCR i la ingestió completa han de córrer en el procés separat. Netlify té funcions programades i de llarga durada, però no cal convertir-les en el centre d’aquesta arquitectura. Les funcions programades només s’executen sobre desplegaments publicats. [Documentació de Netlify](https://docs.netlify.com/build/functions/scheduled-functions/) · [Modes i límits](https://www.netlify.com/knowledge-base/how-to-add-a-backend-api-endpoint-with-netlify-functions/).

**Cost comprovat a la consulta:** Free inclou 300 crèdits mensuals i cada desplegament de producció consumeix 15. Per tant, 30 desplegaments mensuals consumirien 450 crèdits abans de trànsit o còmput. És un càlcul d’aquesta proposta, no una estimació de factura real. [Plans](https://www.netlify.com/pricing/) · [Comptabilització de crèdits](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/).

Per començar amb Netlify gratuït: captures diàries quan hi hagi un executor disponible i una publicació setmanal només si hi ha canvis. Quatre publicacions serien 60 crèdits, més altres desplegaments i ús. Les previsualitzacions no consumeixen crèdits de desplegament de producció. Cal pressupostar també proves, amplada de banda i peticions; la gratuïtat no queda garantida pel nombre de publicacions.

Si es vol actualització pública diària des del primer moment, valorar Netlify Personal —la pàgina consultada anuncia 9 USD/mes i 1.000 crèdits— o Cloudflare Pages, amb límits propis. No hi ha conversió a euros ni impostos inclosos en aquesta comparació. [Netlify Personal](https://www.netlify.com/pricing/personal-vs-free/) · [Límits de Cloudflare Pages](https://developers.cloudflare.com/pages/platform/limits/).

Pressupost orientatiu de disseny: començar sense cost d’IA, allotjament estàtic dins d’un pla gratuït si el volum ho permet, i reservar una partida separada per domini i còpies si es contracten. No s’ha pressupostat un servei S3 ni minuts d’execució de pagament: s’hauran de dimensionar amb la primera ingestió real. No activar recàrregues automàtiques per defecte.

### 9.3. Creixement i independència

Si s’incorpora treball compartit: API amb autenticació, PostgreSQL, control d’accés per usuari, còpies i registre de canvis. La capa pública podrà continuar estàtica. Els dossiers privats no es poden protegir amagant botons o afegint una contrasenya només al JavaScript.

Embeddings i RAG queden per després de disposar d’un corpus net. Si s’afegeixen, cercar primer per paraula i expedient; utilitzar embeddings com a complement; mantenir versions del model, fragments i citacions; no contestar sense evidència suficient. Cap dada sensible s’enviarà a un model extern per defecte.

La portabilitat es basarà en formats CSV/JSON/SQLite, adaptadors independents i una carpeta final estàtica. El canvi d’allotjament no hauria d’obligar a reescriure el procés de dades.

## 10. Automatització i actualitzacions

### Circuit proposat

1. Llegir el registre de fonts i la darrera captura correcta.
2. Consultar metadades i, quan sigui possible, ETag o Last-Modified.
3. Descarregar recursos amb paginació completa, límits de mida, temps màxim i reintents amb espera creixent.
4. Registrar nombre esperat i rebut, hash i esquema; validar abans de substituir res.
5. Normalitzar en una zona de preparació separada de les dades publicades.
6. Comparar registres i documents per identitat i contingut, no només per URL.
7. Executar controls; posar casos dubtosos en quarantena i generar un informe de diferències.
8. Publicar una versió completa i coherent; si falla una font crítica, conservar l’anterior i mostrar-ne l’antiguitat.

Cadència proposada, diferent de la freqüència real de l’editor: contractació i sessions, diària; factures/proveïdors/convenis, setmanal inicialment fins a observar canvis; pressupost i liquidació, setmanal en períodes de publicació i mensual la resta; indicadors, mensual o segons calendari oficial. El motor només actuarà sobre canvis materials i no reenviarà avisos idèntics.

Les modificacions retroactives obliguen a fer reconciliacions completes periòdiques; no n’hi ha prou amb consultar «dates posteriors a ahir». Per aquests volums municipals, una recàrrega completa dels datasets petits és assumible com a punt de partida, pendent de mesurar temps i mida.

Una fila desapareguda tindrà estat «no observada en la captura actual» fins a confirmar supressió o canvi d’identificador. S’han de registrar tombstones, reaparicions i substitucions. La mateixa URL amb un hash diferent és una nova versió; una URL nova amb el mateix hash pot ser una còpia.

Les captures originals autoritzades es conservaran fora de la carpeta pública. Si un document conté dades personals indegudes, s’ha de poder retirar també de versions publicades, índexs, memòries cau i còpies segons la política de conservació; l’historial de traçabilitat no justifica republicar-lo indefinidament.

GitHub Actions és una opció pràctica, però la seva programació pot retardar-se o perdre execucions; en repositoris públics pot desactivar-se per inactivitat. Cal un indicador de darrera execució correcta i avís de retard. No prometre actualització puntual com si fos un servei amb garantia. [Documentació del planificador](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Logs: identificador d’execució, font, durada, estat, recomptes i errors sense dades personals. Secrets en variables protegides, mai al navegador. Configurar un únic procés escriptor i publicació atòmica. Còpia abans de migracions i prova de restauració del conjunt SQLite + arxiu + manifest.

## 11. Sistema de control de qualitat

### Controls previs a publicar

| Control | Condició d’acceptació |
|---|---|
| Identitat territorial | Totes les files pertanyen a l’ens previst; organismes relacionats separats |
| Esquema | Camps obligatoris presents; canvis de tipus bloquegen el transformador afectat |
| Paginació | Recompte rebut contrastat amb total anunciat o comprovació independent |
| Imports | Conversió sense errors silenciosos; negatius, anul·lacions i IVA explícits |
| Dates | Format conegut; anomalies marcades; no corregir per intuïció |
| Duplicació | Distinció de font, expedient, lot, fase i versió; no sumar rèpliques |
| Pressupost | Una classificació i nivell; totals reconciliats amb una mostra documental |
| Citacions | Cada registre visible conserva font, captura i localitzador suficient |
| Relacions | Cada unió automàtica explica la clau; ambigüitats visibles i reversibles |
| Privacitat | El paquet públic exclou DNI/NIF personals, signatures, adreces particulars i notes privades no autoritzades |
| Actualitat | Cobertura i captura separades; avís de font desactualitzada |

Qualitat per dimensió: integritat, cobertura, actualitat, precisió d’extracció i solidesa de la relació. No es mostraran percentatges inventats de «confiança de la IA». Es poden mostrar taxes observades de camps informats, amb denominador i criteri d’aplicabilitat.

Per a extracció documental: cada valor utilitzat en un indicador inicial s’ha de contrastar amb la pàgina original. Els documents escanejats requeriran OCR local i revisió; un número dubtós queda pendent, no entra al gràfic. En actes, distingir proposta, debat, votació i acord efectiu.

Fórmules inicials: execució de despesa = obligacions reconegudes netes / crèdit definitiu; pagament = pagaments líquids / obligacions reconegudes netes. Només calcular si s’han validat les magnituds i el període. Denominador zero o desconegut → «no calculable». No sumar percentatges ni combinar anys acumulats. Un pressupost anunciat per al 2027 no es tractarà com aprovat sense document d’aprovació.

Circuit de revisió: detectat → pendent → revisat → confirmat com a dada/patró o descartat. La revisió d’un patró no el transforma en una irregularitat demostrada. Les conclusions jurídiques exigeixen evidència i criteri específics.

## 12. Riscos legals i tècnics

### Riscos concrets i resposta de disseny

| Risc del projecte | Mesura concreta |
|---|---|
| Reutilitzar sense les condicions de la font | Guardar llicència per recurs, atribució, data i transformacions; comprovar també drets de documents adjunts |
| Creuar dades per identificar persones ocultes | Prohibir completar NIF emmascarats, inferir identitats o unir dades per revertir anonimització |
| Indexar ajuts socials, menors o salut presents en actes | Excloure del corpus públic aquests fragments/registres; prioritzar versions anonimitzades; aturar la ingestió afectada i revisar localment |
| Tractar un autònom com una societat | Tipus de subjecte i política específica; NIF personal fora de publicació i cerca pública |
| Publicar dades laborals excessives | Analitzar llocs, grups i imports normatius de RLT; no nòmines individuals, baixes ni dades personals alienes a la finalitat |
| Atribuir corrupció a un proveïdor a partir d’un patró | Llenguatge descriptiu, revisió humana, context, evidència contrària i canal de rectificació |
| Mantenir dades retirades de la font | Política de retenció per categoria; retirada efectiva de paquets, índexs i còpies quan pertoqui |
| Resums d’IA amb afirmacions falses | Fragments citats, prova de fidelitat, possibilitat d’abstenir-se i cap publicació automàtica |
| Scraping fràgil o intrusiu | APIs prioritàries, ritme limitat, memòria cau i respecte de condicions; no esquivar autenticació, CAPTCHA ni límits |
| Desplegar dades privades dins d’un web estàtic | Exportador amb llista de camps admesos i inspecció del paquet final; no confiar en ocultació visual |

La Llei 37/2007 contempla condicions d’atribució, actualització i protecció de la informació, inclosa la no reversió de dissociació en els termes aplicables. Això afecta directament els identificadors ocults del CSV de proveïdors. [Articles 3 i 8](https://www.boe.es/buscar/act.php?id=BOE-A-2007-19814).

El fet que una dada sigui accessible públicament no elimina les obligacions de finalitat, base jurídica, minimització i conservació. Abans d’obrir al públic un cercador amb noms de persones físiques, cal definir qui és responsable del tractament, justificar-ne la necessitat i la base jurídica, informar i habilitar l’exercici de drets. L’ús exclusivament local tampoc s’ha de donar automàticament per exempt. [RGPD, articles 5, 6, 14, 17, 25 i 32](https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX%3A32016R0679).

La transparència catalana distingeix categories especialment protegides i altres dades personals amb ponderació. Les obligacions de l’Ajuntament no autoritzen sense més qualsevol republicació privada massiva. Una sol·licitud d’accés ben delimitada pot obtenir camps necessaris que no són oberts, amb els límits que corresponguin. [Llei 19/2014, articles 23–24 i dret d’accés](https://www.boe.es/buscar/act.php?id=BOE-A-2015-470).

Les alertes sobre contractes menors s’han de calcular sobre la magnitud jurídica correcta i la norma vigent en la data del contracte. L’article 118 actual fixa valor estimat inferior a 40.000 € en obres i 15.000 € en serveis/subministraments; això no converteix una factura propera al llindar en fraccionament. La valoració exigeix examinar objecte, necessitat i expedient; no basta sumar factures d’un proveïdor. [LCSP, articles 99, 101 i 118](https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902).

El risc reputacional augmenta si es publiquen rànquings amb qualificatius o hipòtesis sense context. El sistema ha d’exportar també limitacions i estat de revisió; el simple avís «generat per IA» no substitueix la diligència. [Protecció del dret a l’honor, article 7](https://www.boe.es/buscar/act.php?id=BOE-A-1982-11196).

**Peticions d’accés que aportarien valor:** diccionari i periodicitat real del registre de factures; CSV de factures amb identificador d’expedient/aplicació si és jurídicament facilitables i anonimitzats; exportació d’execució per aplicació i projecte; índex de decrets publicables; explicació de dates i cobertura de les sèries. Són propostes per preparar, no s’ha enviat cap petició.

## 13. Proposta de MVP

### Abast tancat de construcció

**MVP: cercador d’assumptes, contractació publicada, pressupost/execució per capítols, fonts i dossiers personals.** Per defecte, 2022–2026 per a contractació i sessions; 2022–2026 per a pressupostos i 2022–2025 per a liquidacions comparables. El catàleg de fonts indicarà l’històric anterior disponible.

Inclou:

1. Ingestió PSCP i RPC de l’Ajuntament amb normalització de lots i observacions separades; execució PSCP relacionada quan sigui inequívoca.
2. Pressupost i liquidació per capítols, amb font i classificació explícites; referències als PDFs municipals.
3. Catàleg de sessions, ordres del dia i documents dels plens del període, cercable per text i expedient. Incorporar JGL en el mateix període només després del filtre de privacitat; els documents no revisats queden com a enllaç de font sense text indexat.
4. Fitxa d’expedient amb cronologia i relacions documentades.
5. Dossier al navegador, notes i exportació CSV/JSON/Markdown.
6. Panell de fonts, cobertura, incidències i canvis entre captures.
7. Procés d’actualització executable en local i preparat per programar-se; paquet estàtic desplegable a Netlify.

**Factures i proveïdors són el primer increment posterior, no una dependència de l’èxit del MVP.** El volum està verificat, però les dates, la cobertura i la privacitat requereixen resoldre un adaptador específic abans de publicar-los. Si s’hi afegeix una mostra al desenvolupament, serà una prova interna i no una funcionalitat promesa d’entrada.

Fora: xat genèric amb IA, transcripció de tots els vídeos, OCR massiu, mapa d’influències, detecció automàtica d’il·legalitat, pagaments inferits, col·laboració amb comptes, avisos per correu i comparadors de tots els municipis.

### Dependències i ordre de construcció

| Ordre | Lliurable | Porta d’acceptació | Dificultat |
|---|---|---|---|
| 1 | Contractes de dades, manifest de fonts i mostra mínima | Claus, dates, imports i privacitat verificats | Mitjana |
| 2 | Adaptadors PSCP/RPC i pressupost/liquidació | Captura completa, idempotència i càlculs conciliats | Mitjana-alta |
| 3 | Catàleg documental municipal | Cobertura llistada, localitzadors i cap dada personal indeguda exportada | Alta |
| 4 | Interfície, cerca i filtres | Escenaris d’investigació resolts sobre dades reals | Mitjana |
| 5 | Dossiers i exportació | Còpia/restauració de dossier i citacions preservades | Mitjana |
| 6 | Diferències, controls i publicació estàtica | Error d’una font no corromp la versió publicada | Mitjana |
| 7 | Previsualització i desplegament | Revisió del paquet publicable i configuració de l’allotjament | Baixa-mitjana |

No cal adquirir serveis per començar a construir localment. Per desplegar cal accés a l’allotjament escollit; per a actualització desatesa cal executor i arxiu persistent. Si encara no hi són, es lliurarà el mateix procés amb execució manual i estat explícit, sense fingir que l’automatització està activa.

### Proves d’acceptació del MVP

- Cercar `CONT2400054`, mostrar lots 1 i 2 i arribar a la sessió de 31/03/2026; la modificació es descriu segons l’evidència efectivament llegida, sense convertir l’ordre del dia en acord.
- Filtrar contractació per exercici i procediment, exportar les mateixes files i explicar el denominador del total.
- Mostrar, per a un exercici tancat validat, crèdit definitiu i obligacions per capítol; reproduir la taxa d’execució contra el document original amb precisió de cèntim als imports.
- Donar accés a l’original de tots els registres d’una mostra revisada; cada registre del paquet ha de tenir font i captura no buides.
- Una segona ingestió sense canvis no duplica registres ni genera novetats.
- Simular una fallada o resposta truncada i conservar l’última publicació vàlida, amb avís d’antiguitat.
- Detectar un document modificat conservant la relació de versions; retirar material no publicable també de l’índex.
- Exportar i importar un dossier sense perdre notes, URLs ni estats de revisió.
- Navegar amb teclat i mòbil; cerca amb objectiu inferior a dos segons un cop carregat l’índex en el dispositiu de prova, mesurat i no promès abans.
- Generar una carpeta estàtica que funcioni en una previsualització de Netlify, sense secrets ni consultes directes obligatòries a portals externs.

El MVP és de dificultat global **mitjana-alta**: la interfície és assequible; els riscos se situen en semàntica comptable, identitats, documents i cobertura. No s’ha fet una estimació temporal vinculant perquè encara no s’ha mesurat l’extracció documental del corpus.

## 14. Roadmap posterior

1. **Facturació i proveïdors:** resoldre dates amb CSV original, documentar retard, separar empreses i persones i validar una mostra d’enllaços. Activar només les consultes que no impliquin una falsa conciliació contractual.
2. **Convenis i subvencions:** integrar codis de conveni i BDNS/RAISC, distingint Ajuntament concedent de beneficiari, i evitant duplicats entre registres.
3. **Execució detallada i projectes:** incorporar aplicacions i codis de projecte quan es disposi de les correspondències; seguir inversions plurianuals.
4. **Comparació municipal:** seleccionar grup de comparació per població, serveis, estructura territorial i perímetre comptable. Comparar anys tancats i definicions comunes; no fer un rànquing de «bona gestió» automàtic.
5. **IA documental:** conjunt de proves amb resums revisats, abstenció i citacions exactes abans d’oferir assistència oberta.
6. **Col·laboració i notificacions:** comptes, dossiers compartits, permisos i alertes externes amb consentiment.
7. **Territori i patrimoni:** cartografia vinculada a projectes només quan hi hagi localització fiable i una pregunta que el mapa ajudi a resoldre.

Cada increment exigeix dades i un cas d’ús validats. Cap etapa pressuposa que una API pendent existirà o que un model de llenguatge suplirà els camps que no es publiquen.

## 15. Preguntes i decisions abans de construir

Les propostes següents són **valors per defecte explícits**, no preferències atribuïdes a Dani. Permeten començar localment amb «Construeix el MVP» i revisar després les decisions de publicació.

| Decisió | Proposta per defecte | Moment en què cal tancar-la |
|---|---|---|
| Finalitat i públic | Ús investigador personal amb capa de consulta preparada per publicar | Abans de fer accessible el web a tercers |
| Nom | Observatori de Castellar, provisional | Abans de domini i identitat definitiva |
| Allotjament | Compatible amb Netlify; alternativa Cloudflare Pages | Abans del desplegament real |
| Actualització visible | Setmanal si es vol començar amb Netlify Free | Abans d’activar el planificador |
| Període inicial | 2022–2026 amb anys tancats separats | Pot començar la implementació |
| Fonts del MVP | Contractació, pressupost/liquidació i sessions | Pot començar la implementació |
| Factures | Primer increment després de resoldre qualitat i privacitat | Abans d’afegir el mòdul |
| Dossiers | Locals al navegador amb exportació | Abans de demanar treball entre dispositius |
| IA | Desactivada en el MVP | Abans d’enviar documents a cap proveïdor |
| Despesa | No contractar cap servei de pagament automàticament | Quan el volum real requereixi cost |
| Responsable del web i tractament | Encara no determinat | Necessari abans de publicació amb dades personals |

Les preguntes que més poden canviar l’abast són: serà una eina només teva o oberta a tothom; necessites novetats diàries o n’hi ha prou amb setmanals; i vols dossiers compartits entre dispositius. Cap d’aquestes qüestions impedeix construir el nucli local descrit. Sí que condicionen el desplegament i l’autenticació.

**Verificació de l’encàrrec:** els 15 blocs estan desenvolupats; les fonts centrals s’han contrastat amb respostes reals; les unions no demostrades estan etiquetades; Netlify té una via de desplegament definida; no s’ha construït l’aplicació. Les proves tècniques efectuades validen disponibilitat i alguns límits de les dades, no el funcionament d’un MVP que encara no existeix.
