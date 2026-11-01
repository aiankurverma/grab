import { describe, expect, it } from "vitest";
import { hashVisitor, getClientIp } from "../tracker";

describe("Analytics Tracker", () => {
  it("generates deterministic visitor hash from IP and user-agent", () => {
    const ip = "192.168.1.10";
    const ua = "Mozilla/5.0";
    const hash1 = hashVisitor(ip, ua);
    const hash2 = hashVisitor(ip, ua);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(32);
  });

  it("extracts client IP from x-forwarded-for header", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
    });
    expect(getClientIp(headers)).toBe("203.0.113.195");
  });

  it("falls back to default IP when headers are empty", () => {
    const headers = new Headers();
    expect(getClientIp(headers)).toBe("127.0.0.1");
  });
});
