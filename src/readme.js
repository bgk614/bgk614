/**
 * README 생성 및 업데이트
 */

const fs = require('fs');

const LINE_WIDTH = 60; // 전체 라인 너비

/**
 * 라벨과 값 사이를 점(·)으로 패딩
 * @param {string} label - 라벨 (예: "Email:")
 * @param {string} value - 값 (예: "bgk614@gmail.com")
 * @returns {string} - 패딩된 문자열
 */
function padLine(label, value) {
  const totalLen = LINE_WIDTH;
  const contentLen = label.length + value.length;
  const dotsLen = totalLen - contentLen;
  const dots = '·'.repeat(Math.max(0, dotsLen));
  return `${label}${dots}${value}`;
}

/**
 * README.md 파일 생성
 * @param {object} stats - GitHub 통계 데이터
 */
function updateReadme(stats) {
  const loc = stats.additions + stats.deletions;
  const locValue = `${loc} lines (${stats.additions}++, ${stats.deletions}--)`;
  const reposValue = `${stats.repos} repos (Contributes: ${stats.contributedRepos})`;
  const commitsValue = `${stats.totalCommits} commits`;
  const issuesValue = `${stats.issues} issues`;
  const prsValue = `${stats.pullRequests} PRs`;
  const ossValue = `${stats.openSourceContributions} repos`;

  const readme = `\`\`\`text
Bogyeong Kim ----------------------------------------
${padLine('Language.Programming:', 'JavaScript, TypeScript')}
${padLine('Languages.Real:', 'Korean')}

- Contact -------------------------------------------
${padLine('Email:', 'bgk614@gmail.com')}
${padLine('Email:', 'me@bgk.dev')}
${padLine('LinkedIn:', 'bgk614')}
${padLine('Blog:', 'https://bgk.dev')}

- GitHub Stats --------------------------------------
${padLine('Contributes:', ossValue)}
${padLine('Repositories:', reposValue)}
${padLine('Commits:', commitsValue)}
${padLine('Issues:', issuesValue)}
${padLine('Pull Requests:', prsValue)}
${padLine('Lines of Code:', locValue)}
-----------------------------------------------------
\`\`\`
`;
  fs.writeFileSync('README.md', readme, 'utf8');
  console.log('README.md 업데이트 완료!');
}

module.exports = { updateReadme };
