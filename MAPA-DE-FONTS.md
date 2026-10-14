# Mapa de fonts municipals i supramunicipals

**Castellar del Vallès · Consulta: 13/10/2026.** Annex de l’[estudi de viabilitat](./ESTUDI-DE-VIABILITAT.md).

Les qualificacions de qualitat i automatització són valoracions de viabilitat. «API comprovada» significa resposta llegida, no servei garantit. «API documentada» significa documentació localitzada, sense integrar-la. «No verificada» no significa inexistent. Les freqüències que es proposen per capturar no són compromisos de l’editor. Els recomptes descriuen l’estat observat, no el volum real complet de l’activitat municipal.

## Fonts municipals i dades centrals

### F01. Web i seu municipals

[Web municipal](https://www.castellarvalles.cat/) · [Seu municipal](https://seu.castellarvalles.cat/).

**Responsable:** Ajuntament. **COMPROVAT, pàgines:** notícies, serveis, organització, pressupost, planejament i enllaços als portals especialitzats. **Temps:** continguts històrics i actuals; extrems no inventariats. **Format/descàrrega:** HTML i adjunts segons secció. **API:** no verificada per al web general. **Actualització:** segons publicació; sense freqüència global fiable. **Qualitat:** útil per descobrir i contextualitzar, però una notícia no substitueix l’acord. **Automatització:** mitjana, HTML canviant. **Claus:** URL, identificador de notícia/document, dates i expedients quan consten.

### F02. Portal de transparència

[Portal](https://www.seu-e.cat/web/castellardelvalles) · [Mapa d’ítems](https://www.seu-e.cat/web/castellardelvalles/mapa-web).

**Responsable:** Ajuntament, plataforma AOC. **COMPROVAT, estructura:** gestió econòmica, contractació, organització, personal, normativa, participació i patrimoni. **Temps:** variable per ítem. **Format/descàrrega:** HTML, adjunts i taules de dades. **API:** els datasets vinculats sí; no s’ha validat una API de tot el contingut editorial. **Actualització:** per ítem; no equiparar data de pàgina amb data de dades. **Qualitat:** índex extens, exhaustivitat de cada apartat no certificada. **Automatització:** mitjana. **Claus:** codi d’ens, URL i recurs AOC.

### F03. Catàleg de dades obertes

[Catàleg municipal](https://www.seu-e.cat/web/castellardelvalles/dades-obertes) · [Consulta CKAN municipal comprovada](https://dadesobertes.seu-e.cat/api/3/action/package_search?fq=organization%3Acastellardelvalles&rows=100).

**Responsables:** editors municipals/AOC. **COMPROVAT, API:** 12 datasets propis; també hi ha conjunts globals aplicables al municipi. **Temps:** metadades actuals; cobertura per recurs. **Format/descàrrega:** catàleg JSON, recursos CSV i DataStore JSON. **Actualització:** metadades variables; última data no acredita noves files. **Qualitat:** alta per descoberta i esquema, irregular per dades. **Automatització:** alta. **Claus:** `name`, ID de paquet, `resource_id`, `CODI_ENS`. Producció: `dadesobertes.seu-e.cat`; no utilitzar resultats de dominis `dev` o `pre` com a fonts de producció.

### F04. Registre municipal de factures

[Fitxa](https://dadesobertes.seu-e.cat/dataset/castellardelvalles-factures) · [CSV original](https://dadesobertes.seu-e.cat/csv/castellardelvalles/factures_dop.csv).

**Responsable:** Ajuntament. **COMPROVAT, dades:** 28.552 files; exercicis 2019–2026; màxim registre real del CSV 07/04/2026. **Format/API:** CSV i CKAN, tots dos consultats. **Actualització:** metadades 30/09/2026, periodicitat efectiva no demostrada. **Qualitat:** mitjana-baixa en dates i actualitat; imports textuals. **Automatització:** alta per CSV amb validació. **Claus:** exercici, número, nom d’emissor, dates, import, ens; sense NIF, contracte o partida. **Llicència:** `cc-by` en metadades. No són PDFs de factures ni prova de pagament.

### F05. Relació anual de proveïdors

[Fitxa](https://dadesobertes.seu-e.cat/dataset/castellardelvalles-proveidors) · [CSV](https://dadesobertes.seu-e.cat/csv/castellardelvalles/proveidors_dop.csv).

**Responsable:** Ajuntament. **COMPROVAT, dades:** 5.558 files, 2019–2026. **Format/API:** CSV i CKAN consultats. **Actualització:** metadades 30/09/2026; ritme efectiu no comprovat. **Qualitat:** identificadors absents/emmascarats i imports textuals; 2026 no assumit complet. **Automatització:** alta per lectura, condicionada per identitats. **Claus:** exercici, `CIF_EMPRESA`, nom i ens. **Llicència:** `cc-by`. No equival al conjunt de contractes adjudicats ni permet deduir beneficiari final d’una societat.

### F06. Convenis municipals

[Fitxa](https://dadesobertes.seu-e.cat/dataset/castellardelvalles-convenis-col-laboracio) · [CSV](https://dadesobertes.seu-e.cat/csv/castellardelvalles/convenis_dop.csv).

**Responsable:** Ajuntament. **COMPROVAT, API:** 283 files; dates d’inici observades 2015–2025, no garantia de corpus complet. **Format/API:** CSV/CKAN. **Actualització:** metadades 30/09/2026; periodicitat efectiva no verificada. **Qualitat:** mitjana; finals absents o sentinella. **Automatització:** alta per catàleg; documents originals s’han de localitzar. **Claus:** `CODI_EXPEDIENT`, títol, descripció, estat i vigència. **Límit:** no s’ha observat import ni NIF de signants en l’esquema. `license_id=notspecified`: aclarir condicions de reutilització abans de republicar massivament.

### F07. Perfil del contractant

[Perfil PSCP de Castellar](https://contractaciopublica.cat/ca/perfils-contractant/detall/castellarvalles?categoria=0).

**Responsables:** Ajuntament publica; Generalitat gestiona PSCP. **COMPROVAT, portal:** licitacions, fases, contractació programada i documentació. **Temps:** expedients històrics i vigents; cobertura completa no mesurada. **Format/descàrrega:** HTML dinàmic i documents. **API:** s’utilitzaran F08/F09 i enllaços de dades publicats, no endpoints interns deduïts. **Actualització:** per esdeveniment. **Qualitat:** alta com a documentació primària; interpretar fase i versió. **Automatització:** alta amb datasets, mitjana-baixa si cal navegar HTML. **Claus:** òrgan `3411306`, expedient, lot i ID de publicació.

### F08. Publicacions PSCP

[Fitxa oficial federada](https://datos.gob.es/ca/catalogo/a09002970-contratacion-publica-en-catalunya-publicaciones-en-la-plataforma-de-servicios-de-contratacion-publica) · [Esquema consultat](https://analisi.transparenciacatalunya.cat/api/views/ybgg-dgi6.json).

**Responsable:** Generalitat, amb informació dels òrgans. **COMPROVAT, API:** 698 files municipals; 306 etiquetades com contracte menor. **Temps:** hi ha dates d’adjudicació des de 2016; el màxim retornat és 09/12/2026, posterior a l’estudi, i requereix contrast. No es dona aquest extrem per vàlid. **Format/descàrrega:** JSON, CSV i XML anunciats. **Actualització:** diària declarada. **Qualitat:** bona estructura, camps buits i fases heterogènies. **Automatització:** alta. **Claus:** òrgan, `id_intern`, expedient, lot, identificació d’adjudicatari, CPV, DIR3, URL.

### F09. Execució contractual PSCP

[Fitxa oficial](https://datos.gob.es/catalogo/a09002970-contratacion-publica-en-cataluna-publicaciones-de-la-fase-de-ejecucion-en-la-plataforma-de-servicios-de-contratacion-publica) · [Esquema](https://analisi.transparenciacatalunya.cat/api/views/8idu-wkjv.json).

**Responsable:** Generalitat/òrgans publicadors. **COMPROVAT, API:** 128 actuacions per l’òrgan municipal, 76 expedients diferents. **Temps:** extrems temporals no perfilats; 13 dates buides. **Format/descàrrega:** Socrata JSON, exportacions del catàleg. **Actualització:** no contrastada individualment. **Qualitat:** útil però cobertura no exhaustiva; 23 imports buits. **Automatització:** alta. **Claus:** òrgan, expedient, lot, tipus d’actuació, data i URL JSON. Una pròrroga no és una nova adjudicació a sumar al recompte de contractes.

### F10. Registre públic de contractes

[Fitxa RPC](https://datos.gob.es/es/catalogo/a09002970-contratacion-de-catalunya) · [Esquema actual](https://analisi.transparenciacatalunya.cat/api/views/hb6v-jcbf.json).

**Responsable:** Generalitat. **COMPROVAT, API:** 791 files municipals, exercicis 2017–2026, 630 codis d’expedient diferents. **Format/descàrrega:** JSON consultat; CSV/XML anunciats. **Actualització:** diària declarada. **Qualitat:** bona per contrast, no equivalència automàtica amb PSCP. **Automatització:** alta. **Claus:** `id_organisme_contractant=0805170005`, expedient, lot, situació contractual i exercici. L’esquema no inclou un NIF separat d’adjudicatari. Evitar donar per vigents identificadors de datasets antics sense comprovar-los.

### F11. Pressupostos estructurats AOC

[Fitxa](https://dadesobertes.seu-e.cat/dataset/ge-p-pressupostos-per-programes-detallat) · [Esquema verificat](https://dadesobertes.seu-e.cat/api/3/action/datastore_search?resource_id=595f8620-7a3c-4e38-8be2-7cffa744cd44&limit=0).

**Responsable de publicació:** AOC, conjunt supramunicipal; procedència comptable detallada pendent de contrastar amb metadades i documents. **COMPROVAT, dades:** 3.847 files de Castellar, 2022–2026. **Format/descàrrega/API:** CSV i CKAN. **Actualització:** anual pel contingut; freqüència de refresc no verificada. **Qualitat:** bona estructura, jerarquies que impedeixen sumar totes les files. **Automatització:** alta. **Claus:** ens, any, tipus de partida, classificació, codi, nivell i estructura. Les dues distribucions del catàleg poden referenciar el mateix CSV: no sumar-les.

### F12. Liquidacions estructurades AOC

[Detall econòmic i per programes](https://dadesobertes.seu-e.cat/dataset/ge-p-liquidacions-per-programes-detallat) · [Execució per capítols](https://dadesobertes.seu-e.cat/dataset/liquidacio-del-pressupost-execucio-per-capitols).

**Responsable de publicació:** AOC. **COMPROVAT, dades:** 5.622 files detallades i 252 per capítols; anys 2010–2025. **Format/descàrrega/API:** CSV i CKAN comprovats. **Actualització:** anual pel contingut, refresc no verificat. **Qualitat:** mitjana; camps buits i classificacions de diferents nivells. **Automatització:** alta. **Claus:** iguals que F11; per capítols, ens+any+ingrés/despesa+capítol. Cal interpretar `IMPORT_REC_PAG`, `IMPORT_DRET_OBLIG` i `IMPORT_PREV_CRED` amb diccionari i conciliació documental.

### F13. Pressupostos municipals originals

[Pressupost 2026 i històric](https://seu.castellarvalles.cat/36318/descriptiu/).

**Responsable:** Ajuntament. **COMPROVAT, pàgina i documents llistats:** ingressos, despeses, annex d’inversions, bases, aprovacions i modificacions. **Temps:** índex 2009–2026; no s’han obert tots els exercicis. **Format/descàrrega:** PDF. **API:** no verificada. **Actualització:** anual i per modificacions. **Qualitat:** alta com a original, explotació tabular pendent de prova. **Automatització:** mitjana; extracció i conciliació. **Claus:** any, classificacions orgànica/econòmica/programes i codi d’aplicació quan apareix. No confondre proposta, aprovació inicial i definitiva.

### F14. Execució trimestral municipal

[PDF d’execució 2024](https://seu.castellarvalles.cat/arxius/document/10016/arxiu/estat_dexecucio_per_trimestres_2024.pdf).

**Responsable:** Ajuntament. **COMPROVAT, document:** taules de pressupost, obligacions i pagaments per capítols. **Temps:** 2024 comprovat; disponibilitat exacta de tots els trimestres 2025–2026 NO VERIFICADA. **Format/descàrrega:** PDF amb text/tabulació llegible en la consulta. **API:** no verificada. **Actualització:** trimestral per naturalesa; compliment del calendari no verificat. **Qualitat:** bona per contrast de totals, pendent d’extracció sistemàtica. **Automatització:** mitjana. **Claus:** ens, exercici, data de tall i capítol. Un estat acumulat no se suma amb l’acumulat anterior.

### F15. Compte general i rendició

[Compte 2024 de Castellar](https://www.rendiciondecuentas.es/es/consultadeentidadesycuentas/buscarCuentas/consultarCuenta.html?ejercicio=2024&idEntidad=913) · [Sessió amb compte 2025](https://actes.castellarvalles.cat/session/sessionDetail/8a8180849f645b94019f656b96920008).

**Responsables:** Ajuntament i plataforma de rendició dels òrgans de control extern. **COMPROVAT, fitxa 2024:** dates de tramitació i enviament; localitzada sessió 2026 sobre el compte 2025. **Temps:** aquests exercicis comprovats, historial complet pendent. **Format/descàrrega:** consulta HTML i accés a comptes segons disponibilitat; descàrrega integral no provada. **API:** no verificada. **Actualització:** anual. **Qualitat:** font de contrast institucional; presentar un compte no equival a auditoria favorable. **Automatització:** mitjana-baixa. **Claus:** `idEntidad=913`, exercici i ens.

### F16. Subvencions municipals històriques

[Subvencions municipals](https://seu.castellarvalles.cat/36329/descriptiu/).

**Responsable:** Ajuntament. **COMPROVAT, enllaç:** XLSX de relació de subvencions 2009–2022 i accessos a dades obertes actuals. **Format/descàrrega:** XLSX anunciat; no s’han inspeccionat els fulls. **API:** via fonts vinculades, no l’Excel mateix. **Actualització:** per convocatòria/concessió; periodicitat del fitxer no verificada. **Qualitat:** pendent d’auditoria interna del llibre. **Automatització:** probablement alta per taules, encara no demostrada. **Claus:** no verificades al fitxer. No ingerir justificacions amb nòmines o identificadors personals.

### F17. Concessions de subvencions replicades per l’AOC

[Fitxa MINHAP/AOC](https://dadesobertes.seu-e.cat/dataset/cc-c-concessions-subvencions-i-ajuts-minhap) · [Esquema](https://dadesobertes.seu-e.cat/api/3/action/datastore_search?resource_id=30798421-5952-4420-a769-d1121beb6534&limit=0).

**Responsables:** AOC republica informació estatal. **COMPROVAT, API filtrada:** 686 files; dates de concessió 17/05/2022–31/07/2026. **Format/descàrrega:** CSV/JSON. **Actualització:** no verificada. **Qualitat:** mitjana; s’ha auditat cobertura, no contingut de beneficiaris. **Automatització:** alta. **Claus:** ens, data, títol i aplicació; no s’ha observat codi BDNS en aquest esquema. Cal confirmar el paper de l’ens en la dada abans d’etiquetar-la com atorgada o rebuda. No deduplicar únicament per import/data.

### F18. BDNS / SNPSAP

[Documentació API](https://www.infosubvenciones.es/bdnstrans/doc/swagger) · [Especificació JSON llegida](https://www.infosubvenciones.es/bdnstrans/estaticos/doc/snpsap-api.json).

**Responsable:** IGAE, Ministeri d’Hisenda. **COMPROVAT, documentació:** cerca i exportació de convocatòries i concessions, consulta d’òrgans. **Temps:** cobertura específica de Castellar NO VERIFICADA directament. **Format/descàrrega:** API i exportacions documentades. **Actualització:** segons comunicacions; retard local no mesurat. **Qualitat:** primària per subvencions, identificacions i períodes de publicitat amb restriccions. **Automatització:** alta un cop validats paràmetres. **Claus:** identificador de convocatòria, òrgan i identificadors publicables. Cal cercar separadament Ajuntament concedent i Ajuntament beneficiari.

### F19. RAISC

[Registre](https://economia.gencat.cat/ca/ambits-actuacio/ajuts-subvencions/registre/index.html) · [Concessions i dades reutilitzables](https://economia.gencat.cat/ca/ambits-actuacio/ajuts-subvencions/registre/concessions/).

**Responsable:** Generalitat. **COMPROVAT, documentació:** subvencions i ajuts, publicació tabular; visualitzadors dels darrers cinc exercicis. **Temps:** registre amb informació des de 2016; cobertura municipal concreta no auditada. **Format/descàrrega:** taules reutilitzables anunciades. **API:** recurs municipal no provat. **Actualització:** per comunicació; cadència no contrastada. **Qualitat:** útil per finançament rebut, amb exclusions metodològiques. **Automatització:** probable, pendent de recurs concret. **Claus:** òrgan, convocatòria i beneficiari quan s’hi publiquen. No sumar RAISC i BDNS sense deduplicar.

### F20. Registre català de convenis

[Dataset `exh2-diuf`](https://analisi.transparenciacatalunya.cat/es/Sector-P-blic/Registre-de-convenis-de-col-laboraci-i-cooperaci-/exh2-diuf) · [Cercador oficial](https://web.gencat.cat/ca/generalitat/govern-obert/transparencia/publicitat-activa/contractes-convenis-i-subvencions/convenis/cercador-del-registre-de-convenis).

**Responsable:** Generalitat. **COMPROVAT, catàleg:** convenis i encàrrecs; incorpora ens locals des de 2016 segons la descripció. **Temps municipal:** no perfilat. **Format/descàrrega:** portal de dades i documents vinculats; exportació concreta no provada. **API:** Socrata probable, endpoint no comprovat. **Actualització:** no verificada. **Qualitat:** font de contrast; no assumir que contingui tots els convenis municipals. **Automatització:** probable alta per taula. **Claus:** número de registre i signants, esquema exacte pendent; no confondre amb codi municipal `CONV...`.

### F21. Plens, JGL i vídeoactes

[Portal de sessions](https://actes.castellarvalles.cat/session/portadaPublica) · [Abast anunciat](https://seu.castellarvalles.cat/41781/descriptiu/).

**Responsable:** Ajuntament. **COMPROVAT:** portal amb sessions de Ple i JGL, ordres del dia, documents i vídeos de Ple. **Temps:** des de 01/01/2018 segons Ajuntament; exhaustivitat no auditada. **Format/descàrrega:** HTML, documents i reproducció audiovisual. **API:** pública documentada no localitzada. **Actualització:** per sessió, amb retard de publicació variable. **Qualitat:** alta per evidència documental; no pressuposa transcripció completa. **Automatització:** mitjana mitjançant HTML i enllaços. **Claus:** ID de sessió, `PLE...`/`JGL...`, punt i expedients. Preferir actes anonimitzades; no indexar dades de signatures.

### F22. Actes anteriors a 2018

[Índex i derivació a l’arxiu](https://seu.castellarvalles.cat/41781/descriptiu/) · [Exemple de Ple de 2009](https://seu.castellarvalles.cat/en/21978/acord/342/).

**Responsable:** Ajuntament. **COMPROVAT:** arxiu separat amb acords i PDFs. **Temps:** secció titulada 1976–2017; exemple 2009 llegit, sense comprovació de tots els anys. **Format/descàrrega:** HTML/PDF. **API:** no verificada. **Actualització:** corpus històric, possibles correccions. **Qualitat:** variable, formats antics. **Automatització:** mitjana-baixa; OCR només si cal. **Claus:** sessió, data, ID local i referències d’expedient. Fora del primer període del MVP.

### F23. Decrets i resolucions

[Ordre del dia amb rang de resolucions](https://actes.castellarvalles.cat/session/sessionDetail/8a8180849d1882b2019d29b61c150051) · [Indicadors municipals de transparència](https://www.castellarvalles.cat/31813/descriptiu/-2093/).

**Responsable:** Ajuntament. **COMPROVAT:** referències al coneixement de rangs de resolucions en sessions. **NO VERIFICAT:** corpus íntegre dels decrets, exportació massiva i API. **Temps:** exemples 2026, cobertura general desconeguda. **Format:** text de sessió; originals individuals no auditats. **Actualització:** no determinada. **Qualitat:** insuficient per cercar tots els decrets. **Automatització:** baixa sense font completa. **Claus:** número+any+òrgan si es publica. Aquesta mancança s’ha de mostrar i, si és prioritària, preparar una petició d’accés.

### F24. Personal, estructura i retribucions

[RLT i retribucions](https://seu.castellarvalles.cat/45154/descriptiu/) · [Junta de govern](https://seu.castellarvalles.cat/21901/organitzacio/).

**Responsable:** Ajuntament. **COMPROVAT, enllaços:** plantilla 2026, RLT 2026 amb imports totals en XLSX, retribucions i estructura. **Temps:** índex de retribucions 2016–2026; fulls no auditats. **Format/descàrrega:** XLSX/PDF/HTML. **API:** no verificada per RLT. **Actualització:** anual i per modificacions. **Qualitat:** bona disponibilitat documental; no equival a nòmines efectivament percebudes. **Automatització:** probable mitjana-alta per RLT. **Claus:** codi de lloc, grup i vigència, pendents d’inspecció del full. Publicació centrada en llocs i càrrecs, no expedients personals.

### F25. Patrimoni municipal

[Inventari general](https://seu-e.cat/ca/web/castellardelvalles/govern-obert-i-transparencia/gestio-economica/patrimoni/inventari-general-del-patrimoni).

**Responsable:** Ajuntament. **COMPROVAT, índex:** toms i rectificacions amb referències a tancaments 2020, 2022, 2023, 2024 i 2025. **Format/descàrrega:** documents, principalment PDF; no tots oberts. **API:** no verificada. **Actualització:** anual o amb modificacions. **Qualitat:** documental alta, explotació estructurada pendent. **Automatització:** mitjana-baixa. **Claus:** identificador de bé i referència cadastral si consten, no validades com a clau global. Distingir inventari de béns municipals de catàleg de patrimoni arquitectònic protegit.

### F26. Plans, projectes, obres i indicadors de seguiment

[Plans municipals](https://seu.castellarvalles.cat/43978/plansEstrategics/) · [Seguiment de pressupostos participatius](https://castellarvalles.cat/26428/indicador/351/).

**Responsable:** Ajuntament. **COMPROVAT:** PAM 2023–2027, plans sectorials i actuacions; XLSX d’evolució participativa 2016–2024 anunciat. **Format/descàrrega:** HTML/PDF/XLSX segons recurs. **API:** no verificada per execució de projectes. **Actualització:** variable per pla. **Qualitat:** útil per objectius, no prova de realització ni cost final. **Automatització:** mitjana per catàleg, baixa per relacions de projecte. **Claus:** títol, mandat, acció i expedient si existeix; concordança manual inicial. Obres també a PSCP i acords, sense presumir un registre únic.

## Fonts supramunicipals de contrast i context

### F27. Idescat

[Castellar i codis](https://www.idescat.cat/codis/?c=080517&id=50&lang=es&n=9&t=01-01-2025) · [API d’El municipi en xifres](https://www.idescat.cat/dev/api/emex/).

**Responsable:** Idescat. **COMPROVAT:** municipi `080517`, ajuntament `0805170005`, informació estadística i documentació API. **Temps:** diferent per indicador; fitxa territorial 2025 comprovada. **Format/descàrrega:** HTML i formats de l’API documentada. **Actualització:** segons operació estadística. **Qualitat:** alta, amb definicions i anys de referència. **Automatització:** alta, resposta concreta d’indicadors pendent. **Claus:** codi territorial, indicador, unitat i període. Adequat per denominadors i comparacions, no per atribuir causalitat a una política.

### F28. Diputació: HERMES, dades obertes i suport municipal

[HERMES](https://www.diba.cat/ca/web/hermes/) · [API de dades obertes](https://do.diba.cat/) · [Catàleg](https://dadesobertes.diba.cat/).

**Responsable:** Diputació de Barcelona. **COMPROVAT, portals:** indicadors socioeconòmics i infraestructura d’API. **Temps:** variable; sèrie concreta de Castellar pendent. **Format/descàrrega:** consultes estadístiques i recursos del catàleg. **API:** documentada per dades obertes; no assumir que totes les sèries HERMES siguin a la mateixa API. **Actualització:** mensual, anual o específica segons producte; no auditada. **Qualitat:** alta en definicions, comparabilitat pendent. **Automatització:** mitjana-alta segons recurs. **Claus:** municipi, indicador i període. Ajuts de Diputació: contrastar concessions a BDNS i acords, sense API de finançament municipal validada aquí.

### F29. BOPB i CIDO

[Anunci pressupostari de Castellar](https://bop.diba.cat/anunci/3566630/aprovacio-definitiva-del-pressupost-general-i-la-plantilla-de-personal-per-a-l-exercici-2024-ajuntament-de-castellar-del-valles) · [Exemple contractual CIDO](https://cido.diba.cat/contractacio/13172733/subministrament-de-llumeneres-de-tecnologia-led-basat-en-acord-marc-adhesio-a-la-primera-prorroga-ajuntament-de-castellar-del-valles).

**Responsable:** Diputació. **COMPROVAT:** anuncis oficials i indexació transversal. **Temps:** exemple BOPB 2023 i CIDO històric; límits del corpus no inventariats. **Format/descàrrega:** HTML/PDF i enllaços. **API:** no verificada en aquesta recerca. **Actualització:** per publicació. **Qualitat:** BOPB és original per l’anunci; CIDO orienta al procediment i a fonts originals. **Automatització:** mitjana. **Claus:** número de registre BOPB, ID CIDO, ens, expedient i data. Evitar duplicar BOPB i la còpia indexada.

### F30. INE

[API JSON oficial](https://www.ine.es/dyngs/DAB/index.htm?cid=1099).

**Responsable:** Instituto Nacional de Estadística. **COMPROVAT, documentació:** accés a taules i sèries d’INEbase. **NO VERIFICAT:** selecció i resposta concreta de taules de Castellar en aquest estudi. **Temps/actualització:** segons operació; no hi ha una única sèrie temporal. **Format/descàrrega:** JSON i descàrregues de taules. **Qualitat:** alta amb metodologia, possibles revisions i canvis territorials. **Automatització:** alta després de fixar IDs de taula/sèrie. **Claus:** codi territorial i codi de sèrie. Conservar correspondència amb Idescat, sense barrejar codis de cinc i sis dígits.

### F31. Hisenda: pressupostos, liquidacions, deute i serveis

[CONPREL](https://serviciostelematicosext.hacienda.gob.es/SGFAL/CONPREL) · [Deute viu](https://www.hacienda.gob.es/es-ES/CDI/Paginas/SistemasFinanciacionDeuda/InformacionEELLs/DeudaViva.aspx) · [Oficina local, amb CESEL](https://www.hacienda.gob.es/es-es/areas%20tematicas/administracion%20electronica/oveell/paginas/oventidadeslocales.aspx).

**Responsable:** Ministeri d’Hisenda. **COMPROVAT, catàlegs:** avenç de liquidació 2025 i pressupost 2026, dades anuals de deute fins a 2025. **Format/descàrrega:** ACCESS comprimit per entitat, Excel d’agregats; deute XLS/XLSX. **API:** no verificada. **Actualització:** anual i revisions. **Qualitat:** alta per contrast comptable, amb perímetre i provisionalitat. **Automatització:** mitjana; convertir ACCESS fora del navegador. **Claus:** entitat i any, classificacions comptables. CESEL: canal de subministrament localitzat; extracció pública de Castellar no verificada. No confondre formularis interns de tramesa amb dades obertes.

### F32. Territori: geoportal, ICGC, MUC/RPUC i Cadastre

[Geoportal local](https://geoportal.castellarvalles.cat/) · [ICGC, divisions administratives](https://geoserveis.icgc.cat/vector01/rest/services/divisions_administratives_wfs/MapServer) · [MUC](https://territori.gencat.cat/ca/06_territori_i_urbanisme/observatori_territori/mapa_urbanistic_de_catalunya) · [RPUC](https://territori.gencat.cat/ca/06_territori_i_urbanisme/urbanisme/registre_de_planejament_urbanistic_de_catalunya_intern/instruccions_per_a_la_consulta_i_descarrega_de_documents) · [Serveis de Cadastre](https://www.catastro.hacienda.gob.es/ayuda/servicios_web.htm).

**Responsables:** Ajuntament, ICGC, Generalitat i Direcció General del Cadastre, respectivament. **COMPROVAT:** enllaç al geoportal, serveis cartogràfics i documentació de consulta urbanística/cadastral. **Temps:** vigència de cada capa o pla; historials municipals no auditats. **Format/descàrrega:** WMS/WFS a ICGC, documents RPUC, serveis cadastral no protegits; exportació del geoportal no verificada. **API:** serveis documentats, cap integració municipal provada. **Actualització:** variable. **Qualitat:** alta per geometria/planejament, no prova de titularitat. **Automatització:** mitjana-alta segons servei. **Claus:** codi municipal, expedient urbanístic, geometria i referència cadastral. No accedir a titulars protegits.

### F33. Observatori del Vallès Occidental

[Observatori comarcal](https://www.consellvallesoccidental.cat/observatori/) · [Municipis](https://www.consellvallesoccidental.cat/territori-i-habitatge/municipis/).

**Responsable:** Consell Comarcal. **COMPROVAT:** indicadors d’economia, població, treball i desigualtat dels municipis; Castellar inclòs a l’àmbit. **Temps:** informes actuals i històrics; cobertura segons sèrie. **Format/descàrrega:** HTML i informes descarregables. **API:** no verificada. **Actualització:** mensual, trimestral o anual segons producte. **Qualitat:** bona contextualització; respectar secret estadístic i canvis de metodologia. **Automatització:** mitjana per documents. **Claus:** municipi, indicador i període. Evitar usar agregats comarcals com si fossin municipals.

### F34. Òrgans de control i dret d’accés

[Referència municipal a informe de Sindicatura](https://seu-e.cat/ca/web/castellardelvalles/govern-obert-i-transparencia/gestio-economica/patrimoni/inventari-general-del-patrimoni) · [Resolució GAIP 2024/1422](https://www.gaip.cat/ca/detall/normativa/2024-1422) · [Informe municipal del Síndic de Greuges 2024](https://www.sindic.cat/site/unitFiles/10842/Informe%20VSS_Castellar%20del%20Valles_2024_ok.pdf).

**Responsables:** Sindicatura de Comptes, GAIP i Síndic de Greuges; institucions diferents. **COMPROVAT:** referència a informe patrimonial 2/2026, resolució d’accés i informe de greuges. **Temps:** documents concrets; historial exhaustiu no verificat. **Format/descàrrega:** HTML/PDF. **API:** no verificada. **Actualització:** per informe/resolució. **Qualitat:** alta per conclusions dins del seu abast; no extrapolar-les. **Automatització:** mitjana per descoberta, baixa per conclusions. **Claus:** número d’informe/resolució, exercici i ens. No incorporar relats personals de queixes al cercador públic.

### F35. Altres datasets municipals i e-FACT

[Catàleg propi](https://dadesobertes.seu-e.cat/api/3/action/package_search?fq=organization%3Acastellardelvalles&rows=100) · [Esquema e-FACT](https://dadesobertes.seu-e.cat/api/3/action/datastore_search?resource_id=4d148e9b-ebed-477a-bfff-22bd3567dcd8&limit=0).

**Responsables:** Ajuntament/AOC. **COMPROVAT, catàleg:** agenda institucional i d’activitats, notícies, carrerer, equipaments, entitats, wifi, moviments padronals agregats i sol·licituds d’accés. **Temps/qualitat:** no perfilats individualment. **Format/descàrrega/API:** CSV/CKAN; automatització alta després d’auditar. **Actualització:** no verificada. **Claus:** recurs i identificadors locals; no pressuposar CIF d’entitats. **e-FACT:** esquema amb estats i receptor, però zero resultats municipals per codi i NIF provats. Disponibilitat per Castellar NO VERIFICADA; no confondre amb F04 ni deduir zero factures.

## Accessos tècnics comprovats

### CKAN de l’AOC

Base consultada: `https://dadesobertes.seu-e.cat/api/3/action/`.

Operacions comprovades: `package_search` i `datastore_search`. Per aquesta última: `resource_id`, `limit`, `offset`, `fields` i `filters`. Una consulta amb `limit=0` permet llegir esquema i recompte; per obtenir dades cal paginar fins al total. El màxim retornat per pàgina no s’ha de donar per il·limitat.

| Recurs | `resource_id` comprovat | Filtre municipal |
|---|---|---|
| Factures | `2e86b79d-b79d-4ae0-9f87-1a56f1c49a4f` | Dataset municipal |
| Proveïdors | `b8c6a773-1cf2-4592-a9a2-92f30a645985` | Dataset municipal |
| Convenis | `a2ca7c35-3afa-41f4-87e6-1d1645d0291a` | Dataset municipal |
| Pressupost detallat | `595f8620-7a3c-4e38-8be2-7cffa744cd44` | `CODI_ENS=805170005` |
| Liquidació detallada | `5b96829f-d724-4059-a38a-abf514830558` | `CODI_ENS=805170005` |
| Liquidació per capítols | `81f18313-547f-4c87-adbd-c6ce873cb406` | `CODI_ENS=805170005` |
| Concessions MINHAP | `30798421-5952-4420-a769-d1121beb6534` | `CODI_ENS=805170005` |
| Sol·licituds d’accés | `5dc37aef-00bf-433f-911f-73b495ae9b1d` | Dataset municipal; només catàleg, sense lectura de relats |
| e-FACT | `4d148e9b-ebed-477a-bfff-22bd3567dcd8` | Provats `CODI_ENS_RECEPTOR=805170005` i `NIF_RECEPTOR=P0805000G`, tots dos zero |

Exemple real de consulta sense dades personals: [liquidació per capítols de Castellar](https://dadesobertes.seu-e.cat/api/3/action/datastore_search?resource_id=81f18313-547f-4c87-adbd-c6ce873cb406&filters=%7B%22CODI_ENS%22%3A%22805170005%22%7D&limit=5).

Esquemes municipals observats, ometent `_id` tècnic:

- Factures: `EXERCICI`, `DATA_FACTURA`, `DATA_REGISTRE`, `NUM_FACTURA`, `NOM_EMISSOR`, `IMPORT_FACTURA`, `CODI_ENS`, `NOM_ENS`.
- Proveïdors: `EXERCICI`, `NOM_EMPRESA`, `CIF_EMPRESA`, `IMPORT`, `CODI_ENS`, `NOM_ENS`.
- Convenis: `CODI_EXPEDIENT`, `TITOL`, `DESCRIPCIO`, `DATA_INICI`, `DATA_FINAL`, `ESTAT`, `PRORROGABLE`, `CODI_ENS`, `NOM_ENS`.

### Socrata de la Generalitat

Metadades llegides: `/api/views/{id}.json`. Dades consultades: `/resource/{id}.json`, amb `$where`, `$select` i `$limit`. Els IDs següents són observats, no inventats:

| Dataset | ID | Filtre verificat |
|---|---|---|
| PSCP | `ybgg-dgi6` | `codi_organ='3411306'` |
| Execució PSCP | `8idu-wkjv` | `codi_organ='3411306'` |
| RPC | `hb6v-jcbf` | `id_organisme_contractant='0805170005'` |

[Exemple PSCP amb camps d’expedient i lot](https://analisi.transparenciacatalunya.cat/resource/ybgg-dgi6.json?$where=codi_organ%3D%273411306%27&$select=codi_expedient,numero_lot&$limit=5).

Les distribucions CSV/JSON/XML de l’API v3 també estan anunciades als catàlegs federats. No substituir els endpoints que ja han funcionat sense prova. Validar límits, autenticació i condicions en implementar; no es garanteix que una petició sense token tingui capacitat il·limitada.

### Registre de verificació i limitacions

Les consultes web van fallar en algunes pàgines dinàmiques i URLs d’API; s’han pogut contrastar les fonts centrals amb peticions HTTP directes. Un error del lector web no s’ha classificat com a inexistència de la font.

L’arxiu `recerca/auditoria-api.json` conserva el perfil agregat. `recerca/audita-fonts.ps1` reprodueix la ronda base; els blocs complementaris de coincidències, CSV original i qualitat de CIF es van afegir amb consultes puntuals documentades a l’estudi. Reexecutar l’script genera un nou arxiu datat i preserva l’evidència d’aquest estudi. No hi ha còpies de factures individuals, noms de proveïdors o relats de casos en aquests fitxers.

No s’han descarregat tots els PDFs, vídeos o fulls de càlcul; no s’han mesurat CORS, rendiment web final ni estabilitat de fonts al llarg del temps. El mapa identifica aquests límits per font perquè no es confongui una disponibilitat anunciada amb una integració ja provada.
