/**
 * 환경변수 및 설정
 */

const ACCESS_TOKEN = process.env.ACCESS_TOKEN;
const USER_NAME = process.env.USER_NAME;

const GITHUB_API_URL = 'https://api.github.com/graphql';

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
  validateEnv,
};
