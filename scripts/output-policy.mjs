/**
 * @cc [label:output-policy] prose-and-status-tokens-unconditional
 * Canonical prose and status tokens are always present, including for empty,
 * partial, or negative input.
 */
/**
 * @cc [label:output-policy] never-image-only
 * The four booleans are the whole result: generated visual views never
 * replace text prose, status tokens, or a mandatory text table.
 */

export function decideOutputPolicy(input = {}) {
  const {
    rows = 0,
    fields = 0,
    artifact,
    tasks = 0,
    dependencies = 0,
    waves = 0,
    statusMix = 0,
    fixLoop = false,
    stateMachine = false,
    components = 0,
    links = 0,
  } = input ?? {};

  return {
    prose: true,
    statusTokens: true,
    table: (rows >= 3 && fields >= 3) || artifact === "closeout-next-moves",
    diagram:
      (tasks >= 4 && (dependencies >= 2 || waves >= 2 || statusMix >= 2)) ||
      fixLoop === true ||
      stateMachine === true ||
      (components >= 3 && links >= 2),
  };
}
