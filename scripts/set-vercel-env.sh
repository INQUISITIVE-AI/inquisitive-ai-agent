#!/bin/bash
# Sets all required Vercel production env vars for inquisitive-ai-agent
set -e

SCOPE="inquisitive-ais-projects"
ENV="production"

add_env() {
  local key="$1"
  local val="$2"
  echo "Setting $key..."
  printf "%s" "$val" | vercel env add "$key" "$ENV" --scope "$SCOPE" --force 2>&1 | tail -1
}

# ── Token Economics ──────────────────────────────────────────
add_env "NEXT_PUBLIC_PRESALE_PRICE"    "8"
add_env "NEXT_PUBLIC_TARGET_PRICE"     "15"
add_env "NEXT_PUBLIC_TARGET_APY"       "0.185"
add_env "NEXT_PUBLIC_TOTAL_SUPPLY"     "100000000"

# ── Contract Addresses ────────────────────────────────────────
add_env "INQUISITIVE_VAULT_ADDRESS"         "0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb"
add_env "NEXT_PUBLIC_VAULT_ADDRESS"         "0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb"
add_env "INQAI_TOKEN_ADDRESS"               "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5"
add_env "NEXT_PUBLIC_INQAI_TOKEN_ADDRESS"   "0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5"
add_env "DEPLOYER_ADDRESS"                  "0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746"

# ── Payment Addresses ────────────────────────────────────────
add_env "PAYMENT_BTC_ADDRESS"  "bc1q54tccqs2z3gp74pdatfnfucrzxuv2755fq6cfg"
add_env "PAYMENT_SOL_ADDRESS"  "7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk"
add_env "PAYMENT_TRX_ADDRESS"  "TDSkgbhuMAHChDw6kGCLJmM9v7PPMJgHJA"

# ── Wallet Connect ────────────────────────────────────────────
add_env "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" "d9390e89fa6f82be32c7b64211d743d4"
add_env "NEXT_PUBLIC_REOWN_PROJECT_ID"         "d9390e89fa6f82be32c7b64211d743d4"

# ── API Keys ──────────────────────────────────────────────────
add_env "ETHERSCAN_API_KEY"  "M7JK1GRX6FI3XCNFP7X82RHF39SX66NVGX"
add_env "CMC_API_KEY"        "cmc_a402qb54f8e944e1855a830544ed6ad4"
add_env "MAINNET_RPC_URL"    "https://eth.llamarpc.com"

# ── Runtime ──────────────────────────────────────────────────
add_env "NODE_ENV"  "production"

echo ""
echo "✅ All env vars set. Triggering redeploy..."
vercel --prod --scope "$SCOPE" --yes 2>&1 | tail -5
