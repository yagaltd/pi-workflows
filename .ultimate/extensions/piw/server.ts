/** pi-workflows project extension — server facet: actions for orchestration helpers. */
export const actions = {
  /** Liveness probe: answers { ok: true, project } — proves the project extension loads. */
  ping: async (_args: unknown, ctx: { conversationId?: string }) => ({
    ok: true,
    project: "pi-workflows",
    conversationId: ctx?.conversationId ?? null,
  }),
};
