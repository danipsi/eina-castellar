import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {defineConfig, type Plugin} from 'vite';
import type {Catalog} from './src/types.ts';

const FEED = 'ple.xml';
const xml = (s: string) => s.replace(/[<>&'"]/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;'})[c]!);
const html = (s: string) => s.replace(/[<>&]/g, c => ({'<': '&lt;', '>': '&gt;', '&': '&amp;'})[c]!);
const rfc822 = (iso: string) => new Date(iso.length === 10 ? iso + 'T12:00:00Z' : iso).toUTCString();

// Canal RSS dels plens a partir de la mateixa captura publicable: cap dada nova ni consulta externa.
export function plenaryFeed(catalog: Catalog, siteUrl: string | undefined) {
  const plens = catalog.sessions.filter(s => s.body === 'Ple').sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
  const link = siteUrl || 'https://actes.castellarvalles.cat/';
  const items = plens.map(s => {
    const points = s.agenda.length
      ? `<p>${s.agenda.length} punts indexats a l’ordre del dia:</p><ul>${s.agenda.map(a => `<li>${html(String(a.number))}. ${html(a.title)}</li>`).join('')}</ul>`
      : '<p>Ordre del dia no indexat. Consulta el document original.</p>';
    const body = points + '<p>Un punt de l’ordre del dia és una proposta a tractar, no un acord aprovat.</p>';
    return `<item><title>${xml(s.title)}</title><link>${xml(s.url)}</link><guid isPermaLink="false">sessio-${xml(s.id)}</guid><pubDate>${rfc822(s.date)}</pubDate><description>${xml(body)}</description></item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Observatori de Castellar · Ordres del dia del Ple</title>
<link>${xml(link)}</link>
<description>Sessions plenàries de Castellar del Vallès i punts indexats de l’ordre del dia, a partir de la darrera captura. No és un canal oficial de l’Ajuntament.</description>
<language>ca</language>
<lastBuildDate>${rfc822(catalog.generatedAt)}</lastBuildDate>
${items}
</channel></rss>
`;
}

function feedPlugin(): Plugin {
  const build = () => plenaryFeed(JSON.parse(readFileSync('public/data/catalog.json', 'utf8')), process.env.SITE_URL);
  return {
    name: 'observatori-feed',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('/' + FEED)) return next();
        res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
        res.end(build());
      });
    },
    generateBundle() {this.emitFile({type: 'asset', fileName: FEED, source: build()});},
  };
}

const SUPPLIERS = 'suppliers.json';

// En compilar, les factures (la secció més pesada) van a un fitxer a part que el web només carrega
// a les pàgines que les fan servir. public/data/catalog.json i el capturador no canvien.
function splitSuppliersPlugin(): Plugin {
  let outDir = 'dist';
  return {
    name: 'observatori-split-suppliers',
    apply: 'build',
    configResolved(config) {outDir = resolve(config.root, config.build.outDir);},
    closeBundle() {
      const path = resolve(outDir, 'data/catalog.json');
      if (!existsSync(path)) return;
      const {suppliers, ...catalog} = JSON.parse(readFileSync(path, 'utf8'));
      if (!Array.isArray(suppliers)) return;
      writeFileSync(resolve(outDir, 'data', SUPPLIERS), JSON.stringify({generatedAt: catalog.generatedAt, suppliers}));
      writeFileSync(path, JSON.stringify({...catalog, suppliersFile: SUPPLIERS}));
    },
  };
}

export default defineConfig({
  plugins: [feedPlugin(), splitSuppliersPlugin()],
  server: {
    // Windows: no mantenir els JSON oberts mentre el capturador els substitueix.
    watch: {ignored: ['**/public/data', '**/public/data/**', '**/dades/**', '**/recerca/**']},
  },
});
