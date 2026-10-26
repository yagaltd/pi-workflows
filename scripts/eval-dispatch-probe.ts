// eval-dispatch-probe — run the REAL resolveNext against a golden case fixture.
// Input (argv[2]): JSON { plan, registry, missingSpecs?, reviewFiles?, repo? }
// Output: exactly one JSON line — { ok:true, id, wave } | { ok:false, blocked, reason }
// The probe imports the shipped dispatcher; it never re-implements selection.
import { resolveNext } from "../extensions/index.ts";

const caseFile = process.argv[2];
if (!caseFile) {
  console.error("usage: bun scripts/eval-dispatch-probe.ts <case.json>");
  process.exit(2);
}
const c = JSON.parse(await Bun.file(caseFile).text());
const f = c.input ?? c; // golden cases nest the fixture under "input"
const missing = new Set<string>(f.missingSpecs ?? []);
const result = resolveNext({
  plan: f.plan,
  registry: f.registry ?? {},
  reviewFiles: (f.reviewFiles ?? []).map((r: { name: string; content: string }) => ({ name: r.name, content: r.content })),
  readSpec: (p: string) => (Array.from(missing).some((id) => p.endsWith(`${id}.spec`)) ? null : "# spec body"),
  repo: f.repo ?? "/repo",
});
if (result.ok) {
  console.log(JSON.stringify({ ok: true, id: result.task.id, wave: result.task.wave }));
} else {
  console.log(JSON.stringify({ ok: false, blocked: result.blocked, reason: result.reason }));
}
