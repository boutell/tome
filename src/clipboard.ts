"use strict";

import properLockFile from 'proper-lockfile';
import fs from 'fs';

interface ClipboardParameters {
  stateFolder: string
}

export default class Clipboard {
  clipboardFile: string;
  clipboardLockFile: string;
  constructor({
    stateFolder
  } : ClipboardParameters) {
    this.clipboardFile = `${stateFolder}/clipboard.json`;
    this.clipboardLockFile = `${this.clipboardFile}.lock`;
  }
  async set(chars:Array<Array<string>>) {
    const release = await lock(this.clipboardLockFile);
    try {
      fs.writeFileSync(this.clipboardFile, JSON.stringify(chars));
    } finally {
      await release();
    }
  }
  async get():Promise<string[][] | false> {
    const release = await lock(this.clipboardLockFile);
    try {
      const clipboard = JSON.parse(fs.readFileSync(this.clipboardFile, 'utf8'));
      return clipboard;
    } catch (e: any) {      
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

function lock(filename:string) {
  return properLockFile.lock(filename, {
    retries: {
      retries: 30,
      factor: 1,
      minTimeout: 1000,
      maxTimeout: 1000
    },
    // Avoid chicken and egg problem when the file does not exist yet
    realpath: false
  });
}
