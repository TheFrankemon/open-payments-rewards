const major = Number.parseInt(process.version.slice(1).split(".")[0] ?? "0", 10);

if (major < 20) {
  console.error(
    `\nNode ${process.version} is too old for this project (need Node 20+).\n` +
      `Vite 6 fails with "crypto.getRandomValues is not a function" on Node 16.\n\n` +
      `Fix (pick one):\n` +
      `  volta install node@20   # if you use Volta (pinned in package.json)\n` +
      `  nvm use                 # uses web/.nvmrc\n` +
      `  fnm use                 # same .nvmrc\n`,
  );
  process.exit(1);
}
