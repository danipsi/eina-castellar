export type Contract = {
  id: string; source: 'PSCP' | 'RPC'; expedient: string; title: string;
  year: number | null; lot: string | null; procedure: string; type: string;
  status: string; amountCents: number | null; vat: string; supplier: string | null; cpv?: string | null;
  date: string | null; formalizedDate?: string | null; termStart?: string | null; termEnd?: string | null; duration?: string | null; url: string; capturedAt: string; flags: string[];
};
export type ContractEvent = {id: string; expedient: string; lot: string | null; type: string; title: string; date: string | null; amountCents: number | null; url: string; capturedAt: string};
export type BudgetRow = {id: string; year: number; side: 'despeses' | 'ingressos'; chapter: string; chapterName: string; initialCents: number | null; finalCents: number | null; executedCents: number | null; url: string; initialUrl?: string; liquidationUrl?: string; capturedAt: string};
export type Session = {id: string; title: string; body: 'Ple' | 'Junta de Govern'; date: string; url: string; agenda: {number: string | number; title: string; expedients: string[]}[]; capturedAt: string};
export type Source = {id: string; name: string; url: string; status: 'ok' | 'partial' | 'error'; capturedAt: string; records: number; coverage: string; note: string};
export type CatalogChange = {date: string; source: string; kind: string; description: string; recordId?: string; fields?: {field: string; before?: string | number | null; after?: string | number | null}[]};
// Factures agregades per emissor i exercici. name és null en la fila que agrupa els emissors sense nom publicat.
export type SupplierYear = {id: string; year: number; name: string | null; category: string; emitters: number; invoices: number; invoicedCents: number; maxInvoiceCents: number; firstDate: string | null; lastDate: string | null; url: string; capturedAt: string};
// Concessions de subvenció. beneficiary és null en les files que agreguen, per acord, les concessions sense nom publicat.
export type Grant = {id: string; year: number; date: string; call: string; procedure: 'convocatòria' | 'sense convocatòria'; agreement: string | null; beneficiary: string | null; category: string; grants: number; amountCents: number; repeated: number; url: string; capturedAt: string};
// Convenis tal com els declara l'Ajuntament. endIssue explica per què end és null o incoherent.
export type Agreement = {id: string; code: string; title: string; description: string | null; start: string | null; end: string | null; endIssue: 'absent' | 'sentinella' | 'anterior a l’inici' | null; status: string; extendable: boolean | null; url: string; capturedAt: string};
// Comparació amb municipis de mida semblant. Els imports són vectors dels capítols 1–9; null = capítol no informat.
export type PeerMunicipality = {code: string; name: string; population: Record<string, number>; ens: string | null};
export type PeerRow = {code: string; year: number; side: 'despeses' | 'ingressos'; initialCents: (number | null)[]; finalCents: (number | null)[]; executedCents: (number | null)[]};
export type Peers = {capturedAt: string; range: [number, number]; populationYear: number; self: string; populationUrl: string; initialUrl: string; liquidationUrl: string; municipalities: PeerMunicipality[]; rows: PeerRow[]};
// Resultat final de les mocions llegit de l'acta aprovada (PDF). read: actes llegides, encara que no en surti cap resultat.
export type VoteResult = 'aprovada' | 'aprovada amb esmenes' | 'rebutjada' | 'retirada' | 'sobre la taula';
export type MotionVote = {session: string; number: string; result: VoteResult; majority: 'unanimitat' | 'majoria' | null};
export type Votes = {parser: number; read: {session: string; url: string; capturedAt: string}[]; results: MotionVote[]};
export type Catalog = {schemaVersion: 1; generatedAt: string; contracts: Contract[]; events: ContractEvent[]; budget: BudgetRow[]; sessions: Session[]; suppliers?: SupplierYear[]; suppliersFile?: string; grants?: Grant[]; agreements?: Agreement[]; peers?: Peers; votes?: Votes; sources: Source[]; changes: CatalogChange[]};
export const EVIDENCE_KINDS = ['contract', 'session', 'budget', 'supplier', 'grant', 'agreement', 'motion', 'peer', 'entity'] as const;
// href: enllaç intern (#pàgina?filtres) per tornar a la vista de l'Observatori on es va desar.
export type Evidence = {id: string; kind: typeof EVIDENCE_KINDS[number]; title: string; url: string; source: string; capturedAt: string; locator: string; href?: string; addedAt?: string};
export type Note = {id: string; text: string; kind: 'nota' | 'pregunta' | 'hipòtesi'; status: 'pendent' | 'contrastada' | 'descartada'; author?: string; updatedAt?: string};
export type RequestKind = 'informacio' | 'pregunta' | 'prec';
export type RequestStatus = 'esborrany' | 'presentada' | 'resposta' | 'resposta parcial' | 'sense resposta';
export type FormalRequest = {id: string; kind: RequestKind; text: string; createdAt: string; status: RequestStatus; presentedAt: string | null; registry: string; updatedAt?: string};
export type Dossier = {id: string; title: string; createdAt: string; updatedAt: string; evidence: Evidence[]; notes: Note[]; requests?: FormalRequest[]; revision?: number; deleted?: Record<string, string>};
export type Selection = {kind: 'contract'; item: Contract} | {kind: 'session'; item: Session} | {kind: 'budget'; item: BudgetRow};
export type Page = 'overview' | 'contracts' | 'suppliers' | 'entity' | 'grants' | 'budget' | 'sessions' | 'motions' | 'dossiers' | 'sources' | 'search';
