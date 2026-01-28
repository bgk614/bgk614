/**
 * GitHub GraphQL API 요청 함수들
 */

const fs = require('fs');
const path = require('path');
const {
  ACCESS_TOKEN,
  USER_NAME,
  GITHUB_API_URL,
  OPEN_SOURCE_REPOS,
} = require('./config');

// 캐시 파일 경로
const CACHE_FILE = path.join(__dirname, '../cache/loc_cache.json');

// 쿼리 호출 횟수 추적
const queryCount = {
  userGetter: 0,
  graphReposStars: 0,
  graphCommits: 0,
};

/**
 * GitHub GraphQL API 공통 요청 함수
 */
async function simpleRequest(funcName, query, variables) {
  const response = await fetch(GITHUB_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `token ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  if (response.ok) {
    return await response.json();
  }

  const errorText = await response.text();
  throw new Error(
    `${funcName} failed with status ${response.status}: ${errorText}`,
  );
}

/**
 * 사용자 정보 조회
 */
async function getUserInfo() {
  queryCount.userGetter++;

  const query = `
    query($login: String!) {
      user(login: $login) {
        id
        name
        followers { totalCount }
        following { totalCount }
      }
    }
  `;

  const data = await simpleRequest('getUserInfo', query, { login: USER_NAME });
  return data.data.user;
}

/**
 * 저장소 개수 또는 스타 개수 조회
 */
async function graphReposStars(countType, ownerAffiliation, cursor = null) {
  queryCount.graphReposStars++;

  const query = `
    query ($owner_affiliation: [RepositoryAffiliation], $login: String!, $cursor: String) {
      user(login: $login) {
        repositories(first: 100, after: $cursor, ownerAffiliations: $owner_affiliation) {
          totalCount
          edges {
            node {
              stargazers { totalCount }
            }
          }
        }
      }
    }
  `;

  const variables = {
    owner_affiliation: ownerAffiliation,
    login: USER_NAME,
    cursor,
  };
  const data = await simpleRequest('graphReposStars', query, variables);
  const repos = data.data.user.repositories;

  if (countType === 'repos') {
    return repos.totalCount;
  } else if (countType === 'stars') {
    return repos.edges.reduce(
      (sum, edge) => sum + edge.node.stargazers.totalCount,
      0,
    );
  }

  return 0;
}

/**
 * 기여한 저장소 수 조회 (본인 소유 + 기여)
 */
async function getContributedRepos() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, PULL_REQUEST, ISSUE]) {
          totalCount
        }
      }
    }
  `;

  const data = await simpleRequest('getContributedRepos', query, {
    login: USER_NAME,
  });
  return data.data.user.repositoriesContributedTo.totalCount;
}

/**
 * 전체 커밋 수 조회 (계정 생성 이후 전체)
 */
async function getTotalCommits() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          totalCommitContributions
          restrictedContributionsCount
        }
      }
    }
  `;

  const data = await simpleRequest('getTotalCommits', query, {
    login: USER_NAME,
  });
  const collection = data.data.user.contributionsCollection;
  return (
    collection.totalCommitContributions +
    collection.restrictedContributionsCount
  );
}

/**
 * 이슈, PR 리뷰 코멘트, PR 수 조회
 */
async function getContributionStats() {
  const query = `
    query($login: String!) {
      user(login: $login) {
        issues(first: 1) {
          totalCount
        }
        pullRequests(first: 1) {
          totalCount
        }
        repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, PULL_REQUEST]) {
          totalCount
        }
      }
    }
  `;

  const data = await simpleRequest('getContributionStats', query, {
    login: USER_NAME,
  });
  const user = data.data.user;

  return {
    issues: user.issues.totalCount,
    pullRequests: user.pullRequests.totalCount,
    openSourceContributions: user.repositoriesContributedTo.totalCount,
  };
}

/**
 * 캐시 읽기
 */
function readCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('캐시 읽기 실패, 새로 계산합니다.');
  }
  return null;
}

/**
 * 캐시 저장
 */
function saveCache(data) {
  try {
    const cacheDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.log('캐시 저장 실패:', e.message);
  }
}

/**
 * 전체 저장소의 LOC (Lines of Code) 조회 - 캐싱 적용
 * 하루에 한 번만 재계산
 */
async function getLinesOfCode() {
  // 캐시 확인 (24시간 유효)
  const cache = readCache();
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  if (cache && cache.timestamp && now - cache.timestamp < ONE_DAY) {
    console.log(
      'LOC 캐시 사용 (마지막 업데이트:',
      new Date(cache.timestamp).toISOString(),
      ')',
    );
    return { additions: cache.additions, deletions: cache.deletions };
  }

  console.log('LOC 새로 계산 중...');

  // 본인 저장소 목록 조회
  const repoQuery = `
    query($login: String!, $cursor: String) {
      user(login: $login) {
        repositories(first: 100, after: $cursor, ownerAffiliations: [OWNER]) {
          edges {
            node {
              name
              owner { login }
              defaultBranchRef {
                target {
                  ... on Commit {
                    history(first: 1) {
                      totalCount
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  let additions = 0;
  let deletions = 0;

  // 저장소 목록 가져오기
  const repoData = await simpleRequest('getLinesOfCode', repoQuery, {
    login: USER_NAME,
    cursor: null,
  });
  const repos = repoData.data.user.repositories.edges;

  // 각 저장소의 커밋에서 LOC 계산
  for (const repo of repos) {
    if (!repo.node.defaultBranchRef) continue;

    const locQuery = `
      query($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 100) {
                  edges {
                    node {
                      additions
                      deletions
                      author {
                        user { login }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const locData = await simpleRequest('getLinesOfCode', locQuery, {
        owner: repo.node.owner.login,
        name: repo.node.name,
      });

      const history =
        locData.data.repository?.defaultBranchRef?.target?.history?.edges || [];
      for (const commit of history) {
        if (commit.node.author?.user?.login === USER_NAME) {
          additions += commit.node.additions;
          deletions += commit.node.deletions;
        }
      }
    } catch (e) {
      continue;
    }
  }

  // 캐시 저장
  saveCache({ additions, deletions, timestamp: now });

  return { additions, deletions };
}

// 오픈소스 PR 캐시 파일 경로
const OSS_PR_CACHE_FILE = path.join(__dirname, '../cache/oss_pr_cache.json');

/**
 * 오픈소스 PR 캐시 읽기
 */
function readOssPrCache() {
  try {
    if (fs.existsSync(OSS_PR_CACHE_FILE)) {
      const data = fs.readFileSync(OSS_PR_CACHE_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log('오픈소스 PR 캐시 읽기 실패');
  }
  return { merged: [], closed: [] };
}

/**
 * 오픈소스 PR 캐시 저장
 */
function saveOssPrCache(data) {
  try {
    const cacheDir = path.dirname(OSS_PR_CACHE_FILE);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(OSS_PR_CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.log('오픈소스 PR 캐시 저장 실패:', e.message);
  }
}

/**
 * 오픈소스 PR 조회 (포함 목록 방식 + 캐싱)
 * - merged/closed PR은 캐시에서 가져옴
 * - open PR만 API로 조회
 * @returns {Promise<{open: Array, merged: Array, closed: Array}>}
 */
async function getOpenSourcePRs() {
  const cache = readOssPrCache();

  const query = `
    query($login: String!, $cursor: String) {
      user(login: $login) {
        pullRequests(first: 100, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
          edges {
            node {
              number
              title
              url
              state
              merged
              createdAt
              repository {
                nameWithOwner
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  `;

  const data = await simpleRequest('getOpenSourcePRs', query, {
    login: USER_NAME,
    cursor: null,
  });
  const prs = data.data.user.pullRequests.edges;

  // 포함 목록에 있는 레포의 PR만 필터링
  const openSourcePRs = prs.filter(({ node }) => {
    return OPEN_SOURCE_REPOS.includes(node.repository.nameWithOwner);
  });

  // 상태별 분류
  const result = {
    open: [],
    merged: [...cache.merged],
    closed: [...cache.closed],
  };

  // 캐시된 PR 번호 Set
  const cachedMergedNums = new Set(
    cache.merged.map((pr) => `${pr.repo}#${pr.number}`),
  );
  const cachedClosedNums = new Set(
    cache.closed.map((pr) => `${pr.repo}#${pr.number}`),
  );

  for (const { node } of openSourcePRs) {
    const pr = {
      number: node.number,
      title: node.title,
      url: node.url,
      repo: node.repository.nameWithOwner,
      createdAt: node.createdAt,
    };
    const prKey = `${pr.repo}#${pr.number}`;

    if (node.state === 'OPEN') {
      result.open.push(pr);
    } else if (node.merged) {
      // 캐시에 없으면 추가
      if (!cachedMergedNums.has(prKey)) {
        result.merged.push(pr);
      }
    } else {
      // 캐시에 없으면 추가
      if (!cachedClosedNums.has(prKey)) {
        result.closed.push(pr);
      }
    }
  }

  // 캐시 업데이트 (merged/closed만 저장)
  saveOssPrCache({
    merged: result.merged,
    closed: result.closed,
  });

  return result;
}

module.exports = {
  getUserInfo,
  graphReposStars,
  getContributedRepos,
  getTotalCommits,
  getContributionStats,
  getLinesOfCode,
  getOpenSourcePRs,
  queryCount,
};
