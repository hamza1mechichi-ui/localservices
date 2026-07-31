import { describe, it, expect } from "vitest";
import { CATEGORIES } from "@/lib/utils";

describe("CATEGORIES", () => {
  it("includes common service categories", () => {
    expect(CATEGORIES).toContain("Électricité");
    expect(CATEGORIES).toContain("Plomberie");
    expect(CATEGORIES).toContain("Peinture");
  });

  it("is a non-empty array of strings", () => {
    expect(CATEGORIES.length).toBeGreaterThan(0);
    CATEGORIES.forEach((c) => expect(typeof c).toBe("string"));
  });
});
