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

export function isPartCompulsory(questionIndex, partIndex, questionParts) {
  const cfg = (questionParts || []).find((p) => Number(p.questionIndex) === Number(questionIndex));
  const numParts = Number(cfg?.numParts) || 0;
  const compulsory = Number(cfg?.compulsoryParts) || 0;
  const part = Number(partIndex);
  if (numParts <= 0) return true;
  if (part <= 0) return true;
  return part <= compulsory;
}

export function buildQuestionPartSlots(questionParts, questionPartMarks) {
  return (questionPartMarks || []).map((m) => {
    const q = Number(m.questionIndex);
    const part = Number(m.partIndex);
    const key = part === 0 ? `q${q}` : `q${q}-p${part}`;
    return {
      questionIndex: q,
      partIndex: part,
      key,
      isCompulsory: isPartCompulsory(q, part, questionParts),
      maxMarks: Number(m.marks) || 0,
    };
  });
}

function perQuestionCompulsoryTotalsFromMarks(questionParts, questionPartMarks) {
  const slots = buildQuestionPartSlots(questionParts, questionPartMarks);
  const map = {};
  for (const sl of slots) {
    if (!sl.isCompulsory) continue;
    map[sl.questionIndex] = (map[sl.questionIndex] || 0) + sl.maxMarks;
  }
  return map;
}

