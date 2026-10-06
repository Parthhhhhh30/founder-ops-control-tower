import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import {
  DemoState,
  Invoice,
  Judgment,
  Mode,
  OperationalItem,
  FounderDecision,
  ForwardRisk,
  WeeklyBrief,
  NewStarter,
  VendorTask,
} from "./types";
export const days = (a: string, b: string) =>
  differenceInCalendarDays(parseISO(a), parseISO(b));
export const shift = (date: string, n: number) =>
  format(addDays(parseISO(date), n), "yyyy-MM-dd");
const judgment = (
  mode: Mode,
  rule_id: string,
  reason: string,
  sourceFields: Judgment["sourceFields"],
  owner: string,
  nextAction: string,
  dueDate: string,
  decisionOwner?: string,
): Judgment => ({
  mode,
  rule_id,
  reason,
  sourceFields,
  owner,
  nextAction,
  dueDate,
  decisionOwner,
  severity:
    mode === "ESCALATE"
      ? "material"
      : mode === "REVIEW"
        ? "attention"
        : "routine",
  auditEvidence: "Derived from synthetic source fields under demo policy v1.",
});
export function invoiceJudgment(i: Invoice, today: string): Judgment {
  const overdue = Math.max(0, days(today, i.dueDate));
  const fields = {
    amount: i.amount,
    paymentStatus: i.paymentStatus,
    dueDate: i.dueDate,
    daysOverdue: overdue,
    dispute: i.dispute,
    amountDiscrepancy: i.amountDiscrepancy,
    accountantDependency: i.accountantDependency,
  };
  if (i.paymentStatus === "paid")
    return judgment(
      "REVIEW",
      "REV-PAID",
      "Payment recorded: collection is closed; a human must check reconciliation.",
      fields,
      "Operations owner",
      "Match receipt to ledger and record finance check",
      today,
      "Finance owner",
    );
  if (overdue >= 14)
    return judgment(
      "ESCALATE",
      "REV-14",
      "Invoice is 14+ days overdue. A material collection decision requires founder/finance judgment.",
      fields,
      "Operations owner",
      "Decide revised payment plan with finance context",
      today,
      "Founder",
    );
  if (
    overdue >= 7 ||
    i.dispute ||
    i.amountDiscrepancy ||
    i.accountantDependency
  )
    return judgment(
      "REVIEW",
      "REV-REVIEW",
      overdue >= 7
        ? "7–13 days overdue: inspect contact history before further contact."
        : "Dispute, amount mismatch or accountant dependency requires review.",
      fields,
      "Operations owner",
      "Inspect history and resolve discrepancy with finance",
      today,
      "Finance owner",
    );
  return judgment(
    "ACT",
    overdue > 0
      ? "REV-1-6"
      : days(i.dueDate, today) <= 3
        ? "REV-DUE"
        : "REV-FUTURE",
    overdue > 0
      ? "1–6 days overdue: routine follow-up is within demo collection policy."
      : days(i.dueDate, today) === 0
        ? "Due today: confirm payment status."
        : days(i.dueDate, today) <= 3
          ? "Due within 3 days: prepare a friendly reminder."
          : "Not yet due: schedule the pre-due reminder.",
    fields,
    "Operations owner",
    overdue > 0
      ? "Prepare collection follow-up"
      : "Prepare friendly payment reminder",
    days(i.dueDate, today) > 3 ? shift(i.dueDate, -3) : today,
  );
}
export const starterReady = (s: NewStarter) =>
  s.checklist.filter((c) => c.mandatory).every((c) => c.complete);
