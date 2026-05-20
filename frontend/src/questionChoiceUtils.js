/**
 * Question choice between main questions (mirrors backend/utils/questionChoiceMarks.js).
 * Compulsory-only totals match Create Course "total marks" validation.
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

export function perQuestionCompulsoryTotals(slots, marksBySlot) {
  const map = {};
  for (const sl of slots || []) {
    if (!sl.isCompulsory) continue;
    const q = sl.questionIndex;
    const key = sl.key;
    map[q] = (map[q] || 0) + (Number(marksBySlot[key]) || 0);
  }
  return map;
}

export function normalizeChoiceGroups(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out = [];
  for (const g of raw) {
    if (!Array.isArray(g) || g.length < 2) continue;
    const nums = [...new Set(g.map((x) => Number(x)).filter((n) => Number.isFinite(n) && n >= 1))].sort((a, b) => a - b);
    if (nums.length >= 2) out.push(nums);
  }
  return out;
}

export function effectiveCompulsoryTotal(slots, marksBySlot, questionChoiceGroups) {
  const groups = normalizeChoiceGroups(questionChoiceGroups);
  const perQ = perQuestionCompulsoryTotals(slots, marksBySlot);
  if (groups.length === 0) {
    return Object.values(perQ).reduce((a, b) => a + b, 0);
  }
  let raw = 0;
  for (const v of Object.values(perQ)) raw += v;
  let subtract = 0;
  for (const g of groups) {
    const vals = g.map((q) => perQ[q] || 0);
    const sumG = vals.reduce((a, b) => a + b, 0);
    const maxG = Math.max(0, ...vals);
    subtract += sumG - maxG;
  }
  return Math.max(0, raw - subtract);
}

export function effectiveTotalFromQuestionPartMarks(questionPartMarks, questionChoiceGroups) {
  const qpm = questionPartMarks || [];
  const raw = qpm.reduce((s, m) => s + (Number(m.marks) || 0), 0);
  const groups = normalizeChoiceGroups(questionChoiceGroups);
  if (groups.length === 0) return raw;
  const perQ = perQuestionSlotTotals(qpm);
  let subtract = 0;
  for (const g of groups) {
    const vals = g.map((q) => perQ[q] || 0);
    const sumG = vals.reduce((a, b) => a + b, 0);
    const maxG = Math.max(0, ...vals);
    subtract += sumG - maxG;
  }
  return Math.max(0, raw - subtract);
}

export function validateQuestionChoiceGroups(groups, totalQuestionsNum, perQuestionTotals) {
  const gnorm = normalizeChoiceGroups(groups);
  if (gnorm.length === 0) return { ok: true, groups: [] };
  const used = new Set();
  for (const g of gnorm) {
    for (const q of g) {
      if (totalQuestionsNum != null && q > totalQuestionsNum) {
        return { ok: false, message: `Question choice group contains invalid question Q${q}.` };
      }
      if (used.has(q)) {
        return { ok: false, message: `Question Q${q} appears in more than one choice group.` };
      }
      used.add(q);
    }
    const vals = g.map((q) => perQuestionTotals[q] ?? 0);
    const first = vals[0];
    if (!vals.every((v) => Math.abs(v - first) < 0.01)) {
      return {
        ok: false,
        message: `Questions in a choice group must have the same compulsory total marks. Group Q${g.join(', Q')}: ${g.map((q) => `Q${q}=${(perQuestionTotals[q] ?? 0).toFixed(1)}`).join(', ')}.`,
      };
    }
    if (first <= 0) {
      return { ok: false, message: 'Each question in a choice group must have a positive compulsory marks total.' };
    }
  }
  return { ok: true, groups: gnorm };
}

/**
 * For totals: only the best-scoring question in each choice group counts (same rule as server).
 */
export function pickBestQuestionPerGroup(questionMarks, questionPartMarks, questionChoiceGroups) {
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
    let bestQ = g[0];
    let bestScore = obtainedForQuestion(bestQ, next);
    for (const q of g) {
      const sc = obtainedForQuestion(q, next);
      if (sc > bestScore) {
        bestScore = sc;
        bestQ = q;
      }
    }
    for (const q of g) {
      if (q === bestQ) continue;
      for (const key of slotKeysForQuestion(q)) {
        delete next[key];
      }
    }
  }
  return next;
}
