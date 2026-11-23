#!/usr/bin/env node
// output-policy-cli — the I/O shell around the pure output-policy module
// (plan 20261123-075 TASK 8). Explicit flags become policy inputs; the JSON
// decision is printed even with no input. The pure module stays I/O-free.
//
// Usage:
//   node scripts/output-policy-cli.mjs [--rows N] [--fields N] [--artifact NAME]
//     [--tasks N] [--dependencies N] [--waves N] [--status-mix N]
//     [--fix-loop] [--state-machine] [--components N] [--links N]
// Exit: 0 always · 2 usage.

import { decideOutputPolicy } from "./output-policy.mjs";

const NUMBER_FLAGS = new Map([
  ["--rows", "rows"],
  ["--fields", "fields"],
  ["--tasks", "tasks"],
  ["--dependencies", "dependencies"],
  ["--waves", "waves"],
  ["--status-mix", "statusMix"],
  ["--components", "components"],
  ["--links", "links"],
]);
const STRING_FLAGS = new Map([["--artifact", "artifact"]]);
const BOOLEAN_FLAGS = new Map([
  ["--fix-loop", "fixLoop"],
  ["--state-machine", "stateMachine"],
]);

/**
 * @cc [label:output-policy] explicit-policy-input
 * The wrapper binds explicit inputs to the pure policy and prints all four
 * boolean keys, including when no input is supplied.
 */
/** Consume policy flags and return the remaining argv untouched. */
export function parsePolicyArgs(argv) {
  const input = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (NUMBER_FLAGS.has(flag)) {
      const raw = argv[++i];
      if (raw === undefined || !/^\d+(?:\.\d+)?$/.test(raw)) return { error: `${flag} needs a number` };
      input[NUMBER_FLAGS.get(flag)] = Number(raw);
    } else if (STRING_FLAGS.has(flag)) {
      const raw = argv[++i];
      if (raw === undefined) return { error: `${flag} needs a value` };
      input[STRING_FLAGS.get(flag)] = raw;
    } else if (BOOLEAN_FLAGS.has(flag)) {
      input[BOOLEAN_FLAGS.get(flag)] = true;
    } else {
      rest.push(flag);
    }
  }
  return { input, rest };
}

export function parseArgs(argv) {
  const { input, rest, error } = parsePolicyArgs(argv);
  if (error) return { error };
  if (rest.length) return { error: `unknown argument: ${rest[0]}` };
  return { opts: { input } };
}

export function main(argv, { stdout = process.stdout, stderr = process.stderr } = {}) {
  const { opts, error } = parseArgs(argv);
  if (error) {
    stderr.write(`usage error: ${error}\n`);
    return 2;
  }
  stdout.write(`${JSON.stringify(decideOutputPolicy(opts.input))}\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
