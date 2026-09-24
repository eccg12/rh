/**
 * Dados de demonstração (seção 11). O seed não escreve o estado final à mão: ele reproduz uma
 * linha do tempo retroativa, em ordem cronológica, chamando os mesmos serviços que a interface usa
 * (com viradas de dia às 7h). Assim, tempos por etapa, lembretes, e-mails e linha do tempo nascem
 * coerentes e produzidos pelo próprio motor. O gargalo resultante é "Cadastro e documentos".
 */
import { company } from "@/config/company";
import { requirementsFor } from "@/config/documents";
import { ManualClock } from "@/domain/clock";
import type { DomainContext } from "@/domain/context";
import { tickIfNewDay } from "@/domain/automation-engine";
import { sampleFormValues } from "@/domain/samples";
import type { Equipment, Person, Project, TimesheetWeek } from "@/domain/schemas";
import {
  acceptEquipmentTerm,
  acknowledgePolicy,
  assignEquipment,
  checkIn,
  confirmBenefits,
  createCase,
  grantAccess,
  markWelcomeSeen,
  readAgenda,
  reviewDocument,
  sendContract,
  setCorporateEmail,
  signContract,
  submitDocument,
  submitFeedback,
  submitForm,
  submitQuiz,
  suggestedCorporateEmail,
  watchVideo,
} from "@/domain/services/onboarding";
import { currentSubmission } from "@/domain/workflow-engine";
import { addDaysKey, mondayOfKey, spDateKey, spDateTimeToIso } from "@/lib/dates";
import { slugify } from "@/lib/slug";
import { OutboxEmailProvider } from "@/server/providers/email/outbox-provider";
import { SimulatedSignatureProvider } from "@/server/providers/signature/simulated-provider";
import { SimulatedStorageProvider } from "@/server/providers/storage/simulated-provider";

import { loadContent } from "./content-loader";
import { MemoryRepository } from "./memory-repository";
import { NEW_JOINERS, TEAM, type NewJoinerFixture } from "./seed-fixtures";
import { createEmptyState, type MemoryState } from "./state";

const THIAGO = "thiago-stepanoff";

export const PROJECTS: Project[] = [
  { id: "cliente-a-manutencao", name: "Diagnóstico de manutenção", client: "Cliente A" },
  { id: "cliente-b-sop", name: "S&OP", client: "Cliente B" },
  { id: "cliente-c-supply", name: "Supply chain", client: "Cliente C" },
  { id: "interno-propostas", name: "Propostas", client: "Interno" },
  { id: "interno-capacitacao", name: "Capacitação", client: "Interno" },
];

const NOTEBOOK_MODEL = "Notebook 14\" Core i5, 16 GB";
const NOTEBOOK_MODEL_B = "Notebook 14\" Ryzen 7, 32 GB";

export interface SeedOptions {
  now?: Date;
  appUrl?: string;
  demoMode?: boolean;
}

/**
 * Estado base: conteúdo de `content/`, equipe, inventário, acessos e aceites da equipe e
 * apontamentos. Sem casos de onboarding (é o ponto de partida dos testes).
 */
