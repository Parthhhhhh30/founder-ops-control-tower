import { z } from "zod";
export const draftInputSchema = z
  .object({
    client: z.string(),
    invoiceNumber: z.string(),
    amount: z.number().nonnegative(),
    currency: z.string(),
    dueDate: z.string(),
    context: z.string(),
  })
  .strict();
export type DraftInput = z.infer<typeof draftInputSchema>;
export interface DraftingProvider {
  draftCollection(input: DraftInput): Promise<string>;
}
export class MockDraftingProvider implements DraftingProvider {
  async draftCollection(input: DraftInput) {
    const i = draftInputSchema.parse(input);
    return `Hello ${i.client},\n\nWe are following up on invoice ${i.invoiceNumber} for ${i.currency} ${i.amount.toLocaleString("en-GB")}, due ${i.dueDate}. Could you confirm the current payment status and expected timing?\n\nPlease let us know if you need any supporting information.\n\nThank you,\nOperations team (synthetic demo)\n\n[Draft only — operator must review before any external use.]`;
  }
}
/** Server-only transport; never pass repository access or mutation tools to the model. */
export class LiveDraftingProvider implements DraftingProvider {
  constructor(private transport: (input: DraftInput) => Promise<unknown>) {}
  async draftCollection(input: DraftInput) {
    const result = await this.transport(draftInputSchema.parse(input));
    return z.string().min(1).max(12000).parse(result);
  }
}
