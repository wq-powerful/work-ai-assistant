#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PYTHON_CANDIDATES = process.platform === 'win32'
  ? ['python', 'python3']
  : ['python3', 'python'];

const REPO_ROOT = path.resolve(__dirname, '..');

function getVirtualEnvCandidates() {
  const venvDir = path.join(REPO_ROOT, 'backend', '.venv');
  if (process.platform === 'win32') {
    return [path.join(venvDir, 'Scripts', 'python.exe')];
  }
  return [path.join(venvDir, 'bin', 'python')];
}

function resolvePythonCommand() {
  for (const command of getVirtualEnvCandidates()) {
    if (!fs.existsSync(command)) continue;
    const result = spawnSync(command, ['--version'], { stdio: 'ignore' });
    if (!result.error && result.status === 0) {
      return command;
    }
  }

  for (const command of PYTHON_CANDIDATES) {
    const result = spawnSync(command, ['--version'], { stdio: 'ignore' });
    if (!result.error && result.status === 0) {
      return command;
    }
  }

  throw new Error(`Python interpreter not found. Tried: ${PYTHON_CANDIDATES.join(', ')}`);
}

function runPython(args, options = {}) {
  const command = resolvePythonCommand();
  return spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node scripts/python-runner.js <python-args...>');
    process.exit(1);
  }

  const result = runPython(args, { cwd: process.cwd() });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  process.exit(result.status ?? 0);
}

module.exports = {
  resolvePythonCommand,
  runPython,
};
