/**
 * Turn a git commit subject (and optional body) into a simple Super Admin-facing message.
 */
export function commitToPlainEnglish(subject, body = '') {
  let s = String(subject || '').trim();
  if (!s) {
    const firstBody = String(body || '')
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean);
    s = firstBody || 'An update was made to the application.';
  }

  // Prefer first non-trailer line of a multi-line message
  s = s
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !/^co-authored-by:/i.test(l) && !/^signed-off-by:/i.test(l)) || s;

  s = s.replace(/\s*Co-authored-by:.*$/i, '').trim();
  s = s.replace(/\s+/g, ' ').trim();

  let forcedPrefix = null;
  const conventional = s.match(
    /^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)(\([^)]*\))?\s*:\s*(.+)$/i
  );
  if (conventional) {
    const type = conventional[1].toLowerCase();
    s = conventional[3].trim();
    const typeMap = {
      feat: 'We added ',
      fix: 'We fixed ',
      chore: 'We maintained ',
      docs: 'We updated documentation for ',
      style: 'We adjusted styling for ',
      refactor: 'We reworked ',
      perf: 'We improved performance for ',
      test: 'We updated tests for ',
      build: 'We updated the build for ',
      ci: 'We updated automation for ',
      revert: 'We reverted ',
    };
    forcedPrefix = typeMap[type] || 'Update: ';
  }

  const rules = [
    [/^add(ed)?\s+/i, 'We added '],
    [/^fix(ed)?\s+/i, 'We fixed '],
    [/^update(d)?\s+/i, 'We updated '],
    [/^improve(d)?\s+/i, 'We improved '],
    [/^implement(ed)?\s+/i, 'We implemented '],
    [/^create(d)?\s+/i, 'We created '],
    [/^remove(d)?\s+/i, 'We removed '],
    [/^delete(d)?\s+/i, 'We deleted '],
    [/^refactor(ed)?\s+/i, 'We reworked '],
    [/^restore(d)?\s+/i, 'We restored '],
    [/^revert(ed)?\s+/i, 'We reverted '],
    [/^polish(ed)?\s+/i, 'We polished '],
    [/^align(ed)?\s+/i, 'We aligned '],
    [/^restrict(ed)?\s+/i, 'We restricted '],
    [/^bundle(d)?\s+/i, 'We bundled '],
    [/^introduce(d)?\s+/i, 'We introduced '],
    [/^keep\s+/i, 'We kept '],
    [/^darken(ed)?\s+/i, 'We darkened '],
    [/^wire(d)?\s+/i, 'We wired '],
    [/^set\s+/i, 'We set '],
    [/^make\s+/i, 'We made '],
    [/^ensure(d)?\s+/i, 'We ensured '],
    [/^support(ed)?\s+/i, 'We supported '],
    [/^enable(d)?\s+/i, 'We enabled '],
    [/^disable(d)?\s+/i, 'We disabled '],
  ];

  let message;
  if (forcedPrefix) {
    let rest = s;
    for (const [re] of rules) {
      if (re.test(rest)) {
        rest = rest.replace(re, '').trim();
        break;
      }
    }
    message = `${forcedPrefix}${decapitalize(rest)}`;
  } else {
    let matched = false;
    for (const [re, prefix] of rules) {
      if (re.test(s)) {
        const rest = s.replace(re, '').trim();
        message = `${prefix}${decapitalize(rest)}`;
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (/^(we|the|an|a)\s+/i.test(s)) {
        message = s.charAt(0).toUpperCase() + s.slice(1);
      } else {
        message = `We updated ${decapitalize(s)}`;
      }
    }
  }

  message = message.replace(/\s+/g, ' ').trim();
  if (!/[.!?]$/.test(message)) message += '.';

  message = message
    .replace(/\bUI\b/g, 'screens')
    .replace(/\bAPI\b/g, 'system connection')
    .replace(/\bJWT\b/g, 'login security')
    .replace(/\bCSS\b/g, 'styling')
    .replace(/\bPR\b/g, 'change')
    .replace(/\bGitHub\b/gi, 'GitHub')
    .replace(/\bdark mode\b/gi, 'dark mode')
    .replace(/\bSuper Admin\b/gi, 'Super Admin');

  const lower = s.toLowerCase();
  if (lower === 'update' || lower === 'updates' || s.length < 8) {
    const firstBody = String(body || '')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !/^co-authored-by:/i.test(l) && !/^signed-off-by:/i.test(l));
    if (firstBody && firstBody.length > 12) {
      return commitToPlainEnglish(firstBody, '');
    }
  }

  return message;
}

function decapitalize(text) {
  const t = String(text || '').trim();
  if (!t) return t;
  // Keep acronyms / proper nouns that are fully uppercase short tokens
  if (/^[A-Z0-9]{2,}$/.test(t.split(/\s+/)[0])) return t;
  return t.charAt(0).toLowerCase() + t.slice(1);
}
