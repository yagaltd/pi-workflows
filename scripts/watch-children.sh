#!/usr/bin/env bash
# watch-children — live tail of pi-core-subagent child sessions (for a herdr pane).
# Every 3s: list each child session JSONL modified in the last 10 minutes with its
# last event summary (role, tool call, stop reason) + turns/cost so far.
# Children = session files whose first line carries "parentSession".
set -u
SESSIONS_DIR="$HOME/.pi/agent/sessions"

lastline() { tail -n 1 "$1" 2>/dev/null; }

while true; do
  clear
  echo "═══ subagent children (active: modified < 10 min ago) — $(date +%H:%M:%S) ═══"
  found=0
  for dir in "$SESSIONS_DIR"/*/; do
    [ -d "$dir" ] || continue
    for f in "$dir"*.jsonl; do
      [ -e "$f" ] || continue
      # active within 10 min?
      [ -n "$(find "$f" -mmin -10 2>/dev/null)" ] || continue
      # is a child? (parentSession in first line)
      head -c 2000 "$f" | grep -q parentSession || continue
      found=1
      name=$(python3 - "$f" <<'PY'
import json,sys
f=sys.argv[1]
name=""; turns=0; cost=0.0; last=""
for line in open(f, errors="replace"):
    try: e=json.loads(line)
    except: continue
    if e.get("type")=="session_info" and e.get("name"): name=e["name"].replace("subagent: ","")
    if e.get("type")=="message":
        m=e.get("message",e)
        if m.get("role")=="assistant":
            turns+=1; cost+=(m.get("usage") or {}).get("cost",{}).get("total",0)
            tc=[c for c in m.get("content",[]) if isinstance(c,dict) and c.get("type")=="toolCall"]
            if tc: last="→ "+tc[-1].get("name","")+" "+json.dumps(tc[-1].get("arguments",{}))[:60]
            elif any(isinstance(c,dict) and c.get("type")=="text" and c.get("text","").strip() for c in m.get("content",[])):
                last="✍ text"
print(f"{name or f.split('/')[-1][:20]:24} {turns:3}t ${cost:.3f}  {last[:80]}")
PY
) && echo "$name"
    done
  done
  [ "$found" = 0 ] && echo "(no active children — waiting for dispatches)"
  echo "─────────────────────────────────────────────"
  sleep 3
done
