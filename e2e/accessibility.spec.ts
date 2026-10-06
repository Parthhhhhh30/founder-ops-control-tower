import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("all modules satisfy automated WCAG AA checks", async ({ page }) => {
  await page.goto("/");
  for (const area of [
    "Command Desk",
    "Revenue Ops",
    "People Ops",
    "Contracts & Compliance",
    "Company Ops",
    "Weekly Brief",
    "Forward Look",
  ]) {
    if (area !== "Command Desk")
      await page.getByRole("button", { name: new RegExp(`^${area}`) }).click();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      area,
    ).toEqual([]);
  }
});
