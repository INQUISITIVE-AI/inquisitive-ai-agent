# ON-CHAIN DEPLOYMENT INSTRUCTIONS

## Current Issues
1. **Vesting**: All 100M INQAI tokens are in your wallet - no vesting contract deployed
2. **Phase 2 Registry**: Not set on the new vault
3. **Data**: Showing simulated because vault isn't fully configured

## Deployment Steps

### 1. Deploy Team Vesting Contract
```bash
cd /Volumes/Mr.M&G5/CascadeProjects/windsurf-project/inquisitive-ai-agent
npx hardhat run scripts/deploy-vesting.js --network mainnet
```

This will:
- Deploy a 48-month vesting contract for 20M INQAI tokens
- Transfer 20M tokens to the vesting contract
- Start vesting immediately (linear vesting over 48 months)

### 2. Set Phase 2 Registry
```bash
npx hardhat run scripts/setup-phase2.js --network mainnet
```

This will register 33 cross-chain assets on the vault.

### 3. Deploy Everything (Combined)
```bash
npx hardhat run scripts/deploy-all.js --network mainnet
```

This runs both steps 1 and 2 in one command.

## What These Scripts Do

### Team Vesting Contract
- Deploys `TeamVesting.sol` which inherits from OpenZeppelin's `VestingWallet`
- Transfers 20M INQAI from your wallet to the vesting contract
- 48-month linear vesting starting immediately
- Team can claim vested tokens monthly via the contract

### Phase 2 Registry
- Registers 33 cross-chain assets on the vault
- Enables deBridge DLN integration for cross-chain swaps
- Assets include: SOL, JUP, BNB, AVAX, OP, TRX, XRP, ADA, and many more

## After Deployment

1. **Check vesting**: Visit the deployed vesting contract address on Etherscan
2. **Verify Phase 2**: Check that `getPhase2Length()` returns 33 on the vault
3. **Update UI**: The analytics page will show real on-chain data once vault is configured

## Environment Variables Required
```
PRIVATE_KEY=your_wallet_private_key
INFURA_PROJECT_ID=your_infura_id (or other RPC)
```

## Notes
- The vesting contract will hold 20M tokens and release them linearly over 48 months
- Your remaining 80M tokens stay in your wallet for other allocations
- Phase 2 assets use placeholder addresses - update receiver addresses as needed
- Gas costs will be significant for Phase 2 deployment (33 assets)

## Verification Commands
```javascript
// Check vesting contract balance
const balance = await INQAI.balanceOf(vestingAddress);

// Check vested amount
const vested = await vestingContract.vestedAmount(Math.floor(Date.now() / 1000), 0);

// Check Phase 2 length
const phase2Length = await vault.getPhase2Length();
```
