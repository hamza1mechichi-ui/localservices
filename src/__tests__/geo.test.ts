import { describe, it, expect } from "vitest";
import { haversineKm, bboxAround } from "@/lib/geo";

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    expect(haversineKm(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0);
  });

  it("calculates Paris–Lyon distance (~390km)", () => {
    const dist = haversineKm(48.8566, 2.3522, 45.7640, 4.8357);
    expect(dist).toBeGreaterThan(380);
    expect(dist).toBeLessThan(400);
  });

  it("calculates Paris–Marseille (~660km)", () => {
    const dist = haversineKm(48.8566, 2.3522, 43.2965, 5.3698);
    expect(dist).toBeGreaterThan(650);
    expect(dist).toBeLessThan(670);
  });

  it("is commutative", () => {
    const a = haversineKm(40.7128, -74.0060, 51.5074, -0.1278);
    const b = haversineKm(51.5074, -0.1278, 40.7128, -74.0060);
    expect(a).toBeCloseTo(b, 4);
  });
});

describe("bboxAround", () => {
  it("creates a bounding box with correct proportions", () => {
    const bbox = bboxAround(48.8566, 2.3522, 100);
    expect(bbox.minLat).toBeLessThan(48.8566);
    expect(bbox.maxLat).toBeGreaterThan(48.8566);
    expect(bbox.minLng).toBeLessThan(2.3522);
    expect(bbox.maxLng).toBeGreaterThan(2.3522);
    expect(bbox.maxLat - bbox.minLat).toBeCloseTo(100 / 111.32 * 2, 1);
  });

  it("returns 0 width for 0 radius", () => {
    const bbox = bboxAround(48.8566, 2.3522, 0);
    expect(bbox.minLat).toBeCloseTo(bbox.maxLat, 10);
    expect(bbox.minLng).toBeCloseTo(bbox.maxLng, 10);
  });
});
