import { test, expect } from "@playwright/test";
test("queue judgment, founder scope, drafts, payment and reconciliation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Command Desk",
  );
  const inspector = page.getByRole("complementary", {
    name: "Record inspector",
  });
  await expect(inspector.getByText("WHY ESCALATE?")).toBeVisible();
  await page.getByRole("button", { name: "Review decisions" }).click();
  await expect(page.locator(".queue-table tbody tr")).toHaveCount(2);
  await expect(page.locator(".signal-line")).not.toContainText("open actions");
  await expect(page.locator(".queue-table")).not.toContainText("Atlas");
  await page.getByRole("button", { name: "Revenue Ops", exact: true }).click();
  await expect(page.getByText("15d overdue")).toBeVisible();
  await page.getByRole("button", { name: "Prepare collection draft" }).click();
  await expect(page.getByLabel("Reviewable draft")).toContainText("Draft only");
  await expect(
    page.getByRole("button", { name: "Record payment received" }),
  ).toBeDisabled();
  await page
    .getByLabel("Action / approval evidence")
    .fill("Synthetic receipt checked DEMO-1042");
  await page
    .getByLabel("I manually verified payment receipt against evidence.")
    .check();
  await page.getByRole("button", { name: "Record payment received" }).click();
  await expect(
    inspector.getByRole("heading", { name: "Reconcile receipt · Cedar Works" }),
  ).toBeVisible();
  await expect(
    inspector.getByText(
      "Payment manually recorded; reconciliation task created",
    ),
  ).toBeVisible();
  await page
    .getByLabel("Action / approval evidence")
    .fill("Finance owner matched ledger DEMO-1042");
  await page.getByLabel("Finance owner has checked reconciliation.").check();
  await page.getByRole("button", { name: "Record finance check" }).click();
  await expect(inspector.getByText("Resolved", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Reconciled", { exact: true })).toHaveCount(0); // default screen restores data, not module
  await page.getByRole("button", { name: "Review decisions" }).click();
  await expect(page.locator(".queue-table tbody tr")).toHaveCount(1);
});
test("people, contract comparison, approved closure, forward look and memo", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "People Ops", exact: true }).click();
  await expect(page.getByText("NOT READY · 10/11")).toBeVisible();
  await page
    .getByLabel("Action / approval evidence")
    .fill("Synthetic interviewer B notes received");
  await page
    .getByRole("button", { name: "Record feedback · Interviewer B" })
    .click();
  await expect(page.getByText("HIR-DECISION / DEMO POLICY V1")).toBeVisible();
  await page
    .getByRole("button", { name: "Taylor Example", exact: true })
    .click();
  await page
    .getByLabel("Action / approval evidence")
    .fill("Security owner approved access DEMO-7");
  await page
    .getByRole("button", { name: /Security access.*Record complete/ })
    .click();
  await expect(page.getByText("READY · 11/11")).toBeVisible();
  await page
    .getByRole("button", { name: "Contracts & Compliance", exact: true })
    .click();
  await expect(
    page.getByText("Clause differs from template", { exact: true }),
  ).toHaveCount(2);
  await expect(
    page
      .getByRole("complementary", { name: "Record inspector" })
      .getByText("Legal owner", { exact: true }),
  ).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Record approved closure" }),
  ).toBeDisabled();
  await page
    .getByLabel("Action / approval evidence")
    .fill("Named legal owner reviewed synthetic exception DEMO-18");
  await page.getByLabel("Named approver").selectOption("Legal owner");
  await page
    .getByLabel("I have explicit human approval and closure evidence.")
    .check();
  await page.getByRole("button", { name: "Record approved closure" }).click();
  await expect(
    page
      .getByRole("complementary", { name: "Record inspector" })
      .getByText("Resolved", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Forward Look/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Forward Look",
  );
  await expect(page.getByText("RTW follow-up · Morgan Sample")).toHaveCount(0);
  await page.getByRole("button", { name: "14 days" }).click();
  await expect(page.getByText("RTW follow-up · Morgan Sample")).toBeVisible();
  await page.getByRole("button", { name: "Weekly Brief", exact: true }).click();
  await expect(page.locator(".brief-decisions")).toContainText(
    "NEED FROM FOUNDERS",
  );
  await expect(page.locator(".brief-decisions")).not.toContainText("Atlas");
  await page.getByRole("button", { name: "Company Ops", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Asset register" }),
  ).toBeVisible();
});
test("desktop visual and responsive keyboard smoke", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.screenshot({
    path: "test-results/backbone-desktop.png",
    fullPage: true,
  });
  for (const area of [
    "Revenue Ops",
    "People Ops",
    "Contracts & Compliance",
    "Company Ops",
    "Weekly Brief",
    "Forward Look",
  ]) {
    await page
      .getByRole("button", { name: new RegExp(`^${area.replace("&", "&")}`) })
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(area);
    await page.screenshot({
      path: `test-results/${area.split(" ")[0].toLowerCase()}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: /Command Desk/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Command Desk",
  );
  await expect(page.locator(".navigation")).toHaveCSS(
    "transform",
    "matrix(1, 0, 0, 1, -235, 0)",
  );
  await page.screenshot({
    path: "test-results/backbone-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => !!document.activeElement?.closest(".navigation")),
  ).toBe(false);
  expect(errors).toEqual([]);
});
