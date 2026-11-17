// server/src/utils/diff.js

/**
 * Line-based diff between two text bodies
 * Returns added and removed lines
 */
function computeDiff(oldText = '', newText = '') {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  const oldSet = new Set(oldLines);
  const newSet = new Set(newLines);

  const added = [];
  const removed = [];

  for (const line of newLines) {
    if (!oldSet.has(line)) {
      added.push(line);
    }
  }

  for (const line of oldLines) {
    if (!newSet.has(line)) {
      removed.push(line);
    }
  }

  return {
    added,
    removed,
  };
}

module.exports = {
  computeDiff,
};
