#!/usr/bin/env node

// Workaround for ES module as bin script

import('../app.js').catch((err) => { console.error(err); process.exit(1) });
