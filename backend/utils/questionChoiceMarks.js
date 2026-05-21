/**
 * Question choice among whole questions (not parts).
 * Each group: { questions: number[], attemptCount: number } — student attempts `attemptCount` questions from the group.
 * Legacy format [[1,2],[3,4]] is treated as attemptCount 1 per group.
 * Questions in a group must have the same total marks (sum of all parts).
 */

export function perQuestionSlotTotals(questionPartMarks) {
  const map = {};
  for (const m of questionPartMarks || []) {
    const q = Number(m.questionIndex);
    if (!Number.isFinite(q) || q < 1) continue;
    map[q] = (map[q] || 0) + (Number(m.marks) || 0);
  }
  return map;
}

/**
 * @returns {{ questions: number[], attemptCount: number }[]}
 */
export function normalizeChoiceGroups(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out = [];
  for (const item of raw) {
    if (Array.isArray(item)) {
      const nums = [...new Set(item.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 1))].sort(
        (a, b) => a - b
      );
      if (nums.length >= 2) out.push({ questions: nums, attemptCount: 1 });
      continue;
    }
    if (item && typeof item === 'object') {
      const qs = item.questions ?? item.questionIndices;
      const nums = [...new Set((Array.isArray(qs) ? qs : []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 1))].sort(
        (a, b) => a - b
      );
      if (nums.length < 2) continue;
      let k = Number(item.attemptCount ?? item.attempt ?? 1);
      if (!Number.isFinite(k) || k < 1) k = 1;
      k = Math.min(Math.floor(k), nums.length);
      out.push({ questions: nums, attemptCount: k });
    }
  }
  return out;
}

export function effectiveTotalFromQuestionPartMarks(questionPartMarks, questionChoiceGroups) {
  const qpm = questionPartMarks || [];
  const raw = qpm.reduce((s, m) => s + (Number(m.marks) || 0), 0);
  const groups = normalizeChoiceGroups(questionChoiceGroups);
  if (groups.length === 0) return raw;
  const perQ = perQuestionSlotTotals(qpm);
  let subtract = 0;
  for (const g of groups) {
    const vals = g.questions.map((q) => perQ[q] || 0);
    const sumG = vals.reduce((a, b) => a + b, 0);
    const perQuestion = vals[0] ?? 0;
    const counted = g.attemptCount * perQuestion;
    subtract += sumG - counted;
  }
  return Math.max(0, raw - subtract);
}

export function validateQuestionChoiceGroups(groups, totalQuestionsNum, perQuestionTotals) {
  const gnorm = normalizeChoiceGroups(groups);
  if (gnorm.length === 0) return { ok: true, groups: [] };
  const used = new Set();
  for (const g of gnorm) {
    const { questions, attemptCount } = g;
    if (questions.length < 2) {
      return { ok: false, message: 'Each choice group must include at least two questions.' };
    }
    if (attemptCount < 1 || attemptCount > questions.length) {
      return {
        ok: false,
        message: `Group Q${questions.join(', Q')}: number to attempt must be between 1 and ${questions.length} (got ${attemptCount}).`,
      };
    }
    for (const q of questions) {
      if (totalQuestionsNum != null && q > totalQuestionsNum) {
        return { ok: false, message: `Question choice group contains invalid question Q${q}.` };
      }
      if (used.has(q)) {
        return { ok: false, message: `Question Q${q} appears in more than one choice group.` };
      }
      used.add(q);
    }
    const vals = questions.map((q) => perQuestionTotals[q] ?? 0);
    const first = vals[0];
    if (!vals.every((v) => Math.abs(v - first) < 0.01)) {
      return {
        ok: false,
        message: `Questions in a choice group must have the same total marks (sum of all parts). Group Q${questions.join(', Q')}: ${questions.map((q) => `Q${q}=${perQuestionTotals[q] ?? 0}`).join(', ')}.`,
      };
    }
    if (first <= 0) {
      return { ok: false, message: 'Each question in a choice group must have a positive total marks value.' };
    }
  }
  return { ok: true, groups: gnorm };
}

/**
 * For scoring: keep the top `attemptCount` questions by obtained marks per group; drop the rest.
 */
export function pickBestQuestionsPerGroup(questionMarks, questionPartMarks, questionChoiceGroups) {
  const groups = normalizeChoiceGroups(questionChoiceGroups);
  if (groups.length === 0) return { ...(questionMarks || {}) };
  const next = { ...(questionMarks || {}) };
  const slotKeysForQuestion = (q) => {
    const keys = [];
    for (const m of questionPartMarks || []) {
      if (Number(m.questionIndex) !== q) continue;
      const part = Number(m.partIndex);
      keys.push(part === 0 ? `q${q}` : `q${q}-p${part}`);
    }
    return keys;
  };
  const obtainedForQuestion = (q, marks) => {
    let s = 0;
    for (const key of slotKeysForQuestion(q)) {
      const v = Number(marks[key]);
      if (!Number.isNaN(v) && v > 0) s += v;
    }
    return s;
  };
  for (const g of groups) {
    const ranked = g.questions
      .map((q) => ({ q, score: obtainedForQuestion(q, next) }))
      .sort((a, b) => b.score - a.score || a.q - b.q);
    const keep = new Set(ranked.slice(0, g.attemptCount).map((r) => r.q));
    for (const q of g.questions) {
      if (keep.has(q)) continue;
      for (const key of slotKeysForQuestion(q)) {
        delete next[key];
      }
    }
  }
  return next;
}

/** @deprecated alias */
export const pickBestQuestionPerGroup = pickBestQuestionsPerGroup;
