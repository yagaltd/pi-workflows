// probe: register tool_call listener and log what it sees for subagent calls
export default function register(pi: any): void {
  pi.on("tool_call", async (event: any) => {
    if (event.toolName === "subagent") {
      console.error("TOOL_CALL SEEN: input.prompt =", JSON.stringify(event.input?.prompt)?.slice(0, 80));
      console.error("TOOL_CALL SEEN: input keys =", Object.keys(event.input || {}));
      console.error("TOOL_CALL SEEN: event keys =", Object.keys(event));
      // try mutation
      if (event.input && typeof event.input.prompt === "string" && event.input.prompt.includes("@role:")) {
        event.input.prompt = "MUTATED-" + event.input.prompt;
        console.error("MUTATED to:", JSON.stringify(event.input.prompt).slice(0, 90));
      }
    }
  });
}
