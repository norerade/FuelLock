import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
const base = process.env.FUELLOCK_TEST_URL || "http://127.0.0.1:3040";
const executable =
  process.env.BROWSER_EXECUTABLE ||
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
  ].find(existsSync);
if (!executable)
  throw Error("Set BROWSER_EXECUTABLE to your installed Chromium browser.");
const browser = await chromium.launch({
  executablePath: executable,
  headless: true,
});
async function receiptImage(context, title) {
  const page = await context.newPage();
  await page.setContent(
    '<article style="background:white;font:18px monospace;padding:30px;width:330px"><h1>FuelLock demo</h1><p>' +
      title +
      "</p><p>Pineway Fuel</p><p>Regular 87 gasoline</p></article>",
  );
  const bytes = await page.locator("article").screenshot();
  await page.close();
  return bytes;
}
const shots = process.env.FUELLOCK_SCREENSHOTS;
if (shots) mkdirSync(shots, { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 960 },
    });
    const tab = await context.newPage();
    const clientErrors = [];
    tab.on("pageerror", (e) => clientErrors.push(e.message));
    tab.on("response", async (r) => {
      if (r.url().includes("/api/") && r.status() >= 400)
        console.error(r.status(), await r.text());
    });
    tab.setDefaultTimeout(25000);
    await tab.goto(base);
    await tab.getByRole("heading", { name: "Fuel overview" }).waitFor();
    await tab.evaluate(() => document.fonts.ready);
    await tab.locator(".recharts-area-curve").first().waitFor();
    assert.ok(
      await tab.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Overview overflows",
    );
    if (shots)
      await tab.screenshot({
        path: join(shots, "overview-" + width + ".png"),
        fullPage: true,
      });
    async function nav(label) {
      if (width < 821)
        await tab.getByRole("button", { name: "Open navigation" }).click();
      await tab
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: label, exact: true })
        .click();
    }
    await tab.getByRole("button", { name: "View contract" }).click();
    const contractCode = await tab.locator(".contract-code strong").innerText();
    await tab.getByRole("button", { name: "Close dialog" }).click();
    await nav("Fuel protection");
    await tab.getByRole("button", { name: "Offer catalog" }).click();
    const card = tab.locator("article").filter({
      has: tab.getByRole("heading", { name: "Diesel Family Lock" }),
    });
    await card.getByRole("button", { name: "Offer details" }).click();
    await tab.getByRole("button", { name: "Request protection" }).click();
    await tab
      .getByRole("dialog")
      .getByText("requested", { exact: true })
      .waitFor();
    await tab.getByRole("button", { name: "Close dialog" }).click();
    await nav("Partner console");
    await tab.getByRole("button", { name: "Activate contract" }).click();
    await tab.getByText("No requests awaiting activation.").waitFor();
    await nav("Drivers & vehicles");
    await tab.getByRole("button", { name: "Invite driver" }).click();
    await tab.getByRole("button", { name: "Create invitation" }).click();
    await tab.getByRole("textbox", { name: "Invitation link" }).waitFor();
    const link = await tab
      .getByRole("textbox", { name: "Invitation link" })
      .inputValue();
    const second = await browser.newContext({
      viewport: { width, height: 844 },
    });
    const observer = await second.newPage();
    await observer.goto(link);
    await observer.getByRole("button", { name: "Accept invitation" }).click();
    await observer.getByRole("heading", { name: "Fuel overview" }).waitFor();
    if (width < 821)
      await observer.getByRole("button", { name: "Open navigation" }).click();
    assert.match(
      await observer.locator(".profile").innerText(),
      /Jamie Morgan/,
    );
    if (width < 821)
      await observer
        .locator("aside")
        .getByRole("button", { name: "Close navigation" })
        .click();
    const balance = observer
      .locator(".metric")
      .filter({ hasText: "Protected gallons" })
      .locator(":scope > strong");
    const before = await balance.innerText();
    const closeInvitation = tab.getByRole("button", { name: "Close dialog" });
    if (await closeInvitation.isVisible()) await closeInvitation.click();
    await nav("Partner console");
    await tab.getByLabel("Contract code").fill(contractCode);
    await tab.getByLabel("Fuel type").selectOption("Gasoline");
    await tab
      .locator('select[name="station"]')
      .selectOption({ label: "Pineway Fuel" });
    await tab.getByLabel("Gallons", { exact: true }).fill("40");
    await tab.getByLabel("Pump price ($/gal)").fill("4.199");
    await tab.getByRole("button", { name: "Preview fill-up" }).click();
    await tab.getByRole("heading", { name: "Purchase preview" }).waitFor();
    assert.match(await tab.locator(".quote-box").innerText(), /33.8 gal/);
    assert.match(await tab.locator(".quote-box").innerText(), /6.2 gal/);
    await tab.getByRole("button", { name: "Confirm fill-up" }).click();
    await tab
      .getByText("Fill-up recorded. The household balance is updated.")
      .waitFor();
    await observer.waitForFunction(
      () =>
        document.querySelectorAll(".metric>strong")[1]?.textContent === "0gal",
      {},
      { timeout: 10000 },
    );
    await nav("Fill-up activity");
    await tab.locator(".activity-row").first().click();
    await tab.getByText("Attach a receipt", { exact: true }).click();
    await tab.locator('input[type="file"]').setInputFiles({
      name: "station.png",
      mimeType: "image/png",
      buffer: await receiptImage(context, "Partner fill-up"),
    });
    await tab.getByRole("button", { name: "Attach receipt" }).click();
    await tab.getByRole("link", { name: "station.png" }).waitFor();
    const response = await context.request.get(
      await tab
        .getByRole("link", { name: "station.png" })
        .getAttribute("href")
        .then((url) => new URL(url, base).href),
    );
    assert.equal(response.status(), 200);
    await tab.getByText("Cancel this fill-up", { exact: true }).click();
    await tab.getByRole("button", { name: "Confirm cancellation" }).click();
    await tab
      .getByRole("dialog")
      .getByText("cancelled", { exact: true })
      .waitFor();
    await observer.waitForFunction(
      (val) =>
        document.querySelectorAll(".metric>strong")[1]?.innerText === val,
      before,
      { timeout: 10000 },
    );
    await tab.getByRole("button", { name: "Close dialog" }).click();
    await nav("Family wallet");
    await tab
      .getByRole("button", { name: "Confirm", exact: true })
      .first()
      .click();
    await tab.getByRole("button", { name: "Pay reward" }).first().click();
    assert.ok(
      await tab.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Wallet overflows",
    );
    await nav("Trips & stations");
    await tab.getByRole("heading", { name: "Plan a fuel stop" }).waitFor();
    await tab
      .getByLabel("Vehicle", { exact: true })
      .selectOption({ label: "Subaru Outback · 28 MPG" });
    await tab.getByLabel("Route", { exact: true }).selectOption("school");
    assert.match(
      await tab.locator(".station-card").first().innerText(),
      /Northline Station/,
    );
    await nav("Savings goals");
    await tab.getByRole("button", { name: "New goal" }).click();
    await tab.getByLabel("Goal name").fill("Winter tires");
    await tab.getByLabel("Target ($)").fill("600");
    await tab.getByRole("button", { name: "Create goal" }).click();
    await tab.getByText("Savings goal created.").waitFor();
    await tab.getByRole("button", { name: "Close dialog" }).click();
    await tab
      .getByLabel("Send round-ups to")
      .selectOption({ label: "Winter tires" });
    await tab.getByRole("button", { name: "Save rules" }).click();
    await tab.getByText("Savings rules saved.").waitFor();
    await nav("Fuel protection");
    await tab.getByRole("button", { name: "Offer catalog" }).click();
    await tab
      .locator("article")
      .filter({ has: tab.getByRole("heading", { name: "Pineway Pre-buy" }) })
      .getByRole("button", { name: "Offer details" })
      .click();
    await tab.getByRole("button", { name: "Request pre-buy" }).click();
    await tab
      .getByRole("dialog")
      .getByText("requested", { exact: true })
      .waitFor();
    await tab.getByRole("button", { name: "Close dialog" }).click();
    await nav("Partner console");
    await tab.getByRole("button", { name: "Activate contract" }).click();
    await tab.getByText("No requests awaiting activation.").waitFor();
    await nav("Fuel protection");
    await tab
      .locator("article")
      .filter({ has: tab.getByRole("heading", { name: "Pineway Pre-buy" }) })
      .getByRole("button", { name: "Contract details" })
      .click();
    const prepaid = await tab.locator(".contract-code strong").innerText();
    await tab.getByRole("button", { name: "Close dialog" }).click();
    await nav("Partner console");
    await tab.getByLabel("Contract code").fill(prepaid);
    await tab.getByLabel("Fuel type").selectOption("Gasoline");
    await tab
      .locator('select[name="station"]')
      .selectOption({ label: "Pineway Fuel" });
    await tab.getByLabel("Gallons", { exact: true }).fill("5");
    await tab.getByLabel("Pump price ($/gal)").fill("4.099");
    await tab.getByRole("button", { name: "Preview fill-up" }).click();
    await tab.getByText("Prepaid gallons").waitFor();
    assert.match(
      await tab.locator(".quote-box").innerText(),
      /Due at pump\s*\$0\.00/,
    );
    await tab.getByRole("button", { name: "Confirm fill-up" }).click();
    await tab
      .getByText("Fill-up recorded. The household balance is updated.")
      .waitFor();
    await nav("Fill-up activity");
    await tab.getByRole("button", { name: "Add fill-up" }).click();
    await tab
      .getByLabel("Station", { exact: true })
      .selectOption({ label: "Pineway Fuel" });
    await tab.getByLabel("Gallons", { exact: true }).fill("12.125");
    await tab.getByLabel("Pump price ($/gal)").fill("4.249");
    await tab.locator('input[type="file"]').setInputFiles({
      name: "self-paid.png",
      mimeType: "image/png",
      buffer: await receiptImage(context, "Self-paid fill-up"),
    });
    await tab.getByRole("button", { name: "Save fill-up" }).click();
    await tab.getByText("Receipt linked to the fill-up.").waitFor();
    await tab.getByRole("button", { name: "Close dialog" }).click();
    await nav("Fuel protection");
    await tab.getByRole("button", { name: "Receipt protection" }).click();
    await tab.getByRole("button", { name: "Submit claim" }).click();
    await tab
      .locator(".claim-row")
      .getByText("pending", { exact: true })
      .waitFor();
    await nav("Partner console");
    await tab.getByRole("button", { name: "Approve claim" }).click();
    await tab.getByRole("button", { name: "Pay claim" }).click();
    await tab.getByText("No receipt claims awaiting a decision.").waitFor();
    await nav("Reports");
    await tab.getByRole("heading", { name: "Monthly report" }).waitFor();
    await tab.getByLabel("Hypothetical pump price ($/gal)").fill("2.599");
    assert.match(
      await tab.locator(".facts").innerText(),
      /Gross protection benefit\s*\$0\.00/,
    );
    await nav("Settings");
    await tab.getByLabel("Household name").fill("Family test drive");
    await tab.getByRole("button", { name: "Save changes" }).click();
    await tab.getByText("Household settings saved.").waitFor();
    if (width < 821)
      await tab.getByRole("button", { name: "Open navigation" }).click();
    await tab
      .locator(".household-block")
      .getByText("Family test drive")
      .waitFor();
    assert.deepEqual(clientErrors, []);
    await second.close();
    await context.close();
    console.log(
      width +
        "px: invitation, partial redemption, live balance, reversal, receipts, wallet, pre-buy, claims, routes, goals, reports and settings passed.",
    );
  }
} finally {
  await browser.close();
}
