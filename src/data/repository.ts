import { z } from "zod";
import { DemoState } from "@/domain/types";
import { deriveQueue } from "@/domain/rules";
import { createSeed, DEMO_DATE } from "./seed";
const text = z.string();
const date = z.iso.date();
const bool = z.boolean();
export const stateSchema = z.object({
  invoices: z.array(
    z.object({
      id: text,
      number: text,
      client: text,
      amount: z.number().nonnegative(),
      currency: text,
      issueDate: date,
      dueDate: date,
      paymentStatus: z.enum(["unpaid", "paid"]),
      lastContact: date,
      nextFollowUp: date,
      dispute: bool,
      amountDiscrepancy: bool,
      accountantDependency: bool,
      notes: text,
      reconciled: bool,
    }),
  ),
  candidates: z.array(
    z.object({
      id: text,
      name: text,
      role: text,
      stage: z.enum(["Screen", "Interview", "Decision"]),
      screenStatus: text,
      decisionDate: date,
      decisionOwner: text,
      communicationStatus: text,
      travelRequired: bool,
      nextAction: text,
    }),
  ),
  hiringEvents: z.array(
    z.object({
      id: text,
      candidateId: text,
      at: date,
      interviewers: z.array(text),
      availability: text,
      scheduled: bool,
      feedbackReceived: z.array(text),
    }),
  ),
  starters: z.array(
    z.object({
      id: text,
      name: text,
      role: text,
      startDate: date,
      manager: text,
      checklist: z
        .array(
          z.object({ id: text, label: text, mandatory: bool, complete: bool }),
        )
        .min(1)
        .refine(
          (items) => items.some((i) => i.mandatory),
          "At least one mandatory check is required",
        ),
    }),
  ),
  contracts: z.array(
    z.object({
      id: text,
      counterparty: text,
      type: text,
      template: text,
      owner: text,
      status: text,
      signatory: text,
      effectiveDate: text,
      renewalDate: date,
      nonStandard: bool,
      humanReviewRequired: bool,
      documentLocation: text,
      notes: text,
      clauses: z.array(
        z.object({ title: text, standard: text, incoming: text }),
      ),
    }),
  ),
  rtw: z.array(
    z.object({
      id: text,
      employee: text,
      evidenceReceived: bool,
      checkDate: date,
      expiryDate: date,
      followUpDate: date,
      reviewer: text,
      status: text,
    }),
  ),
  events: z.array(
    z.object({
      id: text,
      title: text,
      attendees: z.array(text),
      date: date,
      time: text,
      place: text,
      travel: text,
      dietary: text,
      materials: bool,
      ndaComplete: bool,
      owner: text,
      calendarConfirmed: bool,
      openActions: z.array(text),
      founderAttention: bool,
    }),
  ),
  assets: z.array(
    z.object({
      id: text,
      name: text,
      assignedUser: text,
      supplier: text,
      cost: z.number(),
      purchaseDate: date,
      warranty: date,
      condition: text,
      replacementState: text,
    }),
  ),
  stock: z.array(
    z.object({
      id: text,
      name: text,
      quantity: z.number().nonnegative(),
      minimum: z.number().nonnegative(),
      supplier: text,
      reorderDate: date,
      approvedSupplier: bool,
      approvedBudget: bool,
      unusual: bool,
    }),
  ),
  vendors: z.array(
    z.object({
      id: text,
      title: text,
      supplier: text,
      owner: text,
      dueDate: date,
      approvedSupplier: bool,
      approvedBudget: bool,
      unusual: bool,
      safety: bool,
      disruption: bool,
      status: text,
    }),
  ),
  audit: z.array(
    z.object({
      id: text,
      recordId: text,
      at: text,
      actor: text,
      action: text,
      evidence: text,
    }),
  ),
  closures: z.array(
    z.object({ recordId: text, approver: text, evidence: text }),
  ),
});
export type OperatorCommand =
  | {
      type: "record-payment";
      recordId: string;
      evidence: string;
      confirmed: boolean;
    }
  | { type: "reconcile"; recordId: string; evidence: string; approver: string }
  | {
      type: "checklist";
      recordId: string;
      checkId: string;
      complete: boolean;
      evidence: string;
    }
  | {
      type: "feedback";
      recordId: string;
      interviewer: string;
      evidence: string;
    }
  | { type: "close"; recordId: string; approver: string; evidence: string }
  | { type: "note"; recordId: string; evidence: string };
