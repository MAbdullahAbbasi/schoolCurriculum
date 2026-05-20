/**
 * "Question choice groups": students attempt only one question from each group.
 * Per-question marks (sum of slot marks for that question) must be equal within a group.
 * Effective paper total = sum of all per-question totals minus (sum within each group - one question's worth).
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
        message: `Questions in a choice group must have the same total marks (sum of all parts). Group Q${g.join(', Q')}: ${g.map((q) => `Q${q}=${perQuestionTotals[q] ?? 0}`).join(', ')}.`,
      };
    }
    if (first <= 0) {
      return { ok: false, message: `Each question in a choice group must have a positive total marks value.` };
    }
  }
  return { ok: true, groups: gnorm };
}

/**
 * For percentage/objective distribution: zero out slot marks for non–best-scoring questions in each group.
 */
export function pickBestQuestionPerGroup(questionMarks, questionPartMarks, questionChoiceGroups) {
  const groups = normalizeChoiceGroups(questionChoiceGroups);
  if (groups.length === 0) return { ...questionMarks };
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
