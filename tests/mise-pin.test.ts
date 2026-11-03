import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

describe("mise self-pin", () => {
  test("mise.toml exists at repo root", () => {
    expect(existsSync(join(ROOT, "mise.toml"))).toBe(true);
  });

  test("mise.toml pins bun 1.3.11 and node 25.8.0 in [tools]", () => {
    const raw = readFileSync(join(ROOT, "mise.toml"), "utf8");
    expect(raw).toMatch(/\[tools\]/);
    expect(raw).toMatch(/bun\s*=\s*"1\.3\.11"/);
    expect(raw).toMatch(/node\s*=\s*"25\.8\.0"/);
  });
});
