/**
 * GitHub 프로필 README 자동 생성 스크립트
 * GitHub Actions를 통해 매일 자동 실행됩니다.
 */

const { validateEnv } = require("./src/config");
const { getUserInfo, graphReposStars, getContributedRepos, getTotalCommits, getContributionStats, getLinesOfCode, queryCount } = require("./src/api");
const { updateReadme } = require("./src/readme");

async function main() {
  try {
    console.log("GitHub 프로필 데이터 수집 시작...");

    // 환경변수 검증
    validateEnv();

    // 사용자 정보 조회
    const userInfo = await getUserInfo();
    console.log(`사용자: ${userInfo.name}`);

    // 저장소 및 스타 수 조회
    const repos = await graphReposStars("repos", ["OWNER"]);
    const contributedRepos = await getContributedRepos();

    // 전체 커밋 수 조회
    const totalCommits = await getTotalCommits();

    // 이슈, PR, 오픈소스 기여 조회
    const contributionStats = await getContributionStats();

    // LOC 조회 (캐싱 적용)
    const loc = await getLinesOfCode();

    // README 업데이트
    updateReadme({
      repos,
      contributedRepos,
      totalCommits,
      issues: contributionStats.issues,
      pullRequests: contributionStats.pullRequests,
      openSourceContributions: contributionStats.openSourceContributions,
      additions: loc.additions,
      deletions: loc.deletions,
    });

    console.log("완료!", queryCount);
  } catch (error) {
    console.error("에러 발생:", error.message);
    process.exit(1);
  }
}

main();
