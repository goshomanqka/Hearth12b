import { describe, expect, it, vi } from "vitest";
import { seedProperties } from "../shared/properties";
import { filterAndSortProperties } from "./marketplace";

vi.mock("./db", () => ({ getDb: async () => null }));

import { renderPublicPage } from "./publicPages";
const template =
  '<html><head><title>Hearth</title><meta name="description" content="Original" /></head><body><div id="root"></div></body></html>';

describe("connected public marketplace content", () => {
  it("combines sale/rent, location, budget, area and room filters", () => {
    const result = filterAndSortProperties(seedProperties, {
      kind: "sale",
      location: "new york",
      maxPrice: 1500000,
      minSize: 1000,
      beds: 2,
      toursOnly: true,
    });
    expect(result.map(p => p.id)).toEqual([1]);
  });
  it("sorts property prices in both directions", () => {
    const asc = filterAndSortProperties(seedProperties, { sort: "price-asc" });
    const desc = filterAndSortProperties(seedProperties, {
      sort: "price-desc",
    });
    expect(asc[0].id).toBe(3);
    expect(desc[0].id).toBe(2);
  });
  it("provides actual property content and demo tour disclosure before JavaScript", async () => {
    const page = await renderPublicPage(template, "/property/1");
    expect(page.status).toBe(200);
    expect(page.html).toContain("The West Village Residence");
    expect(page.html).toContain("not a measured scan");
    expect(page.html).toContain("<h1>");
  });
  it("returns a real 404 for unavailable properties and unknown pages", async () => {
    expect((await renderPublicPage(template, "/property/999999")).status).toBe(
      404
    );
    expect((await renderPublicPage(template, "/publish/foo")).status).toBe(404);
    expect((await renderPublicPage(template, "/publish/0")).status).toBe(404);
    expect(
      (await renderPublicPage(template, "/a-page-that-does-not-exist")).status
    ).toBe(404);
  });
  it("does not place private user data into account HTML", async () => {
    const page = await renderPublicPage(template, "/account");
    expect(page.status).toBe(200);
    expect(page.html).toContain("noindex, nofollow");
    expect(page.html).toContain("Sign in");
    expect(page.html).not.toContain("Reply email");
  });
});
