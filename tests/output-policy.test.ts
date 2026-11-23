import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { decideOutputPolicy } from "../scripts/output-policy.mjs";

const ROOT = path.resolve(import.meta.dir, "..");
const MODULE = path.join(ROOT, "scripts", "output-policy.mjs");
const KEYS = ["prose", "statusTokens", "table", "diagram"];
const snapshot = (value: object) => JSON.parse(JSON.stringify(value));

describe("output policy (plan 20261123-075)", () => {
  test("test_output_policy_always_prose", () => {
    const inputs = [
      {},
      { rows: 1, fields: 1, tasks: 1 },
      { rows: 0, fields: 0, tasks: 0, dependencies: 0, waves: 0, statusMix: 0, components: 0, links: 0 },
    ];
    for (const input of inputs) {
      const before = snapshot(input);
      const result = decideOutputPolicy(input);
      expect(result.prose).toBe(true);
      expect(result.statusTokens).toBe(true);
      expect(Object.keys(result).sort()).toEqual([...KEYS].sort());
      expect(decideOutputPolicy(input)).toEqual(result);
      expect(input).toEqual(before);
    }
  });

  test("test_output_policy_table_threshold", () => {
    const belowRows = decideOutputPolicy({ rows: 2, fields: 3 });
    const belowFields = decideOutputPolicy({ rows: 3, fields: 2 });
    const atThreshold = decideOutputPolicy({ rows: 3, fields: 3 });
    expect(belowRows.table).toBe(false);
    expect(belowFields.table).toBe(false);
    expect(atThreshold.table).toBe(true);
    expect(decideOutputPolicy({ rows: 3, fields: 3, tasks: 1 }).diagram).toBe(false);
    for (const result of [belowRows, belowFields, atThreshold]) {
      expect(result.prose).toBe(true);
      expect(result.statusTokens).toBe(true);
    }
  });

  test("test_output_policy_mandatory_table", () => {
    const result = decideOutputPolicy({ artifact: "closeout-next-moves", rows: 0, fields: 0 });
    expect(result.table).toBe(true);
    expect(result.prose).toBe(true);
    expect(result.statusTokens).toBe(true);
    expect(result.diagram).toBe(false);
    expect(Object.keys(result).sort()).toEqual([...KEYS].sort());
  });

  test("test_output_policy_diagram_triggers", () => {
    const withoutDiagram = [
      { tasks: 4 },
      { tasks: 3, dependencies: 2, waves: 2 },
      { components: 3, links: 1 },
    ];
    const withDiagram = [
      { tasks: 4, dependencies: 2 },
      { tasks: 4, waves: 2 },
      { tasks: 4, statusMix: 2 },
      { fixLoop: true },
      { stateMachine: true },
      { components: 3, links: 2 },
    ];
    for (const input of withoutDiagram) expect(decideOutputPolicy(input).diagram).toBe(false);
    for (const input of withDiagram) expect(decideOutputPolicy(input).diagram).toBe(true);
    const all = [...withoutDiagram, ...withDiagram].map((input) => decideOutputPolicy(input));
    for (const result of all) {
      expect(result.prose).toBe(true);
      expect(result.statusTokens).toBe(true);
    }
    const both = decideOutputPolicy({ rows: 3, fields: 3, tasks: 4, dependencies: 2, components: 3, links: 2 });
    expect(both.table).toBe(true);
    expect(both.diagram).toBe(true);
  });

  test("test_output_policy_never_image_only", () => {
    const input = {
      imageOnly: true,
      tasks: 4,
      dependencies: 2,
      rows: 3,
      fields: 3,
      artifact: "closeout-next-moves",
    };
    const result = decideOutputPolicy(input);
    expect(result.prose).toBe(true);
    expect(result.statusTokens).toBe(true);
    expect(result.table).toBe(true);
    expect(result.diagram).toBe(true);
    expect(Object.keys(result).sort()).toEqual([...KEYS].sort());
    for (const value of Object.values(result)) expect(typeof value).toBe("boolean");

    const frozen = Object.freeze({ ...input });
    expect(decideOutputPolicy(frozen)).toEqual(result);
    expect(frozen).toEqual(input);

    const source = fs.readFileSync(MODULE, "utf8");
    expect(source).not.toMatch(/\b(from\s+["']node:fs["']|require\(["']fs|fetch\s*\(|node:http|\bjudge\b|ask\s*\(|TypeLLM)/);
  });
});
