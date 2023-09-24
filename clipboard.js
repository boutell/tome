"use strict";

import fs from 'fs';

export default ({
  stateFolder,
  lock
}) => {
  const clipboardFile = `${stateFolder}/clipboard.json`;
  const clipboardLockFile = `${clipboardFile}.lock`;
  return {
    async set(chars) {
      const release = await lock(clipboardLockFile);
      try {
        fs.writeFileSync(clipboardFile, JSON.stringify(chars));
      } finally {
        await release();
      }
    },
    async get(chars) {
      const release = await lock(clipboardLockFile);
      try {
        const clipboard = JSON.parse(fs.readFileSync(clipboardFile));
        return clipboard;
      } catch (e) {
        if (e.code === 'ENOENT') {
          // No clipboard exists right now
          return false;
        }
        throw e;
      } finally {
        await release();
      }
    }
  };
};
