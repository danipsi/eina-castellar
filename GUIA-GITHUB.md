# Publica l’Observatori a GitHub gratuït

El projecte està publicat amb **GitHub Pages + GitHub Actions** des del 14/10/2026: [obre el web](https://danipsi.github.io/eina-castellar/) · [repositori públic](https://github.com/danipsi/eina-castellar). No necessita Netlify, Cloudflare, un domini de pagament ni claus d’API. La publicació inicial ja està feta; els passos següents es conserven com a referència. Per gestionar la còpia existent amb GitHub Desktop, afegeix la carpeta `E:\eines-ia\projectes-ia\eina-castellar` amb **File → Add local repository**.

## Primera publicació amb GitHub Desktop

1. Obre [GitHub Desktop](https://desktop.github.com/) i inicia sessió amb el teu compte de GitHub.
2. Tria **File → Add local repository** i selecciona `E:\eines-ia\projectes-ia\eina-castellar`. Si indica que encara no és un repositori, prem **create a repository here**. Mantén aquesta carpeta i el nom `eina-castellar`; no triïs una plantilla de `.gitignore`, perquè ja n’hi ha una.
3. Comprova que la branca sigui **main**. Si té un altre nom, canvia’l amb **Branch → Rename** abans de publicar.
4. A **Changes**, revisa els fitxers de la primera pujada i, si hi ha canvis pendents, prem **Commit to main**. Han d’incloure `.github/workflows/pages.yml`, `src`, `scripts`, `tests`, `public`, `package.json` i `package-lock.json`. La carpeta `dades`, `node_modules`, `dist`, els ZIP i els resultats de proves estan exclosos pel `.gitignore`.
5. Prem **Publish repository** i **desmarca “Keep this code private”**. GitHub Pages gratuït necessita un repositori públic. Publica’l amb el nom `eina-castellar`.
6. Al repositori del web de GitHub, entra a **Settings → Pages → Build and deployment → Source** i selecciona **GitHub Actions**.
7. Entra a **Actions → Actualitza i publica l’Observatori → Run workflow**. Selecciona `main`. Deixa marcada **Consulta les fonts abans de publicar** per fer una captura nova; desmarca-la si vols publicar immediatament la captura inclosa.
8. Quan acabi, trobaràs l’adreça a **Settings → Pages**. Normalment serà `https://EL-TEU-USUARI.github.io/eina-castellar/`.

La primera execució, iniciada en pujar el projecte, pot fallar si encara no has fet el pas 6. Després d’activar Pages, executa el pas 7. No cal crear cap secret: GitHub proporciona el permís temporal del flux.

Si la pujada automàtica de dades dona un error de permisos, revisa **Settings → Actions → General → Workflow permissions** i les proteccions de `main`: el flux necessita poder escriure les captures. El fitxer ja demana `contents: write` només al treball que les guarda.

## Funcionament automàtic

- **Cada dia a les 04.23 UTC**: 05.23 h a l’hivern i 06.23 h a l’estiu a Catalunya. GitHub pot retardar l’execució.
- Consulta les fonts ja connectades, valida la captura, genera el web i el publica.
- Conserva `public/data/catalog.json` i `status.json` amb commits automàtics a `main`. Així l’execució següent compara amb l’última captura i les versions anteriors continuen a l’historial de GitHub.
- La base SQLite de l’ordinador no es puja. A GitHub es crea una base temporal durant cada captura i es descarta quan acaba el treball; l’històric remot és el de les captures JSON, no una rèplica del SQLite local.
- Si falla la captura o supera 30 minuts, es publica l’últim catàleg vàlid amb un avís. L’execució queda marcada amb error a Actions. Si falla la compilació o la publicació, continua servint-se el desplegament anterior.
- Quan puges canvis de codi, publica el web amb la captura guardada, sense tornar a consultar les fonts. Els commits del bot no creen un bucle d’execucions.
- Pots avançar una actualització amb **Run workflow**. Per aturar la programació, obre el menú del flux i selecciona **Disable workflow**.

GitHub pot desactivar les programacions en repositoris públics després de 60 dies sense activitat. Les captures diàries generen activitat, però si s’aturen durant molt de temps comprova el flux i reactiva’l des d’Actions.

## Quan modifiquis el web des de l’ordinador

Primer, a GitHub Desktop, prem **Fetch origin / Pull origin** per recuperar les captures que hagi guardat el bot. Després fes els canvis, **Commit to main** i **Push origin**. Això evita treballar sobre una captura desfasada o haver de resoldre conflictes de dades.

## Comprova el resultat

1. Obre el web, comprova que carregui les dades i cerca `CONT2400054`.
2. A **Fonts i qualitat**, comprova la data de captura després d’una actualització correcta.
3. Recarrega una pàgina interna, per exemple `/#contracts` després del nom del repositori, i comprova que segueixi funcionant.
4. Si tenies dossiers al web local o a Netlify, exporta’ls en JSON des d’aquell navegador i importa’ls al nou web. No es transfereixen automàticament.

## Abast i dades publicades

El repositori i el web seran públics, inclòs l’historial dels JSON publicables. Els dossiers continuen desats només al navegador; no entren als commits. No hi afegeixis còpies personals ni fitxers d’expedients. El filtre existent de les fonts és preventiu i no substitueix la revisió dels fragments abans de publicar-los.

La cobertura actual continua limitada a 2022–2026, i les liquidacions a 2022–2025. L’automatització refresca aquesta cobertura; caldrà ampliar els anys del capturador per incorporar exercicis posteriors. Una retirada per privacitat pot requerir eliminar també versions de Git i desplegaments antics.

GitHub Pages no aplica les capçaleres de `netlify.toml` ni de `public/_headers`. El web funciona sense aquestes configuracions, però no s’ha de considerar que les mateixes capçaleres de seguretat i memòria cau estiguin actives.

## Referències

- [Publicació amb GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
- [Programació de les execucions](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
- [Configuració de Vite per a GitHub Pages](https://vite.dev/guide/static-deploy.html#github-pages).
