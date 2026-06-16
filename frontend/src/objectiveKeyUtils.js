/** Stable keys for curriculum objectives (survive subject/grade filtering). */

const KEY_SEP = '::';

/** @param {string|object} gradeId
 *  @param {number|object} objectiveOrSourceIndex - source index number, or objective with `_sourceIndex`
 */
export function makeObjectiveKey(gradeId, objectiveOrSourceIndex) {
  const gid = String(gradeId);
  if (typeof objectiveOrSourceIndex === 'number' && Number.isFinite(objectiveOrSourceIndex)) {
    return `${gid}${KEY_SEP}${objectiveOrSourceIndex}`;
  }
  if (objectiveOrSourceIndex && typeof objectiveOrSourceIndex === 'object') {
    const idx = objectiveOrSourceIndex._sourceIndex;
    if (idx != null && Number.isFinite(Number(idx))) {
      return `${gid}${KEY_SEP}${Number(idx)}`;
    }
    const code = String(objectiveOrSourceIndex.code ?? '').trim();
    if (code) return `${gid}${KEY_SEP}c${code}`;
  }
  return `${gid}${KEY_SEP}0`;
}

export function parseObjectiveKey(topicKey) {
  if (!topicKey || typeof topicKey !== 'string') return null;

  const sepIdx = topicKey.indexOf(KEY_SEP);
  if (sepIdx !== -1) {
    const gradeId = topicKey.slice(0, sepIdx);
    const rest = topicKey.slice(sepIdx + KEY_SEP.length);
    if (/^\d+$/.test(rest)) {
      return { gradeId, topicIndex: parseInt(rest, 10), code: null };
    }
    if (/^i\d+$/.test(rest)) {
      return { gradeId, topicIndex: parseInt(rest.slice(1), 10), code: null };
    }
    if (rest.startsWith('c')) {
      return { gradeId, code: rest.slice(1), topicIndex: null };
    }
    // Legacy: code-only segment (no prefix)
    return { gradeId, code: rest, topicIndex: null };
  }

  // Legacy format: gradeId-index
  const lastDash = topicKey.lastIndexOf('-');
  if (lastDash === -1) return { gradeId: topicKey, topicIndex: null, code: null };
  const gradeId = topicKey.slice(0, lastDash);
  const topicIndex = parseInt(topicKey.slice(lastDash + 1), 10);
  if (Number.isNaN(topicIndex)) return null;
  return { gradeId, topicIndex, code: null };
}

export function annotateCurriculumSourceIndices(curriculumData) {
  if (!Array.isArray(curriculumData)) return [];
  return curriculumData.map((grade) => ({
    ...grade,
    objectives: (grade.objectives || []).map((obj, i) => ({
      ...obj,
      _sourceIndex: i,
    })),
  }));
}

export function resolveObjectiveFromCurriculum(curriculumData, topicKey) {
  const parsed = parseObjectiveKey(topicKey);
  if (!parsed) return null;

  const grade = (curriculumData || []).find(
    (g) => String(g._id) === parsed.gradeId || g._id === parsed.gradeId
  );
  if (!grade?.objectives?.length) return null;

  let topicIndex = parsed.topicIndex;
  let topic = null;

  if (topicIndex != null && !Number.isNaN(topicIndex)) {
    topic = grade.objectives[topicIndex];
    if (!topic) return null;
  } else if (parsed.code != null) {
    topicIndex = grade.objectives.findIndex(
      (o) => String(o?.code ?? '').trim() === parsed.code
    );
    if (topicIndex === -1) return null;
    topic = grade.objectives[topicIndex];
  } else {
    return null;
  }

  return {
    topicKey,
    grade: grade.grade,
    gradeId: grade._id,
    topicIndex,
    courseCode: topic.code || '',
    topicName: topic.title || '',
    description: topic.description || '',
    subject: (topic.subject != null ? String(topic.subject).trim() : '') || '',
  };
}

export function resolveTopicsFromCurriculum(curriculumData, topicKeys) {
  if (!Array.isArray(curriculumData) || !Array.isArray(topicKeys)) return [];
  const seen = new Set();
  const out = [];
  for (const key of topicKeys) {
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const resolved = resolveObjectiveFromCurriculum(curriculumData, key);
    if (resolved) out.push(resolved);
  }
  return out;
}
