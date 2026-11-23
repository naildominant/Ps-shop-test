---
name: token-efficiency
description: Use for complex or long agentic tasks, context-window audits, Claude Code cost and limit optimization, or when the user explicitly asks to save tokens or be brief. Covers concise reasoning and replies, efficient tool use (search before reading, batching, targeted output) and context management. Not needed for ordinary short tasks.
---

# Token Efficiency & Sharper Thinking

Habits for work where tokens matter: complex or long agentic tasks, context audits,
Claude Code cost and limit optimization, and any request to save tokens or be brief.
Not needed for routine short tasks; the basic rules in CLAUDE.md are enough there.
Covers reasoning, prose, code, tool use and the context window. With no tools (plain
conversation) §4–§5 don't apply; §1–§3 and §6–§7 do.

**Core principle:** the goal is never "say less." The goal is to find the smallest set
of high-signal tokens that gets the outcome right. Cutting a needed clarification to
save tokens is a false economy — it causes re-work that costs far more later. Optimize
for total tokens across the whole conversation (or the whole agentic session), not the
current message in isolation. When a cut would risk a second round-trip — with the
user, or with a tool — don't make it.

## How this skill is delivered

Companion files: `CORE.md` (short core contract) and `references/examples.md`
(before/after examples, read on demand). `CORE.md` and `CORE_SHORT.md` were written for
an optional `UserPromptSubmit` hook; no such hook is installed in this project, so
nothing is injected automatically. The skill is invoked only for the situations in its
description.

## 1. Reasoning efficiently (thinking blocks and step-by-step work)

- **Decide the shape of the answer before elaborating.** Identify what the actual
  deliverable is (a number, a decision, a file, a yes/no + reason) and reason toward
  that, instead of exploring the whole problem space first.
- **Match reasoning depth to task complexity.** A simple lookup or single-fact
  question doesn't need multi-paragraph deliberation. Reserve deep, step-by-step
  reasoning for genuinely hard problems — multi-constraint trade-offs, non-obvious
  bugs, ambiguous designs — where the extra thinking measurably changes the answer.
  Spending a long thinking block on something you already know the answer to is pure
  overhead.
- **Don't re-derive what's already known.** If a fact, constraint, or prior conclusion
  is already established earlier in the reasoning or conversation, reference it —
  don't recompute or re-justify it from scratch.
- **One pass, not three.** Avoid solving something, then "double-checking" by solving
  it again the same way, then summarizing the check a third time. Verify only the
  step(s) that are actually error-prone (arithmetic, edge cases, off-by-one), not the
  whole chain.
- **Stop reasoning once the answer is determined.** Continuing to generate
  alternative approaches "for completeness" after a correct answer is found wastes
  tokens. Mention an alternative only if it would change the recommendation.
- **Prefer the most discriminating check first.** When several checks could validate
  an answer, run the one most likely to catch an error, rather than running all of
  them exhaustively.
- **Use compact internal notation** (short variable names, bullet fragments,
  arithmetic shown once) in reasoning — internal reasoning doesn't need full prose
  sentences to be correct.

## 2. Writing efficient prose responses

- **Answer first, no preamble or restated request (also in CLAUDE.md).** Skip the closing
  summary unless the response is long enough that it aids navigation. Supporting
  reasoning only as needed for the user to trust or use the answer.
- **Cut hedges and filler.** "It's worth noting that," "in order to," "as mentioned,"
  "I hope this helps," "please let me know if..." — remove unless they carry real
  content. See the filler table in `references/examples.md` for more.
- **Don't over-explain the obvious.** Skip explaining well-known concepts, syntax, or
  terminology the user's phrasing shows they already know.
- **Match length to the question, not to a template.** A yes/no question deserves a
  short answer plus the one-line reason, not a structured essay. Reserve headers,
  bullet lists, and multi-section structure for content that is genuinely
  multi-part — don't impose structure on a two-sentence answer.
- **One clarifying question, only if truly needed.** Don't pad with several
  "just in case" questions when one resolves the ambiguity.
- **Avoid redundant restatement across a response.** State a fact once. Don't repeat
  the same point in the intro, the body, and the conclusion.
