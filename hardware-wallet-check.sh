#!/bin/bash

echo "🔐 HARDWARE WALLET DEPLOYMENT SCRIPT"
echo "===================================="

echo "📋 Checking prerequisites..."

# Check if Trezor Bridge is running
if pgrep -f "trezord" > /dev/null; then
    echo "✅ Trezor Bridge is running"
else
    echo "❌ Trezor Bridge is not running"
    echo "Please start Trezor Bridge manually"
fi

# Check if Trezor is connected
echo "🔍 Checking for Trezor device..."
python3 -c "
import sys
try:
    from trezorlib.transport.bridge import BridgeTransport
    transports = BridgeTransport.enumerate()
    if transports:
        print('✅ Trezor device found')
        for t in transports:
            print(f'   Device: {t}')
    else:
        print('❌ No Trezor device found')
        print('   Please connect your Trezor and unlock it')
except ImportError:
    print('❌ Trezor library not found')
    print('   Please install: pip3 install trezor')
except Exception as e:
    print(f'❌ Error: {e}')
" 2>/dev/null || echo "❌ Trezor library check failed"

echo ""
echo "🚀 Ready to deploy with command:"
echo "forge script script/MainnetDeploy.s.sol --rpc-url https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868 --broadcast --verify --trezor"

echo ""
echo "📋 Please ensure:"
echo "1. Trezor is connected via USB"
echo "2. Trezor is unlocked with PIN"
echo "3. Ethereum app is open on Trezor"
echo "4. No other wallet apps are running"
echo "5. You have sufficient ETH for gas fees"
