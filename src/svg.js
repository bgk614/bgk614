const { getIconFiles, getIconBase64Cache } = require('./utils/icon');

const THEMES = {
  light: {
    bg: '#F7F8FA',
    text: '#1a1a1a',
    dots: '#a0a0a0',
    add: '#1a7f37',
    del: '#cf222e',
    open: '#1a7f37',
    merged: '#8250df',
    closed: '#cf222e',
  },
  dark: {
    bg: '#262C36',
    text: '#f0f0f0',
    dots: '#6e7681',
    add: '#3fb950',
    del: '#f85149',
    open: '#3fb950',
    merged: '#a371f7',
    closed: '#f85149',
  },
};

const generateSvg = async (textLines, theme = 'light') => {
  const colors = THEMES[theme];
  const lineHeight = 20;
  const padding = 20;
  const textPaddingRight = 40;
  const width = 1000;
  const textAreaWidth = 500;
  const textHeight = textLines.length * lineHeight;
  const contentHeight = textHeight;
  const height = padding + contentHeight + padding;

  const textEndX = width - textPaddingRight;
  const textStartY = padding + (contentHeight - textHeight) / 2;
  const iconSpaceWidth = width - textAreaWidth - textPaddingRight;

  const escapeXml = (str) =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const colorize = (line) => {
    let result = escapeXml(line);
    result = result.replace(/(·+)/g, `<tspan fill="${colors.dots}">$1</tspan>`);
    result = result.replace(/([\d,]+\+\+)/g, `<tspan fill="${colors.add}">$1</tspan>`);
    result = result.replace(/([\d,]+--)/g, `<tspan fill="${colors.del}">$1</tspan>`);
    result = result.replace(/☐/g, `<tspan fill="${colors.open}">☐</tspan>`);
    result = result.replace(/☑/g, `<tspan fill="${colors.merged}">☑</tspan>`);
    result = result.replace(/⌧/g, `<tspan fill="${colors.closed}">⌧</tspan>`);
    return result;
  };

  const textElements = textLines
    .map((line, i) => {
      const y = textStartY + (i + 1) * lineHeight;
      return `    <text x="${textEndX}" y="${y}" text-anchor="end">${colorize(line)}</text>`;
    })
    .join('\n');

  const iconFiles = getIconFiles();
  const iconCache = await getIconBase64Cache(iconFiles);
  const cols = 3;
  const rows = 4;
  const iconSize = 55;
  const iconGap = 40;
  const gridWidth = cols * iconSize + (cols - 1) * iconGap;
  const gridHeight = rows * iconSize + (rows - 1) * iconGap;
  const iconStartX = padding + (iconSpaceWidth - gridWidth) / 2;
  const actualIconStartY = padding + (contentHeight - gridHeight) / 2;

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

  const keyframes = iconConfigs
    .map(
      (config, i) => `
    @keyframes float${i} {
      0%, 100% { transform: translate(0, 0); }
      50% { transform: translate(${config.moveX}px, ${config.moveY}px); }
    }`,
    )
    .join('\n');

  const iconElements = iconFiles
    .map((file, i) => {
      const base64 = iconCache[file];
      const config = iconConfigs[i];
      return `    <image class="icon icon${i}" x="${config.startX}" y="${config.startY}" width="${iconSize}" height="${iconSize}" href="data:image/png;base64,${base64}"/>`;
    })
    .join('\n');

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
      fill: ${colors.text};
    }
    .icon {
      transform-origin: center;
    }
    ${iconStyles}
    ${keyframes}
  </style>
  <rect width="100%" height="100%" fill="${colors.bg}" rx="8"/>
${iconElements}
${textElements}
</svg>`;
};

module.exports = { generateSvg };