export async function buildBaseState(options: SeedOptions = {}): Promise<MemoryState> {
  const realNow = options.now ?? new Date();
  const today = spDateKey(realNow);
  const state = createEmptyState();
  const content = loadContent();
  Object.assign(state, {
    policies: content.policies,
    benefitPlans: content.benefitPlans,
    articles: content.articles,
    video: content.video,
    quiz: content.quiz,
    contractTemplates: content.contractTemplates,
    terms: content.terms,
    emailTemplates: content.emailTemplates,
    firstDay: content.firstDay,
    directory: content.directory,
    projects: structuredClone(PROJECTS),
  });

  const repo = new MemoryRepository({ state });
  const iso = (day: number, hour: number, minute = 0) => spDateTimeToIso(addDaysKey(today, day), hour, minute);

  // ------------------------------------------------------------------------------------------
  // Equipe, inventário, acessos, aceites e apontamentos (estado inicial)
  // ------------------------------------------------------------------------------------------
  for (const t of TEAM) {
    const email = `${t.emailLocal}@${company.emailDomain}`;
    const person: Person = { id: t.id, name: t.name, roles: t.roles, personalEmail: email, corporateEmail: email };
    await repo.people.insert(person);
  }

  const inventory: Equipment[] = [
    { id: "eq-nb-001", assetTag: "MON-NB-001", type: "notebook", model: NOTEBOOK_MODEL, serial: "SN-4Q7K-1001", status: "disponivel" },
    { id: "eq-nb-002", assetTag: "MON-NB-002", type: "notebook", model: NOTEBOOK_MODEL, serial: "SN-4Q7K-1002", status: "disponivel" },
    { id: "eq-nb-003", assetTag: "MON-NB-003", type: "notebook", model: NOTEBOOK_MODEL, serial: "SN-4Q7K-1003", status: "disponivel" },
    { id: "eq-nb-004", assetTag: "MON-NB-004", type: "notebook", model: NOTEBOOK_MODEL_B, serial: "SN-8R2M-2004", status: "disponivel" },
    { id: "eq-nb-005", assetTag: "MON-NB-005", type: "notebook", model: NOTEBOOK_MODEL_B, serial: "SN-8R2M-2005", status: "disponivel" },
    {
      id: "eq-nb-006",
      assetTag: "MON-NB-006",
      type: "notebook",
      model: NOTEBOOK_MODEL,
      serial: "SN-4Q7K-1006",
      status: "manutencao",
      notes: "Troca de bateria na assistência técnica.",
    },
    {
      id: "eq-mn-001",
      assetTag: "MON-MN-001",
      type: "monitor",
      model: "Monitor 24\" Full HD",
      serial: "SN-MN-3001",
      status: "em_uso",
      assignedToId: "enzo-craveiro",
      assignedAt: iso(-120, 10),
      termAcceptedAt: iso(-120, 11),
      termVersion: 1,
    },
    { id: "eq-mn-002", assetTag: "MON-MN-002", type: "monitor", model: "Monitor 27\" QHD", serial: "SN-MN-3002", status: "disponivel" },
  ];
  for (const item of inventory) await repo.equipment.insert(item);

  for (const t of TEAM) {
    await repo.access.insertMany(
      company.accessSystems.map((s) => ({
        id: repo.newId("acs"),
        personId: t.id,
        systemId: s.id,
        system: s.name,
        owner: s.owner,
        status: "liberado" as const,
        grantedAt: iso(-200, 10),
        grantedById: THIAGO,
      })),
    );
  }

  // Aceites da equipe: todas as v1; a v2 da Política de Viagens ainda pendente para o Alessandro.
  const policies = await repo.policies.listVersions();
  const ackedV2: Record<string, number> = { "thiago-stepanoff": -50, "enzo-craveiro": -45, "guilherme-bonfitto": -40 };
  for (const t of TEAM) {
    for (const p of policies) {
      if (p.version === 1) {
        await repo.policyAcks.insert({ id: repo.newId("ack"), personId: t.id, policyId: p.id, version: 1, acknowledgedAt: iso(-230, 10) });
      } else if (ackedV2[t.id] !== undefined) {
        await repo.policyAcks.insert({
          id: repo.newId("ack"),
          personId: t.id,
          policyId: p.id,
          version: p.version,
          acknowledgedAt: iso(ackedV2[t.id]!, 9, 30),
        });
      }
    }
  }

  // Apontamento: duas semanas do Enzo e a semana anterior da equipe (dados simulados).
  const thisMonday = mondayOfKey(today);
  const lastMonday = addDaysKey(thisMonday, -7);
  const weekday = Math.min(5, Math.max(0, Math.round((Date.parse(today) - Date.parse(thisMonday)) / 86_400_000) + 1));
  const upToToday = (hours: [number, number, number, number, number]) =>
    hours.map((h, i) => (i < weekday ? h : 0)) as [number, number, number, number, number];
  const sheets: TimesheetWeek[] = [
    {
      id: "ts-enzo-anterior",
      personId: "enzo-craveiro",
      weekStart: lastMonday,
      status: "enviado",
      submittedAt: iso(-7 + (5 - weekday), 17, 40),
      rows: [
        { projectId: "cliente-b-sop", hours: [8, 8, 6, 8, 6] },
        { projectId: "interno-propostas", hours: [0, 0, 2, 0, 2] },
      ],
    },
    {
      id: "ts-enzo-atual",
      personId: "enzo-craveiro",
      weekStart: thisMonday,
      status: "rascunho",
      rows: [
        { projectId: "cliente-b-sop", hours: upToToday([8, 7, 8, 6, 8]) },
        { projectId: "interno-capacitacao", hours: upToToday([0, 1, 0, 2, 0]) },
      ],
    },
    {
      id: "ts-guilherme-anterior",
      personId: "guilherme-bonfitto",
      weekStart: lastMonday,
      status: "enviado",
      rows: [
        { projectId: "cliente-a-manutencao", hours: [6, 6, 4, 6, 4] },
        { projectId: "cliente-c-supply", hours: [2, 2, 2, 2, 2] },
        { projectId: "interno-propostas", hours: [0, 0, 2, 0, 2] },
      ],
    },
    {
      id: "ts-alessandro-anterior",
      personId: "alessandro-benetti",
      weekStart: lastMonday,
      status: "enviado",
      rows: [
        { projectId: "cliente-b-sop", hours: [4, 4, 4, 4, 2] },
        { projectId: "cliente-c-supply", hours: [4, 4, 4, 4, 4] },
      ],
    },
    {
      id: "ts-thiago-anterior",
      personId: "thiago-stepanoff",
      weekStart: lastMonday,
      status: "enviado",
      rows: [
        { projectId: "interno-propostas", hours: [4, 4, 4, 4, 4] },
        { projectId: "interno-capacitacao", hours: [4, 4, 4, 4, 2] },
      ],
    },
  ];
  for (const sheet of sheets) await repo.timesheets.save(sheet);

  state.clockOffsetDays = 0;
  state.lastTickDate = today;
  return state;
}

