/**
 * README 생성 및 업데이트
 */

const fs = require('fs');
const sharp = require('sharp');

const LINE_WIDTH = 55;
const ICON_CACHE_PATH = 'cache/icon-cache.json';

/**
 * 라벨과 값 사이를 점(·)으로 패딩
 */
const padLine = (label, value) => {
  const totalLen = LINE_WIDTH;
  const prefixedLabel = '. ' + label;
  const contentLen = prefixedLabel.length + value.length;
  const dotsLen = totalLen - contentLen - 2;
  const dots = '·'.repeat(Math.max(0, dotsLen));
  return `${prefixedLabel} ${dots} ${value}`;
};

/**
 * 섹션 헤더 생성
 */
const sectionHeader = (title) => {
  const dashes = '-'.repeat(Math.max(0, LINE_WIDTH - title.length - 1));
  return `${title} ${dashes}`;
};

/**
 * 구분선 생성
 */
const separator = () => '-'.repeat(LINE_WIDTH);

/**
 * 숫자에 천 단위 콤마 추가
 */
const formatNumber = (num) => num.toLocaleString('en-US');

// 아이콘 색상 설정 (0-255)
const ICON_COLOR = { r: 7, g: 105, b: 218 };

/**
 * 이미지를 지정된 색상으로 변환 후 base64로 인코딩
 */
const getImageBase64Colored = async (imagePath) => {
  const { r, g, b } = ICON_COLOR;
  const img = sharp(imagePath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

  // 각 픽셀의 RGB를 원하는 색상으로 치환, 알파는 유지
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  const buffer = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
  return buffer.toString('base64');
};

/**
 * icons 폴더의 모든 PNG 파일 목록 가져오기
 */
const getIconFiles = () => {
  const iconsDir = 'assets/icons';
  const files = fs.readdirSync(iconsDir);
  return files
    .filter((file) => file.endsWith('.png'))
    .map((file) => `${iconsDir}/${file}`);
};

/**
 * 아이콘 캐시가 유효한지 확인
 */
const isIconCacheValid = (iconFiles) => {
  if (!fs.existsSync(ICON_CACHE_PATH)) return false;

  const cacheStat = fs.statSync(ICON_CACHE_PATH);
  for (const file of iconFiles) {
    const iconStat = fs.statSync(file);
    if (iconStat.mtime > cacheStat.mtime) return false;
  }
  return true;
};

/**
 * 아이콘 base64 캐시 로드 또는 생성
 */
const getIconBase64Cache = async (iconFiles) => {
  if (isIconCacheValid(iconFiles)) {
    const cache = JSON.parse(fs.readFileSync(ICON_CACHE_PATH, 'utf8'));
    console.log('아이콘 캐시 사용');
    return cache;
  }

  console.log('아이콘 캐시 생성 중...');
  const cache = {};
  for (const file of iconFiles) {
    cache[file] = await getImageBase64Colored(file);
  }
  fs.mkdirSync('cache', { recursive: true });
  fs.writeFileSync(ICON_CACHE_PATH, JSON.stringify(cache), 'utf8');
  return cache;
};

/**
 * 텍스트 라인들을 SVG로 변환 (왼쪽에 움직이는 아이콘들, 오른쪽에 텍스트)
 */
const generateSvg = async (textLines) => {
  const lineHeight = 20;
  const padding = 20;
  const textPaddingRight = 40; // 텍스트 오른쪽 패딩
  const width = 1000; // 가로 1000px 고정
  const textAreaWidth = 500;
  const textHeight = textLines.length * lineHeight;
  const contentHeight = textHeight; // 텍스트 높이 기준
  const height = padding + contentHeight + padding;

  // 텍스트: 오른쪽 정렬 + 수직 중앙 정렬
  const textEndX = width - textPaddingRight;
  const textStartY = padding + (contentHeight - textHeight) / 2;

  // 아이콘: 남은 공간(왼쪽)에서 수평/수직 중앙 정렬
  const iconSpaceWidth = width - textAreaWidth - textPaddingRight;

  const escapeXml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const textElements = textLines
    .map((line, i) => {
      const y = textStartY + (i + 1) * lineHeight;
      return `    <text x="${textEndX}" y="${y}" fill="#1a1a1a" text-anchor="end">${escapeXml(line)}</text>`;
    })
    .join('\n');

  // 모든 아이콘 파일 로드 (캐시 사용)
  const iconFiles = getIconFiles();
  const iconCache = await getIconBase64Cache(iconFiles);
  const cols = 3;
  const rows = 4;
  const iconSize = 55;
  const iconGap = 40;
  const gridWidth = cols * iconSize + (cols - 1) * iconGap;
  const gridHeight = rows * iconSize + (rows - 1) * iconGap;
  const iconStartX = padding + (iconSpaceWidth - gridWidth) / 2; // 수평 중앙
  const actualIconStartY = padding + (contentHeight - gridHeight) / 2; // 수직 중앙

  // 각 아이콘의 애니메이션 설정 (가로 3개, 세로 4개 배치)
  const iconConfigs = iconFiles.map((_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const startX = iconStartX + col * (iconSize + iconGap);
    const startY = actualIconStartY + row * (iconSize + iconGap);
    const moveX = ((i % 3) - 1) * 10;
    const moveY = (i % 2 === 0 ? 1 : -1) * 5;
    const duration = 3 + (i % 4);
    return { startX, startY, moveX, moveY, duration };
  });

  // CSS 애니메이션 생성
  const keyframes = iconConfigs
    .map(
      (config, i) => `
    @keyframes float${i} {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(${config.moveX}px, ${config.moveY}px); }
    }`,
    )
    .join('\n');

  // 아이콘 이미지 요소 생성 (캐시된 base64 사용)
  const iconElements = iconFiles
    .map((file, i) => {
      const base64 = iconCache[file];
      const config = iconConfigs[i];
      return `    <image class="icon icon${i}" x="${config.startX}" y="${config.startY}" width="${iconSize}" height="${iconSize}" href="data:image/png;base64,${base64}"/>`;
    })
    .join('\n');

  // 아이콘 스타일 생성
  const iconStyles = iconConfigs
    .map((config, i) => {
      return `.icon${i} { animation: float${i} ${config.duration}s ease-in-out infinite; }`;
    })
    .join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}">
  <style>
    text {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 14px;
    }
    .icon {
      transform-origin: center;
    }
    ${iconStyles}
    ${keyframes}
  </style>
  <rect width="100%" height="100%" fill="#F7F8FA" rx="8"/>
${iconElements}
${textElements}
</svg>`;
};

/**
 * README.md 파일 생성
 */
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
    padLine('☐ In Progress:', String(ossPRs.open.length)),
    padLine('☑ Merged:', String(ossPRs.merged.length)),
    padLine('⌧ Closed:', String(ossPRs.closed.length)),
    separator(),
  ];

  // SVG 생성 및 저장
  const svg = await generateSvg(textLines);
  fs.writeFileSync('assets/stats.svg', svg, 'utf8');

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
    prList += `\n**${repo}**<br>\n`;
    for (const pr of prs) {
      prList += `  ${pr.status} [#${pr.number}](${pr.url}) ${pr.title}<br>\n`;
    }
  }

  const readme = `![stats](assets/stats.svg)
${prList}`;

  fs.writeFileSync('README.md', readme, 'utf8');
  console.log('README.md 업데이트 완료!');
};

module.exports = { updateReadme };
