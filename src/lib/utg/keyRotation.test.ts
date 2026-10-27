import { describe, it, expect, beforeEach } from "vitest";
import { markKey, nextActiveKey, resetCursor, statusFromHttp } from "./keyRotation";
import { UtgKey } from "./types";

const mk = (id: string, status: UtgKey["status"] = "active"): UtgKey => ({ id, value: `v-${id}`, status });

describe("keyRotation", () => {
  beforeEach(() => resetCursor("openai"));

  it("round-robins through active keys", () => {
    const keys = [mk("a"), mk("b"), mk("c")];
    const a = nextActiveKey("openai", keys);
    const b = nextActiveKey("openai", keys);
    const c = nextActiveKey("openai", keys);
    const d = nextActiveKey("openai", keys);
    expect([a?.id, b?.id, c?.id, d?.id]).toEqual(["a", "b", "c", "a"]);
  });

  it("skips non-active keys", () => {
    const keys = [mk("a", "invalid"), mk("b"), mk("c", "rate-limited")];
    const x = nextActiveKey("openai", keys);
    const y = nextActiveKey("openai", keys);
    expect(x?.id).toBe("b");
    expect(y?.id).toBe("b");
  });

  it("returns null when no active", () => {
    expect(nextActiveKey("openai", [mk("a", "invalid")])).toBeNull();
  });

  it("records key errors without disabling user keys", () => {
    const keys = [mk("a"), mk("b")];
    const out = markKey(keys, "a", "rate-limited", "429");
    expect(out[0].status).toBe("active");
    expect(out[0].lastError).toBe("429");
    expect(out[1].status).toBe("active");
  });

  it("maps http codes to statuses", () => {
    expect(statusFromHttp(401)).toBe("invalid");
    expect(statusFromHttp(403)).toBe("invalid");
    expect(statusFromHttp(429)).toBe("rate-limited");
    expect(statusFromHttp(500)).toBe("failed");
  });
});
