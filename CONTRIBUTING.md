# Contributing to INQUISITIVE AI

Welcome. INQUISITIVE is built in public, and we believe open development produces better software faster. Every type of contribution matters — code, review, documentation, testing, and community building.

---

## The Mission

Institutional-grade AI portfolio management as a public right. If you believe that, you belong here.

---

## Getting Started

```bash
git clone https://github.com/INQUISITIVE-AI/inquisitive-ai-agent
cd inquisitive-ai-agent
npm install
cp .env.example .env
npm run dev
```

See [README.md](README.md) for full setup. The backend runs on port `3002`, frontend on `3000`.

---

## How to Contribute

### 1. Find Something to Work On

- Check [ROADMAP.md](ROADMAP.md) for open tasks
- Look for GitHub issues labeled `good first issue` or `help wanted`
- Spot a bug? File an issue before submitting a fix

### 2. Branch Naming

```
feat/your-feature-name
fix/bug-description
docs/what-you-updated
test/what-youre-testing
security/vulnerability-fix
```

### 3. Commit Style (Conventional Commits)

```
feat: add Uptime Robot health endpoint
fix: correct rate limit window for trade API
docs: update roadmap with Phase 3 blockers
test: add vault pause/unpause Foundry tests
security: restrict performUpkeep to onlyKeeper
```

### 4. Pull Requests

- Keep PRs focused — one thing per PR
- Reference the issue it closes: `Closes #42`
- PRs touching `contracts/` require at least one reviewer
- All CI checks must pass before merge

---

## Areas to Contribute

### Smart Contracts (`contracts/`)
- Solidity + Foundry
- Peer review is welcome even without a PR — leave comments on the code
- Tests live in `test/` — we target 20+ test cases per contract
- Run: `forge test -vv`

### Backend (`server/`)
- Node.js / Express
- Services: `priceFeed.js`, `inquisitiveBrain.js`, `tradingEngine.js`, `macroData.js`
- Run: `node server/index.js`
- Linting: `npm run lint`

### Frontend (`pages/`, `src/`)
- Next.js 14 + TypeScript + Tailwind
- Run: `npm run dev`
- Build check: `npm run build`

### Documentation
- Update `README.md`, `ROADMAP.md`, or in-page docs
- Add JSDoc to any undocumented functions
- Translations always welcome

### Security Review
- Read `contracts/InquisitiveVaultV2.sol` and `InquisitiveVaultUpdated.sol`
- Look for access control gaps, reentrancy, oracle manipulation
- Report via GitHub issue tagged `[SECURITY]`
- We are open to Code4rena / Sherlock contest participation

---

## Code Standards

- **Solidity**: NatSpec on all public/external functions, OpenZeppelin patterns preferred
- **JavaScript/TypeScript**: JSDoc on all service methods, no `any` types in new code
- **Tests**: Every new contract function needs a test; every new API endpoint needs a test
- **No secrets in code**: All credentials via environment variables only

---

## Non-Code Contributions

You don't need to write code to help:

- **Test the platform** — use [getinqai.com](https://getinqai.com) and file bug reports
- **Review PRs** — even a "looks good" or "I found an issue here" is valuable
- **Community audit** — peer review contracts and post findings as GitHub issues
- **Translation** — README, docs, and legal pages in your language
- **Share the mission** — the more eyes on this code, the more secure it becomes

---

## Security Policy

Report vulnerabilities via a GitHub issue titled `[SECURITY] <description>`.

Do **not** post exploit details publicly until we've had a chance to patch. We aim to respond within 48 hours.

---

## Weekly Dev Updates

We post weekly progress in GitHub releases or commit summaries. No marketing spin — just what shipped, what's blocked, and what's next. Follow the repo to stay in sync.

---

## Code of Conduct

- Be direct and honest
- Disagree on ideas, not on people
- Credit others' work
- Build toward the mission

---

## License

MIT. Your contributions are also MIT licensed. You keep your copyright.
