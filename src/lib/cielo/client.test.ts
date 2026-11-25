import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server-env", () => ({ serverEnv: {} }));

const { toCieloText } = await import("./client");

describe("toCieloText", () => {
  it("removes accents and non ASCII characters", () => {
    expect(toCieloText("Cafés y Coisinhas")).toBe("Cafes y Coisinhas");
    expect(toCieloText("Açaí Beach 🍇")).toBe("Acai Beach");
  });
});
