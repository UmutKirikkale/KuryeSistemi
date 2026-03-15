const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const channel = args[0] || 'preview';
const flags = new Set(args.filter((arg) => arg.startsWith('--')));
const note = args.filter((arg) => !arg.startsWith('--')).slice(1).join(' ').trim();

const allowedChannels = new Set(['preview', 'production']);
if (!allowedChannels.has(channel)) {
  console.error(`Unsupported channel: ${channel}`);
  console.error('Usage: node scripts/eas-update.js <preview|production> [note] [--dry-run]');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version || '0.0.0';

const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

const getGitSha = () => {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();
  } catch {
    return 'no-git';
  }
};

const sha = getGitSha();
const messageParts = [`${channel}`, `v${version}`, timestamp, sha];
if (note) {
  messageParts.push(note);
}
const message = messageParts.join(' | ');

const commandArgs = ['eas-cli', 'update', '--channel', channel, '--message', message];

if (flags.has('--dry-run')) {
  console.log('Dry run command:');
  console.log(`npx ${commandArgs.map((part) => JSON.stringify(part)).join(' ')}`);
  process.exit(0);
}

const quotedArgs = commandArgs.map((part) => `"${String(part).replace(/"/g, '\\"')}"`).join(' ');

try {
  execSync(`npx ${quotedArgs}`, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: true
  });
  process.exit(0);
} catch (error) {
  process.exit(error && typeof error.status === 'number' ? error.status : 1);
}