export interface DataRepository<Result = DemoState> {
  snapshot(): Result;
  execute(command: OperatorCommand): Result;
}
export class SeedRepository implements DataRepository {
  private state: DemoState;
  constructor(state: DemoState = createSeed()) {
    this.state = stateSchema.parse(state);
  }
  snapshot() {
    return structuredClone(this.state);
  }
  execute(c: OperatorCommand) {
    const next = this.snapshot();
    const item = deriveQueue(next, DEMO_DATE).find(
      (i) => i.sourceId === c.recordId,
    );
    if (!item) throw new Error("Source record not found.");
    if (!c.evidence.trim()) throw new Error("Evidence is required.");
    let action = "Operator note recorded";
    let actor = "Operations owner";
    if (c.type === "record-payment") {
      if (!c.confirmed)
        throw new Error("Explicit payment confirmation is required.");
      const inv = next.invoices.find((i) => i.id === c.recordId);
      if (!inv || inv.paymentStatus === "paid")
        throw new Error("Invoice is not awaiting payment.");
      inv.paymentStatus = "paid";
      inv.reconciled = false;
      inv.nextFollowUp = DEMO_DATE;
      action = "Payment manually recorded; reconciliation task created";
    }
    if (c.type === "reconcile") {
      const inv = next.invoices.find((i) => i.id === c.recordId);
      if (!inv || inv.paymentStatus !== "paid")
        throw new Error("Record payment first.");
      if (c.approver !== "Finance owner")
        throw new Error("Finance owner check is required.");
      inv.reconciled = true;
      actor = c.approver;
      action = "Reconciliation checked";
    }
    if (c.type === "checklist") {
      const st = next.starters.find((s) => s.id === c.recordId);
      const check = st?.checklist.find((i) => i.id === c.checkId);
      if (!check) throw new Error("Checklist item not found.");
      check.complete = c.complete;
      action = `${check.label}: ${c.complete ? "human completion recorded" : "reopened"}`;
    }
    if (c.type === "feedback") {
      const event = next.hiringEvents.find((e) => e.candidateId === c.recordId);
      if (!event || !event.interviewers.includes(c.interviewer))
        throw new Error("Assigned interviewer required.");
      if (event.feedbackReceived.includes(c.interviewer))
        throw new Error("Feedback already recorded.");
      event.feedbackReceived.push(c.interviewer);
      action = `Feedback received from ${c.interviewer}; no candidate decision made`;
    }
    if (c.type === "close") {
      if (item.status === "closed") throw new Error("Record already closed.");
      if (
        c.recordId.startsWith("INV") ||
        c.recordId.startsWith("ONB") ||
        c.recordId.startsWith("CAN")
      )
        throw new Error("Use the source workflow to resolve this record.");
      if (item.decisionOwner && c.approver !== item.decisionOwner)
        throw new Error(`Explicit ${item.decisionOwner} approval is required.`);
      if (!c.approver.trim()) throw new Error("Named approver is required.");
      next.closures.push({
        recordId: c.recordId,
        approver: c.approver,
        evidence: c.evidence,
      });
      actor = c.approver;
      action = "Action closed with human approval evidence";
    }
    next.audit.push({
      id: crypto.randomUUID(),
      recordId: c.recordId,
      at: new Date().toISOString(),
      actor,
      action,
      evidence: c.evidence.trim(),
    });
    this.state = stateSchema.parse(next);
    return this.snapshot();
  }
  reset() {
    this.state = createSeed();
    return this.snapshot();
  }
}
/** Server-side seam: supply an authenticated, RLS-scoped transport before enabling. */
export interface SupabaseTransport {
  load(): Promise<DemoState>;
  saveCommand(command: OperatorCommand): Promise<DemoState>;
}
export class SupabaseRepository implements DataRepository<Promise<DemoState>> {
  constructor(private transport: SupabaseTransport) {}
  async snapshot() {
    return stateSchema.parse(await this.transport.load());
  }
  async execute(command: OperatorCommand) {
    return stateSchema.parse(await this.transport.saveCommand(command));
  }
}
