const fs = require('fs');
const sharp = require('sharp');

const ICON_CACHE_PATH = 'cache/icon-cache.json';
const ICON_COLOR = { r: 7, g: 105, b: 218 };

const getImageBase64Colored = async (imagePath) => {
  const { r, g, b } = ICON_COLOR;
  const img = sharp(imagePath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

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

const getIconFiles = () => {
  const iconsDir = 'assets/icons';
  const files = fs.readdirSync(iconsDir);
  return files
    .filter((file) => file.endsWith('.png'))
    .map((file) => `${iconsDir}/${file}`);
};

const isIconCacheValid = (iconFiles) => {
  if (!fs.existsSync(ICON_CACHE_PATH)) return false;

  const cacheStat = fs.statSync(ICON_CACHE_PATH);
  for (const file of iconFiles) {
    const iconStat = fs.statSync(file);
    if (iconStat.mtime > cacheStat.mtime) return false;
  }
  return true;
};

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

module.exports = { getIconFiles, getIconBase64Cache };
