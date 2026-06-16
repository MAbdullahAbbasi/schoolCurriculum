/** Stable keys for curriculum objectives (survive subject/grade filtering). */

const KEY_SEP = '::';

export function makeObjectiveKey(gradeId, objective, topicIndex) {
  const gid = String(gradeId);
  const code = String(objective?.code ?? '').trim();
  if (code) return `${gid}${KEY_SEP}${code}`;
  return `${gid}${KEY_SEP}i${topicIndex}`;
}

export function parseObjectiveKey(topicKey) {
  if (!topicKey || typeof topicKey !== 'string') return null;

  const sepIdx = topicKey.indexOf(KEY_SEP);
  if (sepIdx !== -1) {
    const gradeId = topicKey.slice(0, sepIdx);
    const rest = topicKey.slice(sepIdx + KEY_SEP.length);
    if (/^i\d+$/.test(rest)) {
      return { gradeId, topicIndex: parseInt(rest.slice(1), 10), code: null };
    }
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

export function resolveObjectiveFromCurriculum(curriculumData, topicKey) {
  const parsed = parseObjectiveKey(topicKey);
  if (!parsed) return null;

  const grade = (curriculumData || []).find(
    (g) => String(g._id) === parsed.gradeId || g._id === parsed.gradeId
  );
  if (!grade?.objectives?.length) return null;

  let topicIndex = parsed.topicIndex;
  let topic = null;

  if (parsed.code != null) {
    topicIndex = grade.objectives.findIndex(
      (o) => String(o?.code ?? '').trim() === parsed.code
    );
    if (topicIndex === -1) return null;
    topic = grade.objectives[topicIndex];
  } else if (topicIndex != null && !Number.isNaN(topicIndex)) {
    topic = grade.objectives[topicIndex];
    if (!topic) return null;
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
  return topicKeys
    .map((key) => resolveObjectiveFromCurriculum(curriculumData, key))
    .filter(Boolean);
}
