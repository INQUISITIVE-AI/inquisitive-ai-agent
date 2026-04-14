# Contributing to INQUISITIVE AI

## Branching Strategy

- `main` — production, protected. Merges via PR only. CI must pass.
- `develop` — integration branch for feature work.
- `feature/<name>` — feature branches, branch from `develop`.
- `fix/<name>` — bug fix branches, branch from `main` or `develop`.

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add WebSocket subscription filtering
fix: correct CORS origin for production
docs: update README setup instructions
chore: bump dependencies
test: add vault pause mechanism tests
```

## Pull Request Process

1. Branch from `develop` (features) or `main` (hotfixes).
2. Ensure CI passes — all tests, lint, and build must be green.
3. Write or update tests for any changed behaviour.
4. Keep PRs focused — one concern per PR.
5. Request review from at least one maintainer before merging.

## Running Tests

```bash
# Solidity
forge test -vv

# Next.js build
npm run build

# Security audit
npm audit --audit-level=high
```

## Code Style

- **TypeScript/JavaScript:** ESLint config in `.eslintrc.*`. Run `npm run lint`.
- **Solidity:** Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html). All public functions must have NatSpec.
- No inline private keys, secrets, or real wallet addresses in committed code.

## Security

- Never commit `.env` files with real values.
- Any suspected security vulnerability: open a GitHub issue marked `[SECURITY]` or email the maintainer directly.

## Code of Conduct

Be respectful, constructive, and professional. Harassment of any kind will result in immediate removal.
