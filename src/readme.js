const fs = require('fs');
const { padLine, sectionHeader, separator, formatNumber } = require('./utils/format');
const { generateSvg } = require('./svg');

const updateReadme = async (stats) => {
  const loc = stats.additions + stats.deletions;
  const locValue = `${formatNumber(loc)} (${formatNumber(
    stats.additions,
  )}++, ${formatNumber(stats.deletions)}--)`;
  const reposValue = `${formatNumber(stats.repos)}`;
  const commitsValue = `${formatNumber(stats.totalCommits)}`;
  const issuesValue = `${formatNumber(stats.issues)}`;
  const prsValue = `${formatNumber(stats.pullRequests)}`;
  const ossValue = `${formatNumber(stats.openSourceContributions)}`;

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
    padLine('☐ Open:', String(ossPRs.open.length)),
    padLine('☑ Merged:', String(ossPRs.merged.length)),
    padLine('⌧ Closed:', String(ossPRs.closed.length)),
    separator(),
  ];

  // SVG 생성 및 저장 (라이트/다크 모드)
  const svgLight = await generateSvg(textLines, 'light');
  const svgDark = await generateSvg(textLines, 'dark');
  fs.writeFileSync('assets/stats-light.svg', svgLight, 'utf8');
  fs.writeFileSync('assets/stats-dark.svg', svgDark, 'utf8');

  // 레포별로 PR 그룹화
  const allPRs = [
    ...ossPRs.open.map((pr) => ({ ...pr, status: '☐' })),
    ...ossPRs.merged.map((pr) => ({ ...pr, status: '☑' })),
    ...ossPRs.closed.map((pr) => ({ ...pr, status: '⌧' })),
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
    const [org, repoName] = repo.split('/');
    prList += `\n[**${org}**/**${repoName}**](https://github.com/${repo})<br>\n`;
    for (const pr of prs) {
      const title = pr.status === '⌧' ? `~~${pr.title}~~` : pr.title;
      prList += `  ${pr.status} ${title} <sup>[#${pr.number}](${pr.url})</sup><br>\n`;
    }
  }

  const readme = `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/stats-dark.svg">
  <img alt="stats" src="assets/stats-light.svg">
</picture>

---

### Open Source PRs
${prList}`;

  fs.writeFileSync('README.md', readme, 'utf8');
  console.log('README.md 업데이트 완료!');
};

module.exports = { updateReadme };
