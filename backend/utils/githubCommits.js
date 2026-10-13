import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import AppUpdate from '../models/AppUpdate.js';
import { commitToPlainEnglish } from './commitToPlainEnglish.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function getRepoSlug() {
  return (
    String(process.env.GITHUB_REPO || 'MAbdullahAbbasi/schoolCurriculum').trim() ||
    'MAbdullahAbbasi/schoolCurriculum'
  );
}

function authHeaders() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'the-learning-grove-updates',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

/**
 * Fetch commits from GitHub API (paginated).
 */
export async function fetchGithubCommits({ maxPages = 50 } = {}) {
  const repo = getRepoSlug();
  const all = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const url = `https://api.github.com/repos/${repo}/commits?per_page=100&page=${page}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(
        `GitHub commits fetch failed (${res.status}): ${text.slice(0, 200)}`
      );
      err.status = res.status;
      throw err;
    }
    const batch = await res.json();
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const item of batch) {
      const sha = item.sha;
      const subject = item.commit?.message?.split('\n')[0] || '';
      const body = item.commit?.message || '';
      const committedAt =
        item.commit?.committer?.date ||
        item.commit?.author?.date ||
        new Date().toISOString();
      const authorName =
        item.commit?.author?.name ||
        item.author?.login ||
        item.commit?.committer?.name ||
        '';
      all.push({
        commitSha: sha,
        originalSubject: subject,
        message: commitToPlainEnglish(subject, body),
        authorName,
        committedAt: new Date(committedAt),
        htmlUrl: item.html_url || `https://github.com/${repo}/commit/${sha}`,
        source: 'github',
      });
    }
    if (batch.length < 100) break;
  }
  return all;
}

/**
 * Fallback: read local git history when GitHub API is unavailable.
 */
export async function fetchLocalGitCommits() {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['log', '--format=%H%x1f%aI%x1f%an%x1f%s%x1f%b%x1e', '--all'],
      { cwd: REPO_ROOT, maxBuffer: 20 * 1024 * 1024 }
    );
    const records = String(stdout || '')
      .split('\x1e')
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    const repo = getRepoSlug();
    return records.map((chunk) => {
      const [sha, iso, author, subject, body = ''] = chunk.split('\x1f');
      return {
        commitSha: String(sha || '').trim(),
        originalSubject: String(subject || '').trim(),
        message: commitToPlainEnglish(subject, body),
        authorName: String(author || '').trim(),
        committedAt: new Date(iso || Date.now()),
        htmlUrl: `https://github.com/${repo}/commit/${String(sha || '').trim()}`,
        source: 'git',
      };
    }).filter((c) => c.commitSha);
  } catch (err) {
    console.warn('Local git commit fetch failed:', err.message);
    return [];
  }
}

/**
 * Upsert commit records into AppUpdate collection.
 */
export async function upsertCommits(commits) {
  let inserted = 0;
  let updated = 0;
  for (const c of commits) {
    if (!c.commitSha || !c.message || !c.committedAt) continue;
    const result = await AppUpdate.updateOne(
      { commitSha: c.commitSha },
      {
        $set: {
          message: c.message,
          originalSubject: c.originalSubject || '',
          authorName: c.authorName || '',
          committedAt: c.committedAt,
          htmlUrl: c.htmlUrl || '',
          source: c.source || 'github',
        },
        $setOnInsert: {
          commitSha: c.commitSha,
        },
      },
      { upsert: true }
    );
    if (result.upsertedCount) inserted += 1;
    else if (result.modifiedCount) updated += 1;
  }
  return { inserted, updated, totalSeen: commits.length };
}

/**
 * Sync from GitHub, falling back to local git history.
 */
export async function syncAppUpdatesFromSource() {
  let commits = [];
  let source = 'github';
  try {
    commits = await fetchGithubCommits();
  } catch (err) {
    console.warn('GitHub sync failed, trying local git:', err.message);
    commits = await fetchLocalGitCommits();
    source = 'git';
  }
  if (!commits.length) {
    commits = await fetchLocalGitCommits();
    source = 'git';
  }
  const stats = await upsertCommits(commits);
  return { ...stats, source, fetched: commits.length };
}

/**
 * Upsert commits from a GitHub push webhook payload.
 */
export async function upsertFromGithubPushPayload(payload) {
  const repo = payload?.repository?.full_name || getRepoSlug();
  const list = Array.isArray(payload?.commits) ? payload.commits : [];
  const commits = list.map((c) => {
    const subject = String(c.message || '').split('\n')[0];
    return {
      commitSha: c.id,
      originalSubject: subject,
      message: commitToPlainEnglish(c.message || subject, c.message || ''),
      authorName: c.author?.name || c.committer?.name || '',
      committedAt: new Date(c.timestamp || Date.now()),
      htmlUrl: c.url || `https://github.com/${repo}/commit/${c.id}`,
      source: 'webhook',
    };
  });
  return upsertCommits(commits);
}
