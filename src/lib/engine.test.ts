import { describe, expect, it } from "vitest";
import { convert, decompose, conversionFactor, UNKNOWN_CONVERSION } from "./units";
import { computeCosts, profitability } from "./costing";

const conv = [
  { from_unit: "gallon", to_unit: "oz", factor: 128 },
  { from_unit: "demi-gallon", to_unit: "oz", factor: 64 },
  { from_unit: "bidon", to_unit: "oz", factor: 20 },
];

describe("unités", () => {
  it("1 gallon = 2 demi-gallons", () => {
    expect(convert(1, "gallon", "demi-gallon", conv)).toBe(2);
  });
  it("1 gallon = 6 bidons + 8 oz", () => {
    expect(decompose(128, "oz", "bidon", conv)).toEqual({ count: 6, remainder: 8 });
  });
  it("62 bidons + 3 gallons en oz", () => {
    expect(convert(62, "bidon", "oz", conv) + convert(3, "gallon", "oz", conv)).toBe(1624);
  });
  it("ne devine pas", () => {
    expect(conversionFactor("kg", "oz", conv)).toBeNull();
    expect(() => convert(1, "kg", "oz", conv)).toThrow(UNKNOWN_CONVERSION);
  });
});

describe("marge", () => {
  it("120 → 200", () => {
    const p = profitability(120, 200);
    expect(p.profit).toBe(80);
    expect(p.marginPct).toBe(40);
    expect(p.markupPct!.toFixed(2)).toBe("66.67");
  });
  it("coût unitaire inclut les frais", () => {
    const c = computeCosts(1000, 10, { transport: 200 });
    expect(c.unitCost).toBe(120);
    expect(computeCosts(100, 0, {}).unitCost).toBeNull();
  });
});
