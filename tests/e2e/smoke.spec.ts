import { test, expect } from "@playwright/test";

test("health endpoint should respond", async ({ request, baseURL }) => {
  const target = baseURL || "https://example.com";
  const response = await request.get(target);
  expect(response.status()).toBeLessThan(500);
});