/** Estado base + linha do tempo retroativa dos new joiners (seção 11.2). */
export async function buildSeedState(options: SeedOptions = {}): Promise<MemoryState> {
  const realNow = options.now ?? new Date();
  const today = spDateKey(realNow);
  const state = await buildBaseState(options);
  state.lastTickDate = undefined;
  const repo = new MemoryRepository({ state });
  const clock = new ManualClock(realNow);
  const ctx: DomainContext = {
    repo,
    clock,
    email: new OutboxEmailProvider(repo, clock),
    signature: new SimulatedSignatureProvider(),
    storage: new SimulatedStorageProvider(),
    appUrl: options.appUrl ?? "http://localhost:3000",
    demoMode: options.demoMode ?? true,
  };
  const iso = (day: number, hour: number, minute = 0) => spDateTimeToIso(addDaysKey(today, day), hour, minute);

  // ------------------------------------------------------------------------------------------
  // Linha do tempo dos new joiners
  // ------------------------------------------------------------------------------------------
  const fx = (id: string): NewJoinerFixture => {
    const f = NEW_JOINERS.find((n) => n.id === id);
    if (!f) throw new Error(`Fixture desconhecida: ${id}`);
    return f;
  };
  const caseOf = (f: NewJoinerFixture) => `caso-${f.id}`;
  const space = () => clock.advance(40_000);

  const act = {
    create: async (f: NewJoinerFixture, custom = false) => {
      await createCase(
        ctx,
        {
          name: f.name,
          personalEmail: f.personalEmail,
          phone: f.phone,
          regime: f.regime,
          jobTitle: f.jobTitle,
          startDate: addDaysKey(today, f.startOffsetDays),
          managerId: f.managerId,
          initialProjectId: f.initialProjectId,
          needsNotebook: f.needsNotebook,
          contractMode: custom ? "customizado" : "modelo",
          contractTemplateId: custom ? undefined : f.regime === "CLT" ? "clt-padrao" : "pj-padrao",
        },
        THIAGO,
      );
    },
    form: async (f: NewJoinerFixture) => {
      const person = await repo.people.get(f.id);
      if (!person) throw new Error(`Pessoa não criada: ${f.id}`);
      // Primeiro acesso ao portal (boas-vindas vistas) antes da primeira ação.
      clock.advance(-20 * 60_000);
      await markWelcomeSeen(ctx, f.id);
      clock.advance(20 * 60_000);
      await submitForm(ctx, caseOf(f), sampleFormValues(f.regime, person), f.id);
    },
    docs: async (f: NewJoinerFixture) => {
      const slug = slugify(f.name);
      for (const [i, req] of requirementsFor(f.regime).filter((r) => r.requirement[f.regime] === "obrigatorio").entries()) {
        const image = i % 3 === 1;
        await submitDocument(
          ctx,
          caseOf(f),
          req.id,
          {
            fileName: `${req.id}-${slug}.${image ? "jpg" : "pdf"}`,
            mimeType: image ? "image/jpeg" : "application/pdf",
            sizeBytes: 420_000 + i * 211_000,
          },
          f.id,
        );
        space();
      }
    },
    review: async (f: NewJoinerFixture, reject: Record<string, string> = {}, only?: string[]) => {
      const docs = await repo.documents.listByCase(caseOf(f));
      for (const req of requirementsFor(f.regime)) {
        if (only && !only.includes(req.id)) continue;
        const current = currentSubmission(docs, req.id);
        if (!current || current.status !== "enviado") continue;
        const reason = reject[req.id];
        await reviewDocument(ctx, current.id, reason ? "rejeitar" : "aprovar", reason, THIAGO);
        space();
      }
    },
    compliance: async (f: NewJoinerFixture, failFirst = false) => {
      await watchVideo(ctx, caseOf(f), f.id, true);
      clock.advance(15 * 60_000);
      const quiz = await repo.training.getQuiz();
      const correct = quiz.questions.map((q) => q.correctIndex);
      if (failFirst) {
        const wrong = correct.map((c, i) => (i < 2 ? (c + 1) % (quiz.questions[i]?.options.length ?? 2) : c));
        await submitQuiz(ctx, caseOf(f), wrong, f.id);
        clock.advance(15 * 60_000);
      }
      await submitQuiz(ctx, caseOf(f), correct, f.id);
      space();
      await acknowledgePolicy(ctx, f.id, "codigo-de-conduta", f.id);
    },
    policies: async (f: NewJoinerFixture) => {
      for (const id of ["politica-de-viagens", "politica-de-ti", "rotina-de-trabalho"]) {
        await acknowledgePolicy(ctx, f.id, id, f.id);
        space();
      }
      await confirmBenefits(ctx, caseOf(f), f.id);
    },
    contract: async (f: NewJoinerFixture, customFile?: string) => {
      await sendContract(
        ctx,
        customFile
          ? { caseId: caseOf(f), mode: "customizado", fileName: customFile }
          : { caseId: caseOf(f), mode: "modelo", templateId: f.regime === "CLT" ? "clt-padrao" : "pj-padrao" },
        THIAGO,
      );
    },
    sign: async (f: NewJoinerFixture) => {
      await signContract(ctx, caseOf(f), f.id);
    },
    corporateEmail: async (f: NewJoinerFixture) => {
      await setCorporateEmail(ctx, caseOf(f), suggestedCorporateEmail(f.name), THIAGO);
    },
    notebook: async (f: NewJoinerFixture, assetTag: string) => {
      const item = (await repo.equipment.list()).find((e) => e.assetTag === assetTag);
      if (!item) throw new Error(`Equipamento ${assetTag} não existe`);
      await assignEquipment(ctx, item.id, f.id, THIAGO);
    },
    term: async (f: NewJoinerFixture, assetTag: string) => {
      const item = (await repo.equipment.list()).find((e) => e.assetTag === assetTag);
      if (!item) throw new Error(`Equipamento ${assetTag} não existe`);
      await acceptEquipmentTerm(ctx, item.id, f.id);
    },
    access: async (f: NewJoinerFixture, systems?: string[]) => {
      const grants = (await repo.access.list()).filter((g) => g.caseId === caseOf(f));
      for (const g of grants) {
        if (systems && !systems.includes(g.systemId)) continue;
        await grantAccess(ctx, g.id, THIAGO);
        space();
      }
    },
    agenda: async (f: NewJoinerFixture) => readAgenda(ctx, caseOf(f), f.id),
    checkIn: async (f: NewJoinerFixture) => checkIn(ctx, caseOf(f), f.id),
    feedback: async (f: NewJoinerFixture, nps: number, missing?: string, confusing?: string) =>
      submitFeedback(ctx, { caseId: caseOf(f), nps, missing, confusing }, f.id),
  };

  type Step = { at: string; seq: number; run: () => Promise<void> };
  const steps: Step[] = [];
  let seq = 0;
  const at = (day: number, hour: number, minute: number, run: () => Promise<void>) => {
    steps.push({ at: iso(day, hour, minute), seq: seq++, run });
  };

  // Carolina Reis — concluído, início há 26 dias, lead time de 15 dias, nota 8.
  const carolina = fx("carolina-reis");
  at(-41, 10, 0, () => act.create(carolina));
  at(-40, 20, 15, () => act.form(carolina));
  at(-37, 19, 0, () => act.docs(carolina));
  at(-36, 21, 0, () => act.compliance(carolina));
  at(-35, 10, 30, () => act.review(carolina));
  at(-35, 20, 0, () => act.policies(carolina));
  at(-34, 11, 0, () => act.contract(carolina));
  at(-33, 9, 0, () => act.sign(carolina));
  at(-33, 15, 0, () => act.corporateEmail(carolina));
  at(-32, 10, 0, () => act.notebook(carolina, "MON-NB-001"));
  at(-32, 20, 0, () => act.agenda(carolina));
  at(-31, 18, 0, () => act.term(carolina, "MON-NB-001"));
  at(-30, 11, 0, () => act.access(carolina));
  at(-26, 9, 10, () => act.checkIn(carolina));
  at(-26, 10, 0, () =>
    act.feedback(carolina, 8, "Um mapa de quem é quem nos projetos em andamento.", "Onde pedir acesso à pasta do projeto."),
  );

  // Marina Takeda — concluído, início há 5 dias, lead time de 10 dias, nota 9.
  const marina = fx("marina-takeda");
  at(-15, 10, 0, () => act.create(marina));
  at(-14, 21, 0, () => act.form(marina));
  at(-11, 19, 30, () => act.docs(marina));
  at(-10, 20, 0, () => act.compliance(marina, true));
  at(-10, 21, 10, () => act.policies(marina));
  at(-9, 10, 0, () => act.review(marina));
  at(-8, 11, 0, () => act.contract(marina));
  at(-8, 18, 0, () => act.sign(marina));
  at(-7, 9, 30, () => act.corporateEmail(marina));
  at(-7, 10, 0, () => act.notebook(marina, "MON-NB-002"));
  at(-7, 19, 0, () => act.term(marina, "MON-NB-002"));
  at(-7, 19, 10, () => act.agenda(marina));
  at(-6, 14, 0, () => act.access(marina));
  at(-5, 9, 5, () => act.checkIn(marina));
  at(-5, 10, 0, () => act.feedback(marina, 9, "Faltou saber como funciona o reembolso de transporte por aplicativo."));

  // Juliana Prado — contrato customizado assinado; notebook com termo pendente; acessos 2 de 3.
  const juliana = fx("juliana-prado");
  at(-10, 10, 0, () => act.create(juliana, true));
  at(-9, 20, 0, () => act.form(juliana));
  at(-7, 18, 0, () => act.docs(juliana));
  at(-6, 20, 0, () => act.compliance(juliana));
  at(-6, 20, 45, () => act.policies(juliana));
  at(-5, 11, 0, () => act.review(juliana));
  at(-4, 16, 0, () => act.contract(juliana, "contrato-juliana-prado-consultora-senior.pdf"));
  at(-1, 10, 0, () => act.sign(juliana));
  at(-1, 10, 30, () => act.corporateEmail(juliana));
  at(-1, 11, 0, () => act.notebook(juliana, "MON-NB-004"));
  at(-1, 14, 0, () => act.access(juliana, ["microsoft-365", "vexpenses"]));

  // Rafael Nogueira — documentos aprovados, contrato enviado, vídeo assistido, quiz pendente.
  const rafael = fx("rafael-nogueira");
  at(-9, 10, 0, () => act.create(rafael));
  at(-8, 21, 0, () => act.form(rafael));
  at(-5, 19, 0, () => act.docs(rafael));
  at(-4, 20, 0, async () => {
    await watchVideo(ctx, caseOf(rafael), rafael.id, true);
  });
  at(-3, 10, 0, () => act.review(rafael));
  at(-2, 15, 0, () => act.contract(rafael));

  // Lucas Ferraz (CLT) — ficha enviada; comprovante de residência rejeitado; 5 documentos na fila.
  const lucas = fx("lucas-ferraz");
  at(-6, 10, 0, () => act.create(lucas));
  at(-3, 20, 0, () => act.form(lucas));
  at(-2, 19, 0, () => act.docs(lucas));
  at(-1, 11, 0, () => act.review(lucas, { residencia: "Ilegível" }, ["identidade", "residencia"]));

  // Bruno Almeida — recém-cadastrado, nada preenchido (plano B da demo).
  const bruno = fx("bruno-almeida");
  at(-1, 17, 30, () => act.create(bruno));

  // Viradas de dia (7h), do primeiro evento até hoje.
  const firstDay = -41;
  for (let d = firstDay; d <= 0; d++) {
    const tickAt = d === 0 ? new Date(Math.min(Date.parse(iso(0, 7)), realNow.getTime() - 60_000)).toISOString() : iso(d, 7);
    steps.push({ at: tickAt, seq: seq++, run: async () => void (await tickIfNewDay(ctx)) });
  }

  steps.sort((a, b) => a.at.localeCompare(b.at) || a.seq - b.seq);
  for (const step of steps) {
    clock.set(step.at);
    await step.run();
  }

  // Lacunas já registradas (seção 11.3).
  await repo.assistant.insertGap({
    id: repo.newId("gap"),
    question: "Tem estacionamento conveniado perto do escritório?",
    askedById: "marina-takeda",
    askedAt: iso(-4, 15, 20),
    status: "aberta",
    routedToId: THIAGO,
  });
  await repo.assistant.insertGap({
    id: repo.newId("gap"),
    question: "A Monoda apoia curso de idiomas?",
    askedById: "carolina-reis",
    askedAt: iso(-20, 11, 5),
    status: "aberta",
    routedToId: "guilherme-bonfitto",
  });

  state.clockOffsetDays = 0;
  state.lastTickDate = today;
  return state;
}
