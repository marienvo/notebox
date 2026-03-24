/**
 * Pure helpers for release semver bumps (see scripts/bump-release-version.mjs).
 */

/** @param {string} s */
export function parseSemver(s) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(s).trim());
  if (!m) {
    return null;
  }
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
  };
}

/** @param {string} version */
export function bumpMinor(version) {
  const p = parseSemver(version);
  if (!p) {
    throw new Error(`Invalid semver: ${version}`);
  }
  return `${p.major}.${p.minor + 1}.0`;
}

/** @param {string} version */
export function bumpPatch(version) {
  const p = parseSemver(version);
  if (!p) {
    throw new Error(`Invalid semver: ${version}`);
  }
  return `${p.major}.${p.minor}.${p.patch + 1}`;
}

/**
 * @param {boolean} stateFileExists
 * @param {{ branchesBuilt: string[]; commitsBuilt: string[] }} state
 * @param {string} branchId
 * @param {string} commitSha
 * @param {string} currentSemver
 * @returns {{ kind: 'baseline' | 'minor' | 'patch' | 'noop'; newVersion: string; versionCodeDelta: number; registerBranch?: string; registerCommit?: string }}
 */
export function decideBump(
  stateFileExists,
  state,
  branchId,
  commitSha,
  currentSemver,
) {
  const branches = new Set(state.branchesBuilt ?? []);
  const commits = new Set(state.commitsBuilt ?? []);

  if (!stateFileExists) {
    return {
      kind: 'baseline',
      newVersion: currentSemver,
      versionCodeDelta: 0,
      registerBranch: branchId,
      registerCommit: commitSha,
    };
  }

  if (!branches.has(branchId)) {
    return {
      kind: 'minor',
      newVersion: bumpMinor(currentSemver),
      versionCodeDelta: 1,
      registerBranch: branchId,
      registerCommit: commitSha,
    };
  }

  if (!commits.has(commitSha)) {
    return {
      kind: 'patch',
      newVersion: bumpPatch(currentSemver),
      versionCodeDelta: 1,
      registerCommit: commitSha,
    };
  }

  return {
    kind: 'noop',
    newVersion: currentSemver,
    versionCodeDelta: 0,
  };
}

/**
 * @param {{ branchesBuilt: string[]; commitsBuilt: string[] }} state
 * @param {string | undefined} branchId
 * @param {string | undefined} commitSha
 */
export function mergeState(state, branchId, commitSha) {
  const branches = [...(state.branchesBuilt ?? [])];
  const commits = [...(state.commitsBuilt ?? [])];
  if (branchId && !branches.includes(branchId)) {
    branches.push(branchId);
  }
  if (commitSha && !commits.includes(commitSha)) {
    commits.push(commitSha);
  }
  return { branchesBuilt: branches, commitsBuilt: commits };
}