export function companyJudgment(
  v: Pick<
    VendorTask,
    | "approvedSupplier"
    | "approvedBudget"
    | "unusual"
    | "safety"
    | "disruption"
    | "dueDate"
    | "owner"
  >,
): Judgment {
  if (v.safety || v.disruption)
    return judgment(
      "ESCALATE",
      "OPS-SAFETY",
      "Safety or major disruption requires an accountable decision.",
      { safety: v.safety, disruption: v.disruption },
      v.owner,
      "Approve contingency and accountable response",
      v.dueDate,
      "Founder",
    );
  if (!v.approvedSupplier || !v.approvedBudget || v.unusual)
    return judgment(
      "REVIEW",
      "OPS-EXCEPTION",
      "New vendor, unapproved budget or unusual purchase requires human review.",
      {
        approvedSupplier: v.approvedSupplier,
        approvedBudget: v.approvedBudget,
        unusual: v.unusual,
      },
      v.owner,
      "Check supplier and obtain budget approval",
      v.dueDate,
      "Operations lead",
    );
  return judgment(
    "ACT",
    "OPS-APPROVED",
    "Approved supplier, approved budget and normal item: operator can progress.",
    { approvedSupplier: true, approvedBudget: true, unusual: false },
    v.owner,
    "Progress approved routine purchase",
    v.dueDate,
  );
}
export function deriveQueue(s: DemoState, today: string): OperationalItem[] {
  const items: OperationalItem[] = [];
  const push = (
    id: string,
    title: string,
    area: OperationalItem["area"],
    j: Judgment,
    dependency = "None",
    money?: number,
    closed = false,
  ) => {
    const audit = s.audit.filter((a) => a.recordId === id);
    const closure = s.closures.find((c) => c.recordId === id);
    items.push({
      ...j,
      id,
      sourceId: id,
      title,
      area,
      priority:
        j.severity === "material"
          ? "Material"
          : j.severity === "attention"
            ? "Attention"
            : "Routine",
      financialImpact: money,
      externalDependency: dependency,
      risk: j.reason,
      status: closed || closure ? "closed" : "open",
      createdAt: "2026-10-01T09:00:00Z",
      updatedAt: audit.at(-1)?.at ?? "2026-10-06T08:00:00Z",
      auditEvents: audit,
    });
  };
  for (const i of s.invoices)
    push(
      i.id,
      i.paymentStatus === "paid"
        ? `Reconcile receipt · ${i.client}`
        : `Collect invoice ${i.number} · ${i.client}`,
      "Revenue",
      invoiceJudgment(i, today),
      i.accountantDependency
        ? "Accountant response"
        : i.amountDiscrepancy
          ? "Finance amount check"
          : "Client payment",
      i.paymentStatus === "unpaid" ? i.amount : undefined,
      i.paymentStatus === "paid" && i.reconciled,
    );
  for (const c of s.candidates) {
    const event = s.hiringEvents.find((e) => e.candidateId === c.id);
    const missing =
      event && days(today, event.at) >= 0
        ? event.interviewers.filter((p) => !event.feedbackReceived.includes(p))
        : [];
    if (missing.length)
      push(
        c.id,
        `Collect feedback · ${c.name}`,
        "People",
        judgment(
          "ACT",
          "HIR-FEEDBACK",
          "Missing interviewer feedback creates a follow-up task, not a hiring decision.",
          {
            missingFeedback: missing.join(", "),
            decisionDate: c.decisionDate,
            stage: c.stage,
          },
          "Operations owner",
          `Request feedback from ${missing.join(", ")}`,
          c.decisionDate,
        ),
        "Interviewer feedback",
      );
    else
      push(
        c.id,
        `${c.stage} coordination · ${c.name}`,
        "People",
        judgment(
          c.stage === "Decision" ? "REVIEW" : "ACT",
          c.stage === "Decision" ? "HIR-DECISION" : "HIR-COORDINATE",
          c.stage === "Decision"
            ? "Complete evidence is ready for a human hiring decision."
            : "Coordinate the approved interview workflow; candidate progression remains human.",
          { stage: c.stage, decisionDate: c.decisionDate },
          "Operations owner",
          c.stage === "Decision"
            ? "Prepare evidence for hiring owner"
            : c.nextAction,
          c.decisionDate,
          c.stage === "Decision" ? c.decisionOwner : undefined,
        ),
      );
  }
  for (const st of s.starters) {
    const missing = st.checklist.filter((c) => c.mandatory && !c.complete);
    const critical = missing.some((c) => c.id === "CHK-0" || c.id === "CHK-1");
    push(
      st.id,
      `New starter readiness · ${st.name}`,
      "People",
      judgment(
        critical ? "ESCALATE" : missing.length ? "REVIEW" : "ACT",
        "PEOPLE-READY",
        missing.length
          ? `${missing.length} mandatory item(s) incomplete. Starter cannot be Ready.`
          : "All mandatory checklist items are complete.",
        {
          startDate: st.startDate,
          missing: missing.map((c) => c.label).join(", ") || "None",
          ready: starterReady(st),
        },
        "Operations owner",
        missing.length
          ? "Complete missing checks with accountable owners"
          : "Confirm first-week handover",
        st.startDate,
        missing.length ? "People owner" : undefined,
      ),
      missing.length ? "Mandatory onboarding checks" : "None",
      undefined,
      !missing.length,
    );
  }
  for (const c of s.contracts) {
    const changed =
      c.nonStandard || c.clauses.some((x) => x.standard !== x.incoming);
    const metadata = !c.template || !c.signatory || !c.effectiveDate;
    push(
      c.id,
      `Contract review · ${c.counterparty}`,
      "Contracts",
      judgment(
        changed
          ? "ESCALATE"
          : metadata || c.humanReviewRequired
            ? "REVIEW"
            : "ACT",
        changed ? "LEGAL-CLAUSE" : "LEGAL-METADATA",
        changed
          ? "Clause differs from template. Human/legal review required."
          : metadata
            ? "Signature, effective date or template metadata is missing."
            : "Contract administration follows the approved review workflow.",
        {
          template: c.template,
          signatory: c.signatory || "Missing",
          effectiveDate: c.effectiveDate || "Missing",
          nonStandard: changed,
        },
        c.owner,
        changed
          ? "Prepare clause comparison for legal owner"
          : "Collect metadata and obtain human review",
        c.effectiveDate || today,
        changed
          ? "Legal owner"
          : metadata || c.humanReviewRequired
            ? c.owner
            : undefined,
      ),
      "Human contract review",
    );
  }
  for (const r of s.rtw) {
    const expired = days(today, r.expiryDate) > 0;
    const follow = days(r.followUpDate, today) <= 60;
    push(
      r.id,
      `RTW administration · ${r.employee}`,
      "Compliance",
      judgment(
        expired || !r.evidenceReceived ? "ESCALATE" : follow ? "REVIEW" : "ACT",
        expired || !r.evidenceReceived ? "RTW-EVIDENCE" : "RTW-60",
        expired || !r.evidenceReceived
          ? "Expired or missing mandatory evidence requires human escalation."
          : follow
            ? "Follow-up is within 60 days. Arrange a human administrative review."
            : "Follow-up scheduled. This system does not determine eligibility.",
        {
          evidenceReceived: r.evidenceReceived,
          expiryDate: r.expiryDate,
          followUpDate: r.followUpDate,
        },
        "Operations owner",
        "Arrange documented review with people owner",
        r.followUpDate,
        r.reviewer,
      ),
      "Human RTW reviewer",
    );
  }
  for (const e of s.events) {
    const blocked =
      !e.materials ||
      !e.ndaComplete ||
      !e.calendarConfirmed ||
      e.openActions.length > 0;
    push(
      e.id,
      e.title,
      "Company",
      judgment(
        e.founderAttention ? "ESCALATE" : blocked ? "REVIEW" : "ACT",
        "CLIENT-COMMITMENT",
        blocked
          ? "Client commitment has unresolved logistics, materials or NDA actions."
          : "Logistics confirmed; operator can progress.",
        {
          date: e.date,
          materials: e.materials,
          ndaComplete: e.ndaComplete,
          calendarConfirmed: e.calendarConfirmed,
          openActions: e.openActions.join(", "),
        },
        e.owner,
        blocked
          ? "Resolve open actions before commitment"
          : "Confirm final attendee pack",
        e.date,
        e.founderAttention
          ? "Founder"
          : blocked
            ? "Operations lead"
            : undefined,
      ),
      blocked ? "Logistics / NDA review" : "None",
    );
  }
  for (const v of s.vendors)
    push(
      v.id,
      v.title,
      "Company",
      companyJudgment(v),
      "Supplier",
      undefined,
      v.status === "closed",
    );
  for (const st of s.stock)
    if (st.quantity < st.minimum)
      push(
        st.id,
        `Reorder ${st.name}`,
        "Company",
        companyJudgment({
          ...st,
          safety: false,
          disruption: false,
          dueDate: st.reorderDate,
          owner: "Operations owner",
        }),
        "Approved supplier",
      );
  return items.sort(
    (a, b) =>
      a.status.localeCompare(b.status) ||
      { ESCALATE: 0, REVIEW: 1, ACT: 2 }[a.mode] -
        { ESCALATE: 0, REVIEW: 1, ACT: 2 }[b.mode] ||
      a.dueDate.localeCompare(b.dueDate),
  );
}
export function founderQueue(items: OperationalItem[]): FounderDecision[] {
  return items
    .filter((i) => i.status === "open" && i.decisionOwner === "Founder")
    .map((i) => ({
      itemId: i.id,
      title: i.title,
      decisionOwner: "Founder",
      reason: i.reason,
      dueDate: i.dueDate,
      nextAction: i.nextAction,
    }));
}
export function forwardLook(
  s: DemoState,
  today: string,
  horizon: 7 | 14,
): ForwardRisk[] {
  const risks: ForwardRisk[] = [];
  const closed = (id: string) => s.closures.some((c) => c.recordId === id);
  const push = (
    sourceId: string,
    date: string,
    title: string,
    reason: string,
    ruleId: string,
    owner: string,
  ) => {
    if (
      !closed(sourceId) &&
      days(date, today) >= 0 &&
      days(date, today) <= horizon
    )
      risks.push({
        id: `FWD-${sourceId}`,
        sourceId,
        date,
        title,
        reason,
        ruleId,
        owner,
      });
  };
  s.invoices
    .filter((i) => i.paymentStatus === "unpaid")
    .forEach((i) =>
      push(
        i.id,
        shift(i.dueDate, 14),
        `${i.client} crosses collection escalation`,
        `${i.amount} ${i.currency} remains unpaid at 14 days overdue. Due ${i.dueDate}.`,
        "REV-14",
        "Finance owner",
      ),
    );
  s.candidates.forEach((c) => {
    const e = s.hiringEvents.find((e) => e.candidateId === c.id);
    if (e && e.feedbackReceived.length < e.interviewers.length)
      push(
        c.id,
        c.decisionDate,
        `Decision evidence incomplete · ${c.name}`,
        "Decision date arrives before all interviewer feedback is available.",
        "HIR-FEEDBACK",
        c.decisionOwner,
      );
  });
  s.starters
    .filter((st) => !starterReady(st))
    .forEach((st) =>
      push(
        st.id,
        st.startDate,
        `Starter blocked · ${st.name}`,
        "Start date arrives with mandatory onboarding work incomplete.",
        "PEOPLE-READY",
        st.manager,
      ),
    );
  s.contracts
    .filter((c) => c.nonStandard || c.humanReviewRequired)
    .forEach((c) =>
      push(
        c.id,
        c.renewalDate,
        `Unresolved contract renewal · ${c.counterparty}`,
        "Renewal approaches while human review remains unresolved.",
        "LEGAL-RENEWAL",
        c.owner,
      ),
    );
  s.rtw.forEach((r) =>
    push(
      r.id,
      r.followUpDate,
      `RTW follow-up · ${r.employee}`,
      "Administrative review due; no eligibility determination is made.",
      "RTW-60",
      r.reviewer,
    ),
  );
  s.events
    .filter(
      (e) =>
        !e.materials ||
        !e.ndaComplete ||
        !e.calendarConfirmed ||
        e.openActions.length > 0,
    )
    .forEach((e) =>
      push(
        e.id,
        e.date,
        `Client commitment blocked · ${e.title}`,
        "Materials, NDA or logistics remain unresolved.",
        "CLIENT-COMMITMENT",
        e.owner,
      ),
    );
  s.stock
    .filter((st) => st.quantity < st.minimum)
    .forEach((st) =>
      push(
        st.id,
        st.reorderDate,
        `Stock below minimum · ${st.name}`,
        `${st.quantity} available against minimum ${st.minimum}. Reorder needed.`,
        "OPS-STOCK",
        "Operations owner",
      ),
    );
  return risks.sort((a, b) => a.date.localeCompare(b.date));
}
export function weeklyBrief(s: DemoState, today: string): WeeklyBrief {
  const q = deriveQueue(s, today);
  return {
    date: today,
    sections: [
      {
        title: "What closed",
        lines: q.filter((i) => i.status === "closed").map((i) => i.title),
      },
      {
        title: "Money",
        lines: q
          .filter((i) => i.area === "Revenue" && i.status === "open")
          .map((i) => `${i.title} — ${i.mode}: ${i.reason}`),
      },
      ...(
        ["Hiring", "Legal / compliance", "People", "Clients", "Office"] as const
      ).map((title) => ({
        title,
        lines: q
          .filter(
            (i) =>
              i.status === "open" &&
              (title === "Hiring"
                ? i.id.startsWith("CAN")
                : title === "People"
                  ? i.id.startsWith("ONB")
                  : title === "Legal / compliance"
                    ? ["Contracts", "Compliance"].includes(i.area)
                    : title === "Clients"
                      ? i.id.startsWith("EVT")
                      : i.id.startsWith("VEN") || i.id.startsWith("STK")),
          )
          .map((i) => `${i.title} — ${i.nextAction}`),
      })),
      {
        title: "Forward look",
        lines: forwardLook(s, today, 14).map((r) => `${r.date}: ${r.title}`),
      },
    ],
    decisions: founderQueue(q),
  };
}
