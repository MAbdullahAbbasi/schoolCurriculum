/**
 * Turn a git commit subject (and optional body) into a simple admin-facing message.
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

  s = s.replace(/\s*Co-authored-by:.*$/i, '').trim();

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

  s = s.replace(/\s+/g, ' ').trim();

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
    [/^set\s+/i, 'We set '],
  ];

  let message;
  if (forcedPrefix) {
    // Avoid "We fixed Fix ..."
    let rest = s;
    for (const [re] of rules) {
      if (re.test(rest)) {
        rest = rest.replace(re, '').trim();
        break;
      }
    }
    message = `${forcedPrefix}${rest}`;
  } else {
    let matched = false;
    for (const [re, prefix] of rules) {
      if (re.test(s)) {
        const rest = s.replace(re, '').trim();
        message = `${prefix}${rest}`;
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (/^(we|the|an|a)\s+/i.test(s)) {
        message = s.charAt(0).toUpperCase() + s.slice(1);
      } else {
        message = `Update: ${s.charAt(0).toUpperCase()}${s.slice(1)}`;
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
    .replace(/\bPR\b/g, 'change');

  const lower = s.toLowerCase();
  if (lower === 'update' || lower === 'updates' || s.length < 8) {
    const firstBody = String(body || '')
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l && !/^co-authored-by:/i.test(l));
    if (firstBody && firstBody.length > 12) {
      return commitToPlainEnglish(firstBody, '');
    }
  }

  return message;
}
