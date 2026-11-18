import { describe, expect, test } from "bun:test";
import {
  CLAIM_VERDICTS,
  TRIAGE_CONFIDENCE_FLOOR,
  verifyClaims,
  type JudgeBackend,
  type ReportClaim,
  type SessionTurn,
} from "../extensions/index.ts";

/* ── plan 077 Task 2: worker-report normalization + CLAIM VERIFICATION ──
 * Worker reports are for the orchestrator, not the owner. verifyClaims
 * extracts nothing and VERIFIES everything: each report claim is checked
 * against the worker's SESSION TURNS (the transcript is the ground truth).
 * Verdict per claim: TRUE / FALSE / UNVERIFIABLE. A wrong or missing turn
 * pointer is FALSE — pointer accuracy is part of the claim. Output: the
 * compact verified digest {verified, bounced} — verified rows pass to the
 * orchestrator; bounced rows route to the worker (FALSE: fix the report) or
 * the reviewer (UNVERIFIABLE: re-review the work). Claims ride ONE batched
 * call (the Phase-3 batching pattern). Loud-skip everywhere: a backend skip
 * bounces ALL claims loudly — never a silent pass. */

const TURNS: SessionTurn[] = [
  { role: "assistant", text: "Ran bun test — 40 pass, 0 fail." },
  { role: "assistant", text: "Edited extensions/index.ts to add the seam." },
  { role: "assistant", text: "Never touched README.md." },
  { role: "assistant", text: "The drift gate exits 0 on the final state." },
  { role: "assistant", text: "Explored a Jev transport variant; dropped it." },
];

