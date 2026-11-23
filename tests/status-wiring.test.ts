import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

// Plan 20261123-075 TASK 5 — /status wiring. The prompt is the seam: it
// consumes the TASK 1 policy result and keeps the canonical markdown template
// as the text of record. These tests pin the directives and the pre-wiring
// template invariants without changing prompt parsing or status grammar.

const ROOT = path.resolve(import.meta.dir, "..");
const STATUS = fs.readFileSync(path.join(ROOT, "prompts", "status.md"), "utf8");
const FLAT = STATUS.replace(/\s+/g, " ");

const readInOrder = (fragments: string[]) => {
  let cursor = -1;
  for (const fragment of fragments) {
    const at = STATUS.indexOf(fragment, cursor + 1);
    expect(at, `missing or out of order: ${fragment}`).toBeGreaterThan(cursor);
    cursor = at;
  }
};

describe("/status wiring (plan 20261123-075 TASK 5)", () => {
  test("test_status_keeps_canonical_text", () => {
    readInOrder([
      "## Plan: <goal>",
      "## Progress: X/N tasks done",
      "✅ TASK 1: Scout <area>",
      "### Bottleneck Tags",
      "### Contracts:",
      "### Domain Memory",
      "### Cost Summary",
      "### Duration Summary",
      "### Next up: TASK 3",
      "### Blocked: none / TASK 4 blocked by TASK 3",
    ]);

    expect(FLAT).toContain(
      "Use the policy result from `decideOutputPolicy` as given: this prompt owns no thresholds, chooser logic, or judge call.",
    );
    expect(FLAT).toContain(
      "Prepend a short prose summary (one or two sentences) - plan goal, done/total tasks, and the next action or blocker - before the `## Plan:` header.",
    );
    expect(FLAT).toContain("Tokens decorate the reply only; never write them into `.workflows/plan.md`");
    expect(FLAT).toContain("Prose summary and tokens are always present.");
    expect(FLAT).toContain("Then render the canonical Markdown status report below");
    expect(STATUS.trimEnd().endsWith("$@")).toBe(true);
    expect(STATUS.startsWith("---\ndescription: \"Show current .workflows/plan.md progress")).toBe(true);
  });

  test("test_status_adds_diagram_only_when_policy_allows", () => {
    const steps = [
      "1. Prepend a short prose summary",
      "2. On the line below it",
      "3. Then render the canonical Markdown status report below",
      "4. Only when the policy result has `diagram: true`",
    ];
    const positions = steps.map((step) => FLAT.indexOf(step));
    for (const position of positions) expect(position).toBeGreaterThan(-1);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));

    expect(FLAT).toContain(
      "and a generated artifact with alt text is available, append that image with its alt text after the complete text report.",
    );
    expect(FLAT).toContain("The text report stays complete and readable without it");
    expect(FLAT).toContain("with no diagram positive, emit no image reference at all");
    expect(FLAT).toContain("A diagram is an additive generated view, never a replacement for the text.");
  });

  test("test_status_preserves_marker_grammar", () => {
    // Byte-for-byte pins from the pre-wiring prompts/status.md template.
    for (const line of [
      "✅ TASK 1: Scout <area>",
      "🔄 TASK 3: Build <other> (.workflows/specs/task-other.spec 🔄 IN PROGRESS)",
      "⬜ TASK 4: Verify all",
      "❌ TASK 5: <failed task> (.workflows/specs/task-five.spec ❌)",
      "- 🔴 BLOCKING: <count> tasks — needs strongest model",
      "- 🟡 RISKY: <count> tasks — consider prototype first",
      "- 🟠 VERIFICATION_HEAVY: <count> tasks — budget extra test time",
      "- ⚪ STANDARD: <count> tasks",
      "Header: `## Plan: <goal> · <PlanID> · Status: <status>`, plus an archive line",
      "count ✅ tasks whose Execution Notes",
      "If no .workflows/plan.md exists, say \"No .workflows/plan.md found. Use /idea or",
    ]) {
      expect(STATUS, `canonical line changed: ${line}`).toContain(line);
    }

    const tokens = [...STATUS.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]);
    expect([...new Set(tokens)].sort()).toEqual(
      ["Decision", "Done", "Failed", "Pending", "Unverified"].sort(),
    );
    expect(STATUS).not.toMatch(/\b(?:done|deferred|closed)\s*\(/);
    expect(STATUS).not.toMatch(/\b(?:png|svg|image|diagram)\b[^\n]{0,40}\bwrite\b/i);
    expect(STATUS).not.toMatch(/\bwrite\b[^\n]{0,40}\b(?:png|svg|image|diagram)\b/i);
  });
});
