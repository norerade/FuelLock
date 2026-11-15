import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { devices, webkit } from "playwright-core";

const base = process.env.FUELLOCK_TEST_URL || "http://127.0.0.1:3040";
let browser;
before(async () => {
  browser = await webkit.launch();
});
after(async () => {
  await browser?.close();
});

for (const example of [
  { name: "first pump price", price: "3.349", net: "$0.00", nextNet: "$8.00" },
  {
    name: "multiple early edits",
    cap: "3.199",
    gallons: "40",
    fees: "2.00",
    family: true,
    price: "3.399",
    net: "-$0.99",
    nextNet: "$1.01",
  },
]) {
  test(
    "recalculates before the chart loads: " + example.name,
    async () => {
      const context = await browser.newContext({
        ...devices["iPhone 13"],
        locale: "en-US",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const hydration = Promise.withResolvers();
      const chart = Promise.withResolvers();
      let initialScripts;
      let delayedChunks = 0;
      try {
        await page.route(
          /\/_next\/static\/chunks\/.*\.js(?:\?|$)/,
          async (route) => {
            await hydration.promise;
            if (!initialScripts.has(route.request().url())) {
              delayedChunks++;
              await chart.promise;
            }
            await route.continue();
          },
        );
        await page.goto(base, { waitUntil: "commit" });
        const calculator = page.locator(".landing-calculator");
        const price = calculator.getByLabel("Hypothetical pump price ($/gal)");
        const result = calculator.locator(".fact").filter({
          has: page.getByText("Agreement net result", { exact: true }),
        });
        await result.getByText("-$4.00", { exact: true }).waitFor();
        initialScripts = new Set(
          await page
            .locator("script[src]")
            .evaluateAll((scripts) => scripts.map((script) => script.src)),
        );
        assert.ok(initialScripts.size > 0);
        if (example.cap) {
          await calculator.getByLabel("Price cap ($/gal)").fill(example.cap);
          await calculator
            .getByLabel("Agreement gallons")
            .fill(example.gallons);
          await calculator
            .getByLabel("Total agreement fees ($)")
            .fill(example.fees);
        }
        if (example.family) await calculator.getByRole("checkbox").check();
        await price.fill(example.price);
        hydration.resolve();

        await result.getByText(example.net, { exact: true }).waitFor();
        assert.equal(await price.inputValue(), example.price);
        await price.fill("3.449");
        await result.getByText(example.nextNet, { exact: true }).waitFor();
        assert.ok(
          delayedChunks > 0,
          "The graph bundle should still be in flight",
        );
        const curve = calculator.locator(".recharts-line-curve");
        assert.equal(await curve.count(), 0);

        chart.resolve();
        await curve.waitFor();
        assert.equal(await price.inputValue(), "3.449");
        await result.getByText(example.nextNet, { exact: true }).waitFor();
        assert.deepEqual(errors, []);
      } finally {
        initialScripts ??= new Set();
        hydration.resolve();
        chart.resolve();
        await context.close();
      }
    },
  );
}
