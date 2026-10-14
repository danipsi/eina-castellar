export type Contract = {
  id: string; source: 'PSCP' | 'RPC'; expedient: string; title: string;
  year: number | null; lot: string | null; procedure: string; type: string;
  status: string; amountCents: number | null; vat: string; supplier: string | null;
  date: string | null; url: string; capturedAt: string; flags: string[];
};
export type ContractEvent = {id: string; expedient: string; lot: string | null; type: string; title: string; date: string | null; amountCents: number | null; url: string; capturedAt: string};
export type BudgetRow = {id: string; year: number; side: 'despeses' | 'ingressos'; chapter: string; chapterName: string; initialCents: number | null; finalCents: number | null; executedCents: number | null; url: string; initialUrl?: string; liquidationUrl?: string; capturedAt: string};
export type Session = {id: string; title: string; body: 'Ple' | 'Junta de Govern'; date: string; url: string; agenda: {number: string | number; title: string; expedients: string[]}[]; capturedAt: string};
export type Source = {id: string; name: string; url: string; status: 'ok' | 'partial' | 'error'; capturedAt: string; records: number; coverage: string; note: string};
export type Catalog = {schemaVersion: 1; generatedAt: string; contracts: Contract[]; events: ContractEvent[]; budget: BudgetRow[]; sessions: Session[]; sources: Source[]; changes: {date: string; source: string; kind: string; description: string}[]};
export type Evidence = {id: string; kind: 'contract' | 'session' | 'budget'; title: string; url: string; source: string; capturedAt: string; locator: string};
export type Note = {id: string; text: string; kind: 'nota' | 'pregunta' | 'hipòtesi'; status: 'pendent' | 'contrastada' | 'descartada'};
export type Dossier = {id: string; title: string; createdAt: string; updatedAt: string; evidence: Evidence[]; notes: Note[]};
export type Selection = {kind: 'contract'; item: Contract} | {kind: 'session'; item: Session} | {kind: 'budget'; item: BudgetRow};
export type Page = 'overview' | 'contracts' | 'budget' | 'sessions' | 'dossiers' | 'sources' | 'search';
