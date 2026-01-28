/**
 * 환경변수 및 설정
 */

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const USER_NAME = process.env.USER_NAME;

const GITHUB_API_URL = 'https://api.github.com/graphql';

// 오픈소스 PR 필터링 설정
// 포함할 레포 목록 (owner/repo 형식)
const OPEN_SOURCE_REPOS = ['colinhacks/zod', 'eslint/eslint'];

// 환경변수 검증
function validateEnv() {
  if (!ACCESS_TOKEN || !USER_NAME) {
    throw new Error('ACCESS_TOKEN, USER_NAME 환경변수가 필요합니다.');
  }
}

module.exports = {
  ACCESS_TOKEN,
  USER_NAME,
  GITHUB_API_URL,
  OPEN_SOURCE_REPOS,
  validateEnv,
};
