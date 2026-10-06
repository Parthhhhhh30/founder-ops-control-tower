import { describe, expect, it } from "vitest";
import { createSeed, DEMO_DATE } from "@/data/seed";
import {
  invoiceJudgment,
  shift,
  deriveQueue,
  starterReady,
  founderQueue,
  forwardLook,
  companyJudgment,
  weeklyBrief,
} from "@/domain/rules";
import {
  SeedRepository,
  SupabaseRepository,
  stateSchema,
} from "@/data/repository";
import {
  MockDraftingProvider,
  LiveDraftingProvider,
} from "@/providers/drafting";
describe("Transparent demo policies", () => {
  it.each([
    [-5, "ACT"],
    [-3, "ACT"],
    [0, "ACT"],
    [1, "ACT"],
    [6, "ACT"],
    [7, "REVIEW"],
    [13, "REVIEW"],
    [14, "ESCALATE"],
    [30, "ESCALATE"],
  ])("invoice age %s resolves to %s", (age, mode) => {
    const i = createSeed().invoices[2];
    i.dueDate = shift(DEMO_DATE, -Number(age));
    const j = invoiceJudgment(i, DEMO_DATE);
    expect(j.mode).toBe(mode);
    expect(j.sourceFields.daysOverdue).toBe(Math.max(0, Number(age)));
    expect(j.rule_id).toBeTruthy();
  });
  it.each(["dispute", "amountDiscrepancy", "accountantDependency"] as const)(
    "%s imposes review",
    (field) => {
      const i = createSeed().invoices[2];
      i.dueDate = shift(DEMO_DATE, 4);
      i[field] = true;
      expect(invoiceJudgment(i, DEMO_DATE).mode).toBe("REVIEW");
    },
  );
  it("future invoice gets deterministic pre-due follow-up", () => {
    const i = createSeed().invoices[2];
    i.dueDate = shift(DEMO_DATE, 10);
    expect(invoiceJudgment(i, DEMO_DATE).dueDate).toBe(shift(DEMO_DATE, 7));
  });
  it("starter cannot be ready with a mandatory gap, optional gap does not block", () => {
    const st = createSeed().starters[0];
    expect(starterReady(st)).toBe(false);
    st.checklist.find((c) => c.id === "CHK-6")!.complete = true;
    st.checklist.find((c) => !c.mandatory)!.complete = false;
    expect(starterReady(st)).toBe(true);
  });
  it("missing feedback creates follow-up without candidate decisions", () => {
    const s = createSeed();
    const j = deriveQueue(s, DEMO_DATE).find((i) => i.id === "CAN-021")!;
    expect(j.rule_id).toBe("HIR-FEEDBACK");
    expect(j.nextAction).toContain("Interviewer B");
    expect(j.decisionOwner).toBeUndefined();
    expect(s.candidates[0].stage).toBe("Decision");
  });
  it("future scheduled interviews are not treated as overdue feedback", () => {
    expect(
      deriveQueue(createSeed(), DEMO_DATE).find((i) => i.id === "CAN-022")!
        .rule_id,
    ).toBe("HIR-COORDINATE");
  });
  it("contract clause change escalates to legal, metadata gap reviews", () => {
    const q = deriveQueue(createSeed(), DEMO_DATE);
    expect(q.find((i) => i.id === "CON-018")).toMatchObject({
      mode: "ESCALATE",
      decisionOwner: "Legal owner",
    });
    expect(q.find((i) => i.id === "CON-019")!.mode).toBe("REVIEW");
  });
  it("RTW is administrative; upcoming review and expired evidence differ", () => {
    const s = createSeed();
    expect(
      deriveQueue(s, DEMO_DATE).find((i) => i.id === "RTW-004")!.mode,
    ).toBe("REVIEW");
    s.rtw[0].expiryDate = shift(DEMO_DATE, -1);
    expect(
      deriveQueue(s, DEMO_DATE).find((i) => i.id === "RTW-004")!.mode,
    ).toBe("ESCALATE");
    s.rtw[0].expiryDate = shift(DEMO_DATE, 100);
    s.rtw[0].evidenceReceived = false;
    expect(
      deriveQueue(s, DEMO_DATE).find((i) => i.id === "RTW-004")!.mode,
    ).toBe("ESCALATE");
  });
  it("normal, exception and safety company work resolve to distinct modes", () => {
    const s = createSeed();
    expect(s.vendors.map(companyJudgment).map((j) => j.mode)).toEqual([
      "ACT",
      "REVIEW",
      "ESCALATE",
    ]);
  });
  it("founder decisions exclude legal and hiring owners and closed records", () => {
    const q = deriveQueue(createSeed(), DEMO_DATE);
    expect(founderQueue(q).map((d) => d.itemId)).toEqual([
      "INV-1042",
      "VEN-005",
    ]);
    q.find((i) => i.id === "VEN-005")!.status = "closed";
    expect(founderQueue(q)).toHaveLength(1);
  });
  it("7 and 14 day forward look exposes concrete threshold dates", () => {
    const s = createSeed();
    const seven = forwardLook(s, DEMO_DATE, 7);
    const fourteen = forwardLook(s, DEMO_DATE, 14);
    expect(seven.some((r) => r.sourceId === "ONB-007")).toBe(true);
    expect(
      seven.some((r) => r.sourceId === "INV-1048" && r.date === "2026-10-12"),
    ).toBe(true);
    expect(seven.some((r) => r.sourceId === "RTW-004")).toBe(false);
    expect(fourteen.some((r) => r.sourceId === "RTW-004")).toBe(true);
    expect(fourteen.some((r) => r.sourceId === "CON-018")).toBe(true);
    expect(fourteen.length).toBeGreaterThan(seven.length);
  });
  it("paid sources no longer create collection risks", () => {
    const s = createSeed();
    s.invoices.forEach((i) => (i.paymentStatus = "paid"));
    expect(
      forwardLook(s, DEMO_DATE, 14).some((r) => r.ruleId === "REV-14"),
    ).toBe(false);
  });
  it("weekly brief founder section is exclusively accountable founder decisions", () => {
    expect(weeklyBrief(createSeed(), DEMO_DATE).decisions).toHaveLength(2);
  });
});
describe("Audited repository and drafting boundary", () => {
  it("payment confirmation creates reconciliation task and audit; no silent payment change", () => {
    const r = new SeedRepository();
    expect(() =>
      r.execute({
        type: "record-payment",
        recordId: "INV-1051",
        confirmed: false,
        evidence: "Receipt",
      }),
    ).toThrow();
    const s = r.execute({
      type: "record-payment",
      recordId: "INV-1051",
      confirmed: true,
      evidence: "Synthetic receipt matched",
    });
    expect(s.invoices[2].paymentStatus).toBe("paid");
    expect(s.invoices[2].reconciled).toBe(false);
    expect(s.audit.at(-1)?.action).toContain("reconciliation task");
    expect(
      deriveQueue(s, DEMO_DATE).find((i) => i.id === "INV-1051")!.status,
    ).toBe("open");
    expect(() =>
      r.execute({
        type: "reconcile",
        recordId: "INV-1051",
        approver: "Operator",
        evidence: "Checked",
      }),
    ).toThrow();
    expect(
      r.execute({
        type: "reconcile",
        recordId: "INV-1051",
        approver: "Finance owner",
        evidence: "Matched to ledger",
      }).invoices[2].reconciled,
    ).toBe(true);
  });
  it("closure requires accountable approval and cannot hide unpaid collection", () => {
    const r = new SeedRepository();
    expect(() =>
      r.execute({
        type: "close",
        recordId: "CON-018",
        approver: "Founder",
        evidence: "Approved",
      }),
    ).toThrow();
    expect(() =>
      r.execute({
        type: "close",
        recordId: "INV-1042",
        approver: "Founder",
        evidence: "Hide invoice",
      }),
    ).toThrow();
    const s = r.execute({
      type: "close",
      recordId: "CON-018",
      approver: "Legal owner",
      evidence: "Human legal review reference DEMO-1",
    });
    expect(s.closures).toHaveLength(1);
    expect(s.audit.at(-1)?.actor).toBe("Legal owner");
    expect(
      deriveQueue(s, DEMO_DATE).find((i) => i.id === "CON-018")!.status,
    ).toBe("closed");
  });
  it("feedback and checklist actions create evidence without hiring progression", () => {
    const r = new SeedRepository();
    const s = r.execute({
      type: "feedback",
      recordId: "CAN-021",
      interviewer: "Interviewer B",
      evidence: "Human interview notes received",
    });
    expect(s.candidates[0].stage).toBe("Decision");
    expect(
      deriveQueue(s, DEMO_DATE).find((i) => i.id === "CAN-021")!.rule_id,
    ).toBe("HIR-DECISION");
    expect(
      starterReady(
        r.execute({
          type: "checklist",
          recordId: "ONB-007",
          checkId: "CHK-6",
          complete: true,
          evidence: "Access approved by security owner",
        }).starters[0],
      ),
    ).toBe(true);
  });
  it("snapshot cannot be mutated by consumers and corrupt restore is rejected", () => {
    const r = new SeedRepository();
    r.snapshot().invoices[0].amount = 0;
    expect(r.snapshot().invoices[0].amount).toBe(18400);
    expect(stateSchema.safeParse({ invoices: [] }).success).toBe(false);
  });
  it("AI drafts only text and cannot modify deterministic truth", async () => {
    const s = createSeed();
    const before = JSON.stringify(s);
    const input = {
      client: s.invoices[0].client,
      invoiceNumber: "1042",
      amount: 18400,
      currency: "GBP",
      dueDate: "2026-09-21",
      context: "Synthetic",
    };
    expect(await new MockDraftingProvider().draftCollection(input)).toContain(
      "Draft only",
    );
    expect(JSON.stringify(s)).toBe(before);
    const unsafe = new LiveDraftingProvider(async () => ({
      paymentStatus: "paid",
      mode: "ACT",
    }));
    await expect(unsafe.draftCollection(input)).rejects.toThrow();
  });
});

describe("Future database transport seam", () => {
  it("validates loaded and committed state without requiring external credentials", async () => {
    const seed = new SeedRepository();
    const adapter = new SupabaseRepository({
      load: async () => seed.snapshot(),
      saveCommand: async (c) => seed.execute(c),
    });
    expect((await adapter.snapshot()).invoices).toHaveLength(5);
    const saved = await adapter.execute({
      type: "note",
      recordId: "INV-1042",
      evidence: "Synthetic transport check",
    });
    expect(saved.audit.at(-1)?.evidence).toBe("Synthetic transport check");
  });
  it("rejects impossible calendar dates and missing mandatory onboarding configuration", () => {
    const s = createSeed();
    s.invoices[0].dueDate = "2026-02-30";
    expect(stateSchema.safeParse(s).success).toBe(false);
    const other = createSeed();
    other.starters[0].checklist = [];
    expect(stateSchema.safeParse(other).success).toBe(false);
  });
});