function transcriptBackend(
  answer: (claims: ReportClaim[]) => Record<string, unknown>[] | { skip: string }
): { backend: JudgeBackend; calls: { schema: object; input: string }[] } {
  const calls: { schema: object; input: string }[] = [];
  return {
    backend: {
      name: "transcript-fake",
      async classify(schema, input) {
        calls.push({ schema, input });
        const ids = [...input.matchAll(/Claim ([A-Za-z0-9_-]+) \[type/g)].map((m) => m[1]);
        const claims = ids.map((id, i) => ({ claim: `claim ${id}`, type: "x", sessionTurn: 0, __i: i })) as any[];
        const out = answer(claims);
        if ("skip" in out) return { skipped: true, bucket: null, confidence: 0, reason: out.skip };
        return { skipped: false, bucket: null, value: { claimVerdicts: out }, confidence: 0.9 };
      },
    },
    calls,
  };
}

const rows = (verdicts: Record<string, { verdict?: string | null; confidence?: number; evidence?: string }>) =>
  Object.entries(verdicts).map(([id, o]) => ({
    id,
    verdict: "verdict" in o ? o.verdict : "TRUE",
    confidence: o.confidence ?? 0.9,
    ...(o.evidence !== undefined ? { evidence: o.evidence } : {}),
  }));

describe("verifyClaims — pointer discipline (plan 077 T2)", () => {
  test("a WRONG turn pointer is FALSE — pointer accuracy is part of the claim", async () => {
    const { backend, calls } = transcriptBackend(() => rows({}));
    const claims: ReportClaim[] = [
      { claim: "Tests pass 40/0.", type: "test-result", sessionTurn: 99 },
      { claim: "Edited the seam.", type: "file-change", sessionTurn: -1 },
      { claim: "Untouched README.", type: "scope", sessionTurn: 1.5 },
    ];
    const r = await verifyClaims(backend, claims, TURNS);
    expect(r.verified).toHaveLength(0);
    expect(r.bounced).toHaveLength(3);
    for (const b of r.bounced) {
      expect(b.verdict).toBe("FALSE");
      expect(b.route).toBe("worker");
      expect(b.reason).toContain("pointer");
    }
    // the deterministic pre-check bounces them WITHOUT burning a judge call
    expect(calls).toHaveLength(0);
    expect(r.skippedAll).toBe(false);
  });

  test("a MISSING turn pointer is FALSE", async () => {
    const { backend } = transcriptBackend(() => rows({}));
    const claims: ReportClaim[] = [{ claim: "Tests pass.", type: "test-result" } as ReportClaim];
    const r = await verifyClaims(backend, claims, TURNS);
    expect(r.bounced).toHaveLength(1);
    expect(r.bounced[0].verdict).toBe("FALSE");
    expect(r.bounced[0].reason).toContain("pointer");
  });
});

describe("verifyClaims — the batched judge pass (plan 077 T2)", () => {
  test("valid claims ride ONE call; TRUE rows form the verified digest", async () => {
    const { backend, calls } = transcriptBackend(() =>
      rows({
        C1: { evidence: "turn 1 says the seam was added" },
        C2: { evidence: "turn 3 says drift exits 0" },
      })
    );
    const claims: ReportClaim[] = [
      { claim: "The seam was added to extensions/index.ts.", type: "file-change", sessionTurn: 1 },
      { claim: "The drift gate exits 0.", type: "gate", sessionTurn: 3 },
    ];
    const r = await verifyClaims(backend, claims, TURNS);
    expect(calls).toHaveLength(1);
    expect(r.verified).toHaveLength(2);
    expect(r.verified[0]).toMatchObject({
      claim: "The seam was added to extensions/index.ts.",
      sessionTurn: 1,
      evidence: "turn 1 says the seam was added",
    });
    expect(r.bounced).toHaveLength(0);
    expect(r.skippedAll).toBe(false);
    // the transcript rides the call, entry-index addressed
    expect(calls[0].input).toContain("[turn 0]");
    expect(calls[0].input).toContain("bun test — 40 pass");
    expect(calls[0].input).toContain("Claim C1 [type file-change]");
    expect(calls[0].input).toContain("sessionTurn 1");
  });

  test("the claim-verdict question is a native array with the TRUE/FALSE/UNVERIFIABLE enum", async () => {
    const { backend, calls } = transcriptBackend(() =>
      rows({ C1: {} })
    );
    const claims: ReportClaim[] = [{ claim: "c", type: "t", sessionTurn: 0 }];
    await verifyClaims(backend, claims, TURNS);
    const schema: any = calls[0].schema;
    const q = schema.properties.claimVerdicts;
    expect(q.type).toBe("array");
    expect(q.items.properties.verdict.enum).toEqual(CLAIM_VERDICTS);
    expect(CLAIM_VERDICTS).toEqual(["TRUE", "FALSE", "UNVERIFIABLE"]);
    expect(q.items.properties.verdict.type).toContain("null");
  });

  test("a FALSE verdict bounces to the WORKER (fix the report)", async () => {
    const { backend } = transcriptBackend(() => rows({ C1: { verdict: "FALSE", evidence: "turn 0 says 40 pass" } }));
    const claims: ReportClaim[] = [{ claim: "Tests pass 41/0.", type: "test-result", sessionTurn: 0 }];
    const r = await verifyClaims(backend, claims, TURNS);
    expect(r.verified).toHaveLength(0);
    expect(r.bounced[0].verdict).toBe("FALSE");
    expect(r.bounced[0].route).toBe("worker");
  });

  test("an UNVERIFIABLE verdict bounces to the REVIEWER (re-review the work)", async () => {
    const { backend } = transcriptBackend(() => rows({ C1: { verdict: "UNVERIFIABLE" } }));
    const claims: ReportClaim[] = [{ claim: "The design is good.", type: "opinion", sessionTurn: 4 }];
    const r = await verifyClaims(backend, claims, TURNS);
    expect(r.bounced[0].verdict).toBe("UNVERIFIABLE");
    expect(r.bounced[0].route).toBe("reviewer");
  });

  test("below-floor confidence → UNVERIFIABLE bounce (confidence-gated)", async () => {
    const { backend } = transcriptBackend(() => rows({ C1: { confidence: TRIAGE_CONFIDENCE_FLOOR - 0.1 } }));
    const claims: ReportClaim[] = [{ claim: "c", type: "t", sessionTurn: 2 }];
    const r = await verifyClaims(backend, claims, TURNS);
    expect(r.bounced[0].verdict).toBe("UNVERIFIABLE");
    expect(r.bounced[0].reason).toContain("floor");
  });

  test("a native null abstention → UNVERIFIABLE bounce, never a guess", async () => {
    const { backend } = transcriptBackend(() => rows({ C1: { verdict: null } }));
    const claims: ReportClaim[] = [{ claim: "c", type: "t", sessionTurn: 2 }];
    const r = await verifyClaims(backend, claims, TURNS);
    expect(r.bounced[0].verdict).toBe("UNVERIFIABLE");
    expect(r.bounced[0].reason).toContain("abstention");
  });

  test("a missing row → THAT claim loud-skips to UNVERIFIABLE, others proceed", async () => {
    const { backend } = transcriptBackend(() => rows({ C1: {} }));
    const claims: ReportClaim[] = [
      { claim: "c1", type: "t", sessionTurn: 0 },
      { claim: "c2", type: "t", sessionTurn: 1 },
    ];
    const r = await verifyClaims(backend, claims, TURNS);
    expect(r.verified).toHaveLength(1);
    expect(r.bounced[0].claim).toBe("c2");
    expect(r.bounced[0].reason).toContain("C2");
  });
});

describe("verifyClaims — loud-skip doctrine (plan 077 T2)", () => {
  test("a backend skip bounces ALL claims loudly — never a silent pass", async () => {
    const { backend } = transcriptBackend(() => ({ skip: "missing TYPELLM_API_KEY" }));
    const claims: ReportClaim[] = [
      { claim: "c1", type: "t", sessionTurn: 0 },
      { claim: "c2", type: "t", sessionTurn: 1 },
    ];
    const r = await verifyClaims(backend, claims, TURNS);
    expect(r.skippedAll).toBe(true);
    expect(r.reason).toContain("TYPELLM_API_KEY");
    expect(r.verified).toHaveLength(0);
    expect(r.bounced).toHaveLength(2);
    for (const b of r.bounced) {
      expect(b.verdict).toBe("UNVERIFIABLE");
      expect(b.reason).toContain("JUDGE SKIPPED");
    }
  });

  test("no claims → empty digest, no call", async () => {
    const { backend, calls } = transcriptBackend(() => rows({}));
    const r = await verifyClaims(backend, [], TURNS);
    expect(r.verified).toHaveLength(0);
    expect(r.bounced).toHaveLength(0);
    expect(calls).toHaveLength(0);
  });
});
