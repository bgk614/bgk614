const LINE_WIDTH = 55;

const padLine = (label, value) => {
  const totalLen = LINE_WIDTH;
  const prefixedLabel = '. ' + label;
  const contentLen = prefixedLabel.length + value.length;
  const dotsLen = totalLen - contentLen - 2;
  const dots = '·'.repeat(Math.max(0, dotsLen));
  return `${prefixedLabel} ${dots} ${value}`;
};

const sectionHeader = (title) => {
  const dashes = '-'.repeat(Math.max(0, LINE_WIDTH - title.length - 1));
  return `${title} ${dashes}`;
};

const separator = () => '-'.repeat(LINE_WIDTH);

const formatNumber = (num) => num.toLocaleString('en-US');

module.exports = { LINE_WIDTH, padLine, sectionHeader, separator, formatNumber };
