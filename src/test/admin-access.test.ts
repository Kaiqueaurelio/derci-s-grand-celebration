import { describe, expect, it } from "vitest";
import { canClaimInitialAdmin } from "@/lib/admin-access";

describe("canClaimInitialAdmin", () => {
  it("only allows the explicitly configured email", () => {
    expect(canClaimInitialAdmin("owner@example.com", "owner@example.com")).toBe(true);
    expect(canClaimInitialAdmin("other@example.com", "owner@example.com")).toBe(false);
  });

  it("compares emails without surrounding spaces or case differences", () => {
    expect(canClaimInitialAdmin(" Owner@Example.com ", "owner@example.com ")).toBe(true);
  });

  it("fails closed when no initial admin email is configured", () => {
    expect(canClaimInitialAdmin("owner@example.com", undefined)).toBe(false);
    expect(canClaimInitialAdmin(undefined, "owner@example.com")).toBe(false);
    expect(canClaimInitialAdmin("", " ")).toBe(false);
  });
});