function subtractForGroups(perQ, groups) {
  let subtract = 0;
  for (const g of groups) {
    const vals = g.questions.map((q) => perQ[q] || 0);
    const sumG = vals.reduce((a, b) => a + b, 0);
    const perQuestion = vals[0] ?? 0;
    subtract += sumG - g.attemptCount * perQuestion;
  }
  return subtract;
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

export function effectiveTotalFromQuestionPartMarks(
  questionPartMarks,
  questionChoiceGroups,
  questionParts,
  compulsoryQuestions = null
) {
  const qpm = questionPartMarks || [];
  const allQ = new Set();
  for (const m of qpm) {
    const q = Number(m.questionIndex);
    if (Number.isFinite(q) && q >= 1) allQ.add(q);
  }
  const groups = resolveEffectiveChoiceGroups(questionChoiceGroups, compulsoryQuestions, allQ);

  if (Array.isArray(questionParts) && questionParts.length > 0) {
    const perQ = perQuestionCompulsoryTotalsFromMarks(questionParts, qpm);
    if (groups.length === 0) {
      return Object.values(perQ).reduce((a, b) => a + b, 0);
    }
    const raw = Object.values(perQ).reduce((a, b) => a + b, 0);
    return Math.max(0, raw - subtractForGroups(perQ, groups));
  }

  const raw = qpm.reduce((s, m) => s + (Number(m.marks) || 0), 0);
  if (groups.length === 0) return raw;
  const perQ = perQuestionSlotTotals(qpm);
  return Math.max(0, raw - subtractForGroups(perQ, groups));
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

function resolveQuestionsToCount(questionsToCount, allQ) {
  if (questionsToCount == null || questionsToCount === '') return null;
  const n = Math.floor(Number(questionsToCount));
  if (!Number.isFinite(n) || n < 1) return null;
  if (allQ.size === 0) return n;
  return Math.min(n, allQ.size);
}

function questionIndexList(allQ) {
  return [...allQ].sort((a, b) => a - b);
}

export function resolveEffectiveChoiceGroups(questionChoiceGroups, questionsToCount, allQ) {
  const explicit = normalizeChoiceGroups(questionChoiceGroups);
  if (explicit.length > 0) return explicit;
  const count = resolveQuestionsToCount(questionsToCount, allQ);
  const allArr = questionIndexList(allQ);
  if (count == null || allArr.length <= count) return [];
  return [{ questions: allArr, attemptCount: count }];
}

function obtainedForQuestion(q, marks, questionPartMarks) {
  let s = 0;
  for (const m of questionPartMarks || []) {
    if (Number(m.questionIndex) !== q) continue;
    const part = Number(m.partIndex);
    const key = part === 0 ? `q${q}` : `q${q}-p${part}`;
    const v = Number(marks[key]);
    if (!Number.isNaN(v) && v > 0) s += v;
  }
  return s;
}

function keepTopScoringQuestions(questions, countToKeep, marks, questionPartMarks) {
  const ranked = questions
    .map((q) => ({ q, score: obtainedForQuestion(q, marks, questionPartMarks) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.q - b.q);
  const keep = Math.min(countToKeep, ranked.length);
  return new Set(ranked.slice(0, keep).map((r) => r.q));
}

export function getKeptQuestionIndices(
  questionMarks,
  questionPartMarks,
  questionChoiceGroups,
  questionParts,
  compulsoryQuestions = null
) {
  const allQ = new Set();
  for (const m of questionPartMarks || []) {
    const q = Number(m.questionIndex);
    if (Number.isFinite(q) && q >= 1) allQ.add(q);
  }
  if (allQ.size === 0) return new Set();

  const marks = questionMarks || {};
  const allArr = questionIndexList(allQ);
  const groups = resolveEffectiveChoiceGroups(questionChoiceGroups, compulsoryQuestions, allQ);

  if (groups.length === 0) {
    return allQ;
  }

  const kept = new Set();
  const inAnyGroup = new Set();
  groups.forEach((g) => g.questions.forEach((q) => inAnyGroup.add(q)));

  for (const g of groups) {
    const top = keepTopScoringQuestions(g.questions, g.attemptCount, marks, questionPartMarks);
    top.forEach((q) => kept.add(q));
  }

  for (const q of allArr) {
    if (inAnyGroup.has(q)) continue;
    if (obtainedForQuestion(q, marks, questionPartMarks) > 0) {
      kept.add(q);
    }
  }

  return kept;
}

function isSlotCountedForStudent(
  slotKey,
  questionIndex,
  partIndex,
  questionMarks,
  questionPartMarks,
  questionChoiceGroups,
  questionParts,
  compulsoryQuestions = null
) {
  const marks = questionMarks || {};
  const hasMarks = slotKey != null && Number(marks[slotKey]) > 0;
  const isOptionalPart =
    questionParts?.length && partIndex != null && !isPartCompulsory(questionIndex, partIndex, questionParts);
  if (isOptionalPart && !hasMarks) return false;
  if (questionIndex == null) return true;
  const kept = getKeptQuestionIndices(
    marks,
    questionPartMarks,
    questionChoiceGroups,
    questionParts,
    compulsoryQuestions
  );
  return kept.has(questionIndex);
}

export function computeObtainedTotalForStudent({
  questionPartMarks,
  questionMarks,
  notAttemptedSlots = [],
  leftOnChoiceSlots = [],
  questionChoiceGroups,
  questionParts,
  compulsoryQuestions = null,
}) {
  const na = new Set(notAttemptedSlots || []);
  const leftOnChoice = new Set(leftOnChoiceSlots || []);
  const qMRaw = questionMarks || {};
  let sum = 0;

  for (const m of questionPartMarks || []) {
    const q = Number(m.questionIndex);
    const part = Number(m.partIndex);
    const slotKey = part === 0 ? `q${q}` : `q${q}-p${part}`;
    if (na.has(slotKey) || leftOnChoice.has(slotKey)) continue;
    if (
      !isSlotCountedForStudent(
        slotKey,
        q,
        part,
        qMRaw,
        questionPartMarks,
        questionChoiceGroups,
        questionParts,
        compulsoryQuestions
      )
    ) {
      continue;
    }
    sum += Number(qMRaw[slotKey]) || 0;
  }
  return sum;
}

export function computeEffectiveMaxForStudent({
  questionPartMarks,
  questionMarks,
  notAttemptedSlots = [],
  leftOnChoiceSlots = [],
  questionChoiceGroups,
  questionParts,
  compulsoryQuestions = null,
}) {
  const na = new Set(notAttemptedSlots || []);
  const leftOnChoice = new Set(leftOnChoiceSlots || []);
  const qMRaw = questionMarks || {};
  let max = 0;

  for (const m of questionPartMarks || []) {
    const q = Number(m.questionIndex);
    const part = Number(m.partIndex);
    const slotKey = part === 0 ? `q${q}` : `q${q}-p${part}`;
    const slotMax = Number(m.marks) || 0;
    if (na.has(slotKey) || leftOnChoice.has(slotKey)) continue;
    if (
      !isSlotCountedForStudent(
        slotKey,
        q,
        part,
        qMRaw,
        questionPartMarks,
        questionChoiceGroups,
        questionParts,
        compulsoryQuestions
      )
    ) {
      continue;
    }
    max += slotMax;
  }
  return max;
}

/**
 * For scoring: keep marks only for questions that count toward this student's total.
 */
export function pickBestQuestionsPerGroup(
  questionMarks,
  questionPartMarks,
  questionChoiceGroups,
  questionParts,
  compulsoryQuestions = null
) {
  const kept = getKeptQuestionIndices(
    questionMarks,
    questionPartMarks,
    questionChoiceGroups,
    questionParts,
    compulsoryQuestions
  );
  const next = { ...(questionMarks || {}) };
  for (const m of questionPartMarks || []) {
    const q = Number(m.questionIndex);
    if (!Number.isFinite(q) || q < 1 || kept.has(q)) continue;
    const part = Number(m.partIndex);
    const key = part === 0 ? `q${q}` : `q${q}-p${part}`;
    delete next[key];
  }
  return next;
}

/** @deprecated alias */
export const pickBestQuestionPerGroup = pickBestQuestionsPerGroup;
