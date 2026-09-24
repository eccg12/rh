/**
 * Repositório em memória (D-OB-02). Lê sempre `store.state`, então trocar o estado inteiro
 * (restaurar o seed) é atômico. Leituras e escritas copiam os objetos para que ninguém altere o
 * estado sem passar pelo repositório.
 */
import type { DataRepository } from "./repository";
import type { MemoryState } from "./state";

export interface MemoryStore {
  state: MemoryState;
}

const clone = <T>(value: T): T => structuredClone(value);

function mustFind<T extends { id: string }>(list: T[], id: string, what: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error(`${what} não encontrado: ${id}`);
  return item;
}

function patchById<T extends { id: string }>(list: T[], id: string, patch: Partial<T>, what: string): T {
  const item = mustFind(list, id, what);
  Object.assign(item, clone(patch));
  // Remove chaves explicitamente indefinidas (ex.: limpar `availableAt`).
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete (item as Record<string, unknown>)[k];
  }
  return clone(item);
}

export class MemoryRepository implements DataRepository {
  constructor(
    private readonly store: MemoryStore,
    private readonly seedFactory?: () => Promise<MemoryState>,
  ) {}

  private get s(): MemoryState {
    return this.store.state;
  }

  newId(prefix: string): string {
    this.s.seq += 1;
    return `${prefix}-${this.s.seq}`;
  }

  people: DataRepository["people"] = {
    list: async () => clone(this.s.people),
    get: async (id) => clone(this.s.people.find((p) => p.id === id)),
    insert: async (person) => {
      if (this.s.people.some((p) => p.id === person.id)) throw new Error(`Pessoa já existe: ${person.id}`);
      this.s.people.push(clone(person));
      return clone(person);
    },
    update: async (id, patch) => patchById(this.s.people, id, patch, "Pessoa"),
  };

  cases: DataRepository["cases"] = {
    list: async () => clone(this.s.cases),
    get: async (id) => clone(this.s.cases.find((c) => c.id === id)),
    getByPerson: async (personId) => {
      const cases = this.s.cases.filter((c) => c.personId === personId && c.status !== "cancelado");
      return clone(cases[cases.length - 1]);
    },
    insert: async (c) => {
      this.s.cases.push(clone(c));
      return clone(c);
    },
    update: async (id, patch) => patchById(this.s.cases, id, patch, "Caso"),
  };

  tasks: DataRepository["tasks"] = {
    listAll: async () => clone(this.s.tasks),
    listByCase: async (caseId) => clone(this.s.tasks.filter((t) => t.caseId === caseId)),
    insertMany: async (tasks) => {
      this.s.tasks.push(...clone(tasks));
    },
    update: async (id, patch) => patchById(this.s.tasks, id, patch, "Tarefa"),
  };

  forms: DataRepository["forms"] = {
    get: async (caseId) => clone(this.s.formResponses.find((f) => f.caseId === caseId)),
    save: async (response) => {
      const idx = this.s.formResponses.findIndex((f) => f.caseId === response.caseId);
      if (idx >= 0) this.s.formResponses[idx] = clone(response);
      else this.s.formResponses.push(clone(response));
      return clone(response);
    },
  };

  documents: DataRepository["documents"] = {
    listByCase: async (caseId) => clone(this.s.documents.filter((d) => d.caseId === caseId)),
    get: async (id) => clone(this.s.documents.find((d) => d.id === id)),
    insert: async (doc) => {
      this.s.documents.push(clone(doc));
      return clone(doc);
    },
    update: async (id, patch) => patchById(this.s.documents, id, patch, "Documento"),
  };

  contracts: DataRepository["contracts"] = {
    getByCase: async (caseId) => clone(this.s.contracts.find((c) => c.caseId === caseId)),
    save: async (contract) => {
      const idx = this.s.contracts.findIndex((c) => c.id === contract.id);
      if (idx >= 0) this.s.contracts[idx] = clone(contract);
      else this.s.contracts.push(clone(contract));
      return clone(contract);
    },
    listTemplates: async () => clone(this.s.contractTemplates),
  };

  policies: DataRepository["policies"] = {
    listVersions: async () => clone(this.s.policies),
    insertVersion: async (policy) => {
      if (this.s.policies.some((p) => p.id === policy.id && p.version === policy.version)) {
        throw new Error(`Versão já existe: ${policy.id} v${policy.version}`);
      }
      this.s.policies.push(clone(policy));
      return clone(policy);
    },
  };

  policyAcks: DataRepository["policyAcks"] = {
    list: async () => clone(this.s.policyAcks),
    listByPerson: async (personId) => clone(this.s.policyAcks.filter((a) => a.personId === personId)),
    insert: async (ack) => {
      this.s.policyAcks.push(clone(ack));
      return clone(ack);
    },
  };

  benefits: DataRepository["benefits"] = {
    list: async () => clone(this.s.benefitPlans),
    insert: async (plan) => {
      this.s.benefitPlans.push(clone(plan));
      return clone(plan);
    },
    update: async (id, patch) => patchById(this.s.benefitPlans, id, patch, "Benefício"),
  };

  benefitAcks: DataRepository["benefitAcks"] = {
    list: async () => clone(this.s.benefitAcks),
    insert: async (ack) => {
      this.s.benefitAcks.push(clone(ack));
      return clone(ack);
    },
  };