- **The same rules govern deliverables** — emails, reports, summaries, plans. Lead
  with the bottom line, one point per paragraph, no throat-clearing openers ("I am
  writing to..."), and don't pad for gravitas: length signals nothing about quality.
- **Summarize at the altitude the reader needs.** A research summary for a decision
  needs the decision-relevant findings, not a tour of everything read along the way.
  Compression is choosing what to omit, not shrinking the font on everything.

## 3. Efficient code and files

- **Edit, don't rewrite.** When changing part of an existing file, use a targeted
  diff/edit instead of regenerating the whole file, unless the user asked for a full
  rewrite or the changes touch most of the file anyway.
- **Don't restate code you're not changing** in explanations — reference it by
  name/location ("in `parse_config`, change the default timeout") rather than pasting
  it back.
- **Avoid duplicated logic.** Factor out repeated blocks instead of copy-pasting
  variations; this shrinks both the code and any future explanation of it.
- **Comment for "why," not "what."** Skip comments that just restate the line below
  them (`# increment counter` above `i += 1`). Comment only non-obvious intent,
  trade-offs, or gotchas.
- **Prune boilerplate.** Don't include unused imports, placeholder sections, or
  defensive code for cases the task doesn't call for. Match robustness to what's
  actually needed, not maximal generality by default.

## 4. Agentic tool-use efficiency

In an agentic session (Claude Code or any tool-using agent), every tool call carries a
cost independent of the final answer: the fixed overhead of a model turn plus whatever
the tool returns into context. The habits above apply to what you *say*; these apply
to what you *do*.

- **Already required by CLAUDE.md in this project, not repeated here:** batch independent
  calls, filter long output, search before reading and read only needed lines, don't
  re-read after a successful edit.
- **Delegate to move bulk data out of context, not to offload thinking.** Spawning a
  subagent to search a large codebase and return a distilled answer is worth the
  dispatch cost because it keeps the raw search results out of the main context.
  Spawning one for a lookup you could resolve with a single direct tool call just adds
  that dispatch cost for nothing.
- **Don't paste large tool output back into your reply.** Summarize it or reference
  it by file:line — the user (and, in a subagent, the caller) can already see the raw
  tool result; repeating it in prose doubles the cost of the same information.
- **Stop once the goal is verified, don't loop "to be sure."** Re-running a build,
  test, or search after it already succeeded doesn't add evidence — it just spends
  tokens. Save retries for things that actually failed, are flaky, or changed since
  the last run.
- **The compounding cost lives in the trajectory, not any single turn.** In a long
  session, duplicated searches and unnecessary re-reads across many turns cost far
  more in aggregate than any one verbose reply — apply this section continuously, not
  just when a single response looks long.

## 5. Managing the context window itself

Everything above shrinks what you emit. This section is about what you *accumulate* —
the failure mode that only shows up in long sessions.

- **Treat context as a finite attention budget, not storage.** Every token in the
  window competes for attention with every other one. Recall degrades as the window
  fills — "context rot" — so a session that has hoarded 200k tokens of half-relevant
  file dumps reasons *worse* than one that kept 40k of high-signal ones. Bloating
  context is a correctness problem before it is a cost problem.
- **Retrieve just-in-time, not just-in-case.** Pull a file, doc, or log when the
  current step needs it. Front-loading "everything that might be relevant" spends the
  budget on tokens that will never be used, and buries the ones that will.
- **Keep durable state outside the window.** For long or resumable work, write
  findings, decisions, and the remaining plan to a file (notes, a todo list, a scratch
  doc) instead of relying on them surviving in context. Re-reading four lines of notes
  costs far less than carrying the whole derivation forward — and it survives
  compaction, which the in-context version does not.
- **Compaction is lossy — front-run it.** When a session is heading toward a
  compaction boundary, record the load-bearing facts (file paths, decisions made,
  what's left) somewhere durable *before* the summary happens, rather than
  rediscovering them afterward at full cost.
- **Prune what you're carrying.** Once a search result, a log dump, or an exploratory
  read has served its purpose and its conclusion is recorded, don't keep re-quoting it
  forward into later turns. Reference the conclusion, not the raw evidence.
- **Isolate exploration and use the narrowest tool scope.** Wide searches, noisy logs and
  multi-file surveys go to a subagent so only the distilled answer enters the main
  context (a *context* decision, not just parallelism); scoped queries, line ranges and
  filters protect the attention budget (see CLAUDE.md).

## 6. Guardrails — where NOT to cut

Token efficiency must never come at the cost of:

- **Correctness.** Never drop a caveat, edge case, or safety-relevant detail to save
  space.
- **A required clarifying question** when the request is genuinely ambiguous enough
  that guessing wrong would waste far more tokens than asking.
- **Content the user explicitly asked to be thorough, exhaustive, or detailed
  about.** If they ask for a full explanation, give one — brevity is the default, not
  an override of an explicit request.
- **Citations, code correctness, or safety-relevant caveats** that other instructions
  require.
- **Actually running verification.** Skipping a test, build, or check to save tokens
  and then reporting success anyway is not efficient — it's a guess dressed up as a
  result. When it's wrong, the debugging round-trip to find out costs far more than
  the verification would have.
- **Information a tool call or subagent needs to succeed on the first try.** Trimming
  context out of a subagent prompt or a tool call to save a few tokens, when that
  context is what lets it complete without a follow-up round-trip, is a false economy —
  the same logic as cutting a needed clarifying question.
- **Durable notes for long-horizon work.** Writing state to a file costs tokens now
  and saves a rediscovery pass later. Don't skip it to keep one turn short.

When in doubt between a shorter answer that might need a follow-up — from the user or
from a tool call that comes back short of what's needed — and a longer one that gets
it right the first time, prefer the version that avoids the second round-trip. That's
the actually cheaper option in total tokens.

## 7. Self-check (when this skill is active)

A response is efficient when every sentence would be missed if deleted. Quick pass
before finalizing:

1. Would removing the first sentence lose anything? If not, cut it.
2. Does the last paragraph repeat something the body already said? If so, cut it.
3. Is there a hedge, filler phrase, or restated question in there? Cut it.
4. Is the structure (headers/bullets/sections) proportional to how multi-part the
   content actually is, or is it imposed on something simple? Simplify if the latter.
5. Did a caveat, edge case, or safety detail get cut in the name of brevity? Put it
   back — guardrails always win over brevity (see §6).
6. If this turn included tool calls: did any of them re-confirm something already
   established, run serially when they could have batched, or get pasted back into
   the reply in full when a reference would do? Fix the pattern going forward, not
   just this one reply.
7. Did this turn pull anything into context that won't be needed again? If a
   conclusion was worth keeping, is it recorded somewhere that survives compaction?
