// A fixed-shape line a station writes, with the model's formatting taken off.
//
// Stations are asked for lines a script reads back — `OUT-OF-SCOPE-FINDINGS: […]`,
// `Red: <test> — …` — and a model decorates them: indents them, puts them in bold, wraps them in
// backticks. Every decoration has cost this line a failure once, and the two readers that use this
// failed SILENTLY: a bold findings line filed nothing, a bold citation vanished from the commit.
// test/model-lines.test.js holds the rule for every reader at once.
//
// The payload between the markers is never touched. It is JSON with `snake_case` and code in it, or
// a test name with backticks — so markdown is removed only where formatting sits: at the edges of a
// line that starts with it, and around the marker's colon.

const LEAD = /^[*_`]+/;

/**
 * The line, trimmed, with markdown the model wrapped it in removed:
 *
 *   `**Red:** a — got **y**` → `Red: a — got **y**`  only the marker was: markdown sits at its colon
 *   `**Red: a — got y**`     → `Red: a — got y`      the whole line was
 *   `Red: a — got \`y\``     → unchanged             a line that does not START with markdown is left alone
 *
 * The marker case is tried first. A wrapped marker on a line that happens to end with the same
 * character (`**Red:** expected **42**`) is still only a wrapped marker — reading it as a wrapped
 * line cost the citation its own last characters.
 *
 * The caller still checks for its own marker at the start, so prose that merely opens with a bold
 * label — `**Note:** Red: …` — comes back as `Note: Red: …` and is not mistaken for a citation.
 *
 * List bullets are not handled on purpose, and behave unevenly: `* Red: a` is read as a citation,
 * because `*` is also emphasis, while `- Red: a` and `> Red: a` are not. No prompt asks for a bullet.
 */
export function unwrap(line) {
  const text = String(line ?? '').trim();
  const lead = (text.match(LEAD) ?? [''])[0];
  if (!lead) return text;
  const rest = text.slice(lead.length);
  const marker = rest.match(/^([^:\s*_`]+)([*_`]*):([*_`]*)/);
  if (marker && (marker[2] || marker[3])) return `${marker[1]}:${rest.slice(marker[0].length)}`.trim();
  if (rest.endsWith(lead)) return rest.slice(0, -lead.length).trim();
  return rest.trim();
}
