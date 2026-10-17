import {Mail, ShieldCheck} from 'lucide-react';
import {PageTitle} from './ui';

export const CONTACT_EMAIL = 'observatoricastellar@gmail.com';
const REPOSITORY = 'https://github.com/danipsi/eina-castellar';

const Mailto = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

export function Legal({onSources}: {onSources: () => void}) {
  return <>
    <PageTitle eyebrow="Qui som i com contactar" title="Avís legal i privacitat">Una iniciativa ciutadana per consultar les dades públiques de l’Ajuntament de Castellar del Vallès.</PageTitle>
    <div className="notice"><Mail size={20}/><p><strong>Contacte:</strong> <Mailto/>. Escriu-hi per demanar una correcció o la retirada d’una dada, o per fer qualsevol consulta sobre el web.</p></div>
    <div className="legal">
      <section className="panel"><h2>Qui som</h2>
        <p>L’Observatori de Castellar és una iniciativa ciutadana, independent i sense ànim de lucre, que reuneix en un sol lloc dades que l’Ajuntament de Castellar del Vallès i altres administracions ja publiquen: contractes, factures, subvencions, convenis, pressupostos i sessions del Ple. L’objectiu és que qualsevol veí o veïna les pugui consultar, comparar i entendre sense haver de recórrer diversos portals.</p>
        <p>No és un portal oficial. No té cap vinculació amb l’Ajuntament ni amb cap altra administració, que no n’avalen ni en patrocinen el contingut. No rep finançament, no conté publicitat i no fa cap activitat econòmica.</p>
      </section>
      <section className="panel"><h2>D’on surten les dades</h2>
        <p>Totes les dades provenen de portals públics de dades obertes i de transparència: el portal de dades obertes de l’Ajuntament i del Consorci AOC, la Plataforma de serveis de contractació pública i el Registre públic de contractes de la Generalitat, la Base de dades nacional de subvencions, l’Idescat i les actes del Ple. Es reutilitzen d’acord amb la Llei 37/2007, de reutilització de la informació del sector públic, i amb les condicions de cada font.</p>
        <p>A <button className="text-button" onClick={onSources}>Fonts i qualitat</button> hi ha la font, la llicència i la data de captura de cada conjunt. Les dades s’han agregat i normalitzat per facilitar-ne la consulta. Si hi ha cap discrepància, preval sempre la font original, enllaçada a cada fitxa.</p>
      </section>
      <section className="panel"><h2>Com s’han de llegir</h2>
        <p>Les dades corresponen a una captura periòdica, no a la informació en temps real, i poden contenir errors de la font original o de la transformació. Els «patrons a revisar» són indicis per fer preguntes, no irregularitats: no atribueixen cap conducta a cap persona ni entitat. Res d’aquest web és assessorament jurídic ni substitueix la consulta de l’expedient.</p>
      </section>
      <section className="panel"><h2>Dades personals</h2>
        <h3>De les persones que surten a les dades</h3>
        <p>El web no publica noms ni NIF de persones físiques. Els imports facturats o rebuts per autònoms, societats civils i comunitats de béns s’agreguen sense nom. Només hi apareixen amb nom empreses, entitats i administracions. Els punts de les sessions que tracten assumptes personals no s’indexen.</p>
        <p>Aquest filtre és preventiu i pot fallar. Si trobes una dada personal que no hi hauria de ser, escriu a <Mailto/> i la retirarem com més aviat millor, com a màxim en un mes.</p>
        <h3>De les persones que visiten el web</h3>
        <p>El web no fa servir galetes de seguiment ni eines d’analítica, i no té formularis. Els dossiers, les notes i les preferències es desen només al teu navegador i no s’envien enlloc, llevat que tu els exportis. L’allotjament (GitHub Pages) pot registrar dades tècniques de connexió, com l’adreça IP, segons la seva pròpia política de privacitat.</p>
      </section>
      <section className="panel"><h2>Correccions, retirades i drets</h2>
        <p>Pots demanar l’accés, la rectificació o la supressió de qualsevol dada que et concerneixi, o oposar-t’hi, escrivint a <Mailto/>. Indica l’enllaç de la pàgina o de la fitxa i què cal corregir. Respondrem en el termini màxim d’un mes i, mentre es revisa, la dada es pot retirar de manera preventiva.</p>
        <p>Si no estàs d’acord amb la resposta, pots presentar una reclamació a l’<a href="https://www.aepd.es" target="_blank" rel="noreferrer">Agència Espanyola de Protecció de Dades</a>.</p>
      </section>
      <section className="panel"><h2>Codi obert</h2>
        <p>El codi del web és lliure, amb llicència GPL-3.0, i es pot consultar al <a href={REPOSITORY} target="_blank" rel="noreferrer">repositori públic</a>.</p>
      </section>
    </div>
    <div className="calculation-note"><ShieldCheck size={18}/><p>Darrera actualització d’aquest avís: 17 d’octubre de 2026.</p></div>
  </>;
}
