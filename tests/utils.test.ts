import { describe, expect, it } from "vitest";
import {
  fetchRemoteContent,
  parseIntegrity,
  sha256Hex,
} from "../src/commands/utils.js";

describe("command utils", () => {
  it("parses supported integrity formats", () => {
    expect(parseIntegrity("sha256-ABC123")).toBe("abc123");
    expect(parseIntegrity("sha256:ABC123")).toBe("abc123");
    expect(parseIntegrity("bad")).toBeNull();
  });

  it("computes sha256 hex", () => {
    expect(sha256Hex(Buffer.from("hello"))).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("fetches remote content with injected fetch", async () => {
    const fetcher: typeof fetch = async (input, init) => {
      expect(String(input)).toBe("https://example.com/SKILL.md");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer token");
      return new Response("hello", {
        status: 200,
        headers: { "content-type": "text/markdown" },
      });
    };

    const result = await fetchRemoteContent("https://example.com/SKILL.md", "token", fetcher);

    expect(result.status).toBe(200);
    expect(result.data.toString("utf8")).toBe("hello");
    expect(result.headers["content-type"]).toContain("text/markdown");
  });
});
