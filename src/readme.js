/**
 * README 생성 및 업데이트
 */

const fs = require('fs');

const LINE_WIDTH = 55; // 오른쪽 텍스트 영역 너비
const GAP_WIDTH = 20; // ASCII 아트와 텍스트 사이 간격

// ASCII 아트 (각 줄)
const ASCII_ART = [
  '        _)/_       ',
  "       (_' <       ",
  '         )(_       ',
  "   ,--.''-`'.      ",
  "  :.'  :  =- :     ",
  '  |:   | ._|]|     ',
  '  |____|_____|     ',
  ' /.:. /-_-_/       ',
  '(.:: / |=|         ',
  " `--'  |=|         ",
  '       |=| Hi,there',
];

/**
 * 라벨과 값 사이를 점(·)으로 패딩
 * @param {string} label - 라벨 (예: "Email:")
 * @param {string} value - 값 (예: "bgk614@gmail.com")
 * @returns {string} - 패딩된 문자열
 */
function padLine(label, value) {
  const totalLen = LINE_WIDTH;
  const prefixedLabel = '. ' + label;
  const contentLen = prefixedLabel.length + value.length;
  const dotsLen = totalLen - contentLen;
  const dots = '·'.repeat(Math.max(0, dotsLen));
  return `${prefixedLabel}${dots}${value}`;
}

/**
 * 섹션 헤더 생성 (예: "Bogyeong Kim ---..." 또는 "- Contact ---...")
 * @param {string} title - 섹션 제목
 * @returns {string} - LINE_WIDTH에 맞춘 헤더
 */
function sectionHeader(title) {
  const dashes = '-'.repeat(Math.max(0, LINE_WIDTH - title.length - 1));
  return `${title} ${dashes}`;
}

/**
 * 구분선 생성
 * @returns {string} - LINE_WIDTH 길이의 구분선
 */
function separator() {
  return '-'.repeat(LINE_WIDTH);
}

/**
 * ASCII 아트와 텍스트 라인들을 합쳐서 출력
 * @param {string[]} textLines - 오른쪽에 표시할 텍스트 라인들
 * @returns {string} - 합쳐진 결과
 */
function combineWithAscii(textLines) {
  const artWidth = ASCII_ART[0].length;
  const emptyArt = ' '.repeat(artWidth);
  const gap = ' '.repeat(GAP_WIDTH);
  const maxLines = Math.max(ASCII_ART.length, textLines.length);
  const artOffset = maxLines - ASCII_ART.length; // 아트를 아래로 밀기 위한 오프셋

  const result = [];
  for (let i = 0; i < maxLines; i++) {
    const artIndex = i - artOffset;
    const artLine = artIndex >= 0 ? ASCII_ART[artIndex] : emptyArt;
    const textLine = textLines[i] || '';
    result.push(artLine + gap + textLine);
  }
  return result.join('\n');
}

/**
 * 숫자에 천 단위 콤마 추가
 * @param {number} num - 숫자
 * @returns {string} - 콤마가 추가된 문자열
 */
function formatNumber(num) {
  return num.toLocaleString('en-US');
}

/**
 * README.md 파일 생성
 * @param {object} stats - GitHub 통계 데이터
 */
function updateReadme(stats) {
  const loc = stats.additions + stats.deletions;
  const locValue = `${formatNumber(loc)} (${formatNumber(
    stats.additions,
  )}++, ${formatNumber(stats.deletions)}--)`;
  const reposValue = `${formatNumber(stats.repos)}`;
  const commitsValue = `${formatNumber(stats.totalCommits)}`;
  const issuesValue = `${formatNumber(stats.issues)}`;
  const prsValue = `${formatNumber(stats.pullRequests)}`;
  const ossValue = `${formatNumber(stats.openSourceContributions)}`;

  // 오픈소스 PR 데이터
  const ossPRs = stats.openSourcePRs;

  const textLines = [
    sectionHeader('Bogyeong Kim'),
    padLine('Languages:', 'JavaScript, TypeScript'),
    padLine('Skills:', 'Node.js, Express, Prisma, PostgreSQL'),
    '',
    sectionHeader('- Contact'),
    padLine('Email:', 'bgk614@gmail.com'),
    padLine('Email:', 'me@bgk.dev'),
    padLine('LinkedIn:', 'bgk614'),
    padLine('Blog:', 'https://bgk.dev'),
    '',
    sectionHeader('- GitHub Stats'),
    padLine('Contributes:', ossValue),
    padLine('Repositories:', reposValue),
    padLine('Commits:', commitsValue),
    padLine('Issues:', issuesValue),
    padLine('Pull Requests:', prsValue),
    padLine('Lines of Code:', locValue),
    '',
    sectionHeader('- Open Source PRs'),
    padLine('☐ In Progress:', String(ossPRs.open.length)),
    padLine('☑ Merged:', String(ossPRs.merged.length)),
    padLine('⌧ Closed:', String(ossPRs.closed.length)),
    separator(),
  ];

  // 레포별로 PR 그룹화
  const allPRs = [
    ...ossPRs.open.map((pr) => ({ ...pr, status: '☐' })),
    ...ossPRs.merged.map((pr) => ({ ...pr, status: '☑' })),
    ...ossPRs.closed.map((pr) => ({ ...pr, status: '◻' })),
  ];

  const prsByRepo = {};
  for (const pr of allPRs) {
    if (!prsByRepo[pr.repo]) {
      prsByRepo[pr.repo] = [];
    }
    prsByRepo[pr.repo].push(pr);
  }

  // PR 목록 생성 (마크다운 형식)
  let prList = '';
  for (const [repo, prs] of Object.entries(prsByRepo)) {
    prList += `\n**${repo}**<br>\n`;
    for (const pr of prs) {
      prList += `  ${pr.status} [#${pr.number}](${pr.url}) ${pr.title}<br>\n`;
    }
  }

  const readme = `\`\`\`text
${combineWithAscii(textLines)}
\`\`\`
${prList}`;
  fs.writeFileSync('README.md', readme, 'utf8');
  console.log('README.md 업데이트 완료!');
}

module.exports = { updateReadme };