  training: DataRepository["training"] = {
    getVideo: async () => clone(this.s.video),
    saveVideo: async (video) => {
      this.s.video = clone(video);
      return clone(video);
    },
    getQuiz: async () => clone(this.s.quiz),
    saveQuiz: async (quiz) => {
      this.s.quiz = clone(quiz);
      return clone(quiz);
    },
    listVideoViews: async () => clone(this.s.videoViews),
    insertVideoView: async (view) => {
      this.s.videoViews.push(clone(view));
      return clone(view);
    },
    listQuizAttempts: async () => clone(this.s.quizAttempts),
    insertQuizAttempt: async (attempt) => {
      this.s.quizAttempts.push(clone(attempt));
      return clone(attempt);
    },
  };

  equipment: DataRepository["equipment"] = {
    list: async () => clone(this.s.equipment),
    get: async (id) => clone(this.s.equipment.find((e) => e.id === id)),
    insert: async (item) => {
      if (this.s.equipment.some((e) => e.assetTag === item.assetTag)) {
        throw new Error(`Já existe um equipamento com o patrimônio ${item.assetTag}.`);
      }
      this.s.equipment.push(clone(item));
      return clone(item);
    },
    update: async (id, patch) => patchById(this.s.equipment, id, patch, "Equipamento"),
  };

  access: DataRepository["access"] = {
    list: async () => clone(this.s.accessGrants),
    insertMany: async (grants) => {
      this.s.accessGrants.push(...clone(grants));
    },
    update: async (id, patch) => patchById(this.s.accessGrants, id, patch, "Acesso"),
  };

  knowledge: DataRepository["knowledge"] = {
    listArticles: async () => clone(this.s.articles),
    saveArticle: async (article) => {
      const idx = this.s.articles.findIndex((a) => a.id === article.id);
      if (idx >= 0) this.s.articles[idx] = clone(article);
      else this.s.articles.push(clone(article));
      return clone(article);
    },
    listDirectory: async () => clone(this.s.directory),
    saveDirectoryEntry: async (entry) => {
      const idx = this.s.directory.findIndex((d) => d.personId === entry.personId);
      if (idx >= 0) this.s.directory[idx] = clone(entry);
      else this.s.directory.push(clone(entry));
      return clone(entry);
    },
    getFirstDay: async () => clone(this.s.firstDay),
    listTerms: async () => clone(this.s.terms),
  };

  assistant: DataRepository["assistant"] = {
    listGaps: async () => clone(this.s.gaps),
    insertGap: async (gap) => {
      this.s.gaps.push(clone(gap));
      return clone(gap);
    },
    updateGap: async (id, patch) => patchById(this.s.gaps, id, patch, "Lacuna"),
    listFeedback: async () => clone(this.s.assistantFeedback),
    insertFeedback: async (feedback) => {
      this.s.assistantFeedback.push(clone(feedback));
      return clone(feedback);
    },
  };

  email: DataRepository["email"] = {
    listTemplates: async () => clone(this.s.emailTemplates),
    listOutbox: async () => clone(this.s.outbox),
    insertOutbox: async (email) => {
      this.s.outbox.push(clone(email));
      return clone(email);
    },
  };

  audit: DataRepository["audit"] = {
    list: async () => clone(this.s.audit),
    listByCase: async (caseId) => clone(this.s.audit.filter((e) => e.caseId === caseId)),
    insert: async (event) => {
      this.s.audit.push(clone(event));
      return clone(event);
    },
  };

  automations: DataRepository["automations"] = {
    listFirings: async () => clone(this.s.ruleFirings),
    insertFiring: async (firing) => {
      this.s.ruleFirings.push(clone(firing));
      return clone(firing);
    },
    getEnabledOverrides: async () => clone(this.s.ruleEnabled),
    setEnabled: async (ruleId, enabled) => {
      this.s.ruleEnabled[ruleId] = enabled;
    },
  };

  projects: DataRepository["projects"] = {
    list: async () => clone(this.s.projects),
  };

  timesheets: DataRepository["timesheets"] = {
    list: async () => clone(this.s.timesheets),
    save: async (week) => {
      const idx = this.s.timesheets.findIndex((w) => w.id === week.id);
      if (idx >= 0) this.s.timesheets[idx] = clone(week);
      else this.s.timesheets.push(clone(week));
      return clone(week);
    },
  };

  surveys: DataRepository["surveys"] = {
    list: async () => clone(this.s.surveys),
    insert: async (response) => {
      this.s.surveys.push(clone(response));
      return clone(response);
    },
  };

  meta: DataRepository["meta"] = {
    getLastTickDate: async () => this.s.lastTickDate,
    setLastTickDate: async (key) => {
      this.s.lastTickDate = key;
    },
    getContentVersion: async () => this.s.contentVersion,
    bumpContentVersion: async () => {
      this.s.contentVersion += 1;
      return this.s.contentVersion;
    },
  };

  async getClockOffset(): Promise<number> {
    return this.s.clockOffsetDays;
  }

  async setClockOffset(days: number): Promise<void> {
    this.s.clockOffsetDays = days;
  }

  async reset(): Promise<void> {
    if (!this.seedFactory) throw new Error("Este repositório não sabe restaurar os dados iniciais.");
    this.store.state = await this.seedFactory();
  }
}
