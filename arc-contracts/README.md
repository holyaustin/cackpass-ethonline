# CackPassArcPayment - Hardhat Implementation

Complete Hardhat implementation for deploying the CackPassArcPayment smart contract to Arc Testnet.

https://testnet.arcscan.app/address/0x5eB4Ddc89F2FEEf5e43eFb636189953C99Ab048a?tab=

npx hardhat verify --network arcTestnet 0x5eB4Ddc89F2FEEf5e43eFb636189953C99Ab048a "0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16"

🚀 ═══════════════════════════════════════════════════
   CACKPASS ARC REGISTRY DEPLOYMENT — Arc Mainnet
   ═══════════════════════════════════════════════════

📡 Deployer:        0x2fDC2261285fAe92e8151e10F47075c80Ea43cB1
💰 Balance:         1.0 USDC
🔗 Network:         Arc Mainnet
⛓️  Chain ID:        5042
🌐 Explorer:        https://arcscan.app

📋 Constructor arguments:
   initialPaymentProcessor: 0x2fDC2261285fAe92e8151e10F47075c80Ea43cB1
   platformOwner (deployer): 0x2fDC2261285fAe92e8151e10F47075c80Ea43cB1  ← becomes owner automatically

⏳ Deploying CackPassArcRegistry...
✅ Contract deployed to: 0x91dC7a39f918a8ADD25D89F25F8dB4205Db067e0
📝 Deployment TX:        0x2fe77639d823642071bb5cf2f98ee59da5ea54b616301f97e66cd8b31ebee9df
🔗 Explorer:             https://arcscan.app/tx/0x2fe77639d823642071bb5cf2f98ee59da5ea54b616301f97e66cd8b31ebee9df
📦 Block Number:         21893015

📋 Contract state:
   platformOwner:      0x2fDC2261285fAe92e8151e10F47075c80Ea43cB1
   paymentProcessor:   0x2fDC2261285fAe92e8151e10F47075c80Ea43cB1
   paused:             false

💾 Deployment artifact saved to:
   /home/augustineonuora/Dapps-Empty/2026/Sep2026/cackpass-ethonline/arc-contracts/deployments/arcMainnet-1789934853501.json
   /home/augustineonuora/Dapps-Empty/2026/Sep2026/cackpass-ethonline/arc-contracts/deployments/arcMainnet-latest.json

🔍 Verifying contract on explorer...
   ⏳ Waiting 30s for block confirmations...
⚠️ Verification failed: 

   Retry manually:
   npx hardhat verify --network arcMainnet 0x91dC7a39f918a8ADD25D89F25F8dB4205Db067e0 "0x2fDC2261285fAe92e8151e10F47075c80Ea43cB1"

🧪 Smoke test...
   ✅ getTotalBatches() = 0
   ✅ Contract is responsive and readable

🎉 ═══════════════════════════════════════════════════
   DEPLOYMENT COMPLETE
   ═══════════════════════════════════════════════════

📌 Contract Address:   0x91dC7a39f918a8ADD25D89F25F8dB4205Db067e0
🔗 Explorer:           https://arcscan.app/address/0x91dC7a39f918a8ADD25D89F25F8dB4205Db067e0
👤 platformOwner:      0x2fDC2261285fAe92e8151e10F47075c80Ea43cB1
🤖 paymentProcessor:   0x2fDC2261285fAe92e8151e10F47075c80Ea43cB1

📚 Next steps:
   1. Add to .env:
      NEXT_PUBLIC_ARC_REGISTRY_ADDRESS=0x91dC7a39f918a8ADD25D89F25F8dB4205Db067e0
   2. If you deployed from a hot wallet, rotate ownership:
      → call updatePlatformOwner(<coldWallet>) from the owner wallet
   3. Fund the paymentProcessor wallet with USDC for gas
   4. Update the backend client to use the new ABI

✅ Done!



## 📋 Project Structure

```
cack-pass-arc-payment/
├── contracts/
│   └── CackPassArcPayment.sol         # Main smart contract
├── scripts/
│   ├── deploy.js                      # Deployment script
│   └── interact.js                    # Contract interaction helper
├── test/
│   └── CackPassArcPayment.test.js     # Comprehensive test suite
├── deployments/                        # Deployment artifacts (auto-generated)
├── artifacts/                          # Compiled contracts (auto-generated)
├── hardhat.config.js                  # Hardhat configuration
├── package.json                        # Project dependencies
├── .env.example                        # Environment variables template
└── README.md                           # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Hardhat and all plugins
- Ethers.js v6
- Testing framework (Chai)
- Contract verification tools
- Gas reporter

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

**Required variables:**
```env
PRIVATE_KEY=your_private_key_without_0x_prefix
ARC_RPC_URL=https://rpc-testnet.arc.io
ARC_CHAIN_ID=1234
ARC_API_KEY=your_arc_explorer_api_key
```

### 3. Compile Smart Contract

```bash
npm run compile
```

This will:
- Compile Solidity code
- Generate ABI files
- Create contract artifacts in `artifacts/` directory

### 4. Run Tests (Optional)

```bash
# Run all tests
npm test

# Run tests with gas reporting
npm run gas-report

# Generate coverage report
npm run test:coverage
```

### 5. Deploy to Arc Testnet

```bash
npm run deploy:testnet
```

**Output:**
- Contract address
- Deployment transaction hash
- Deployment block number
- Deployment JSON saved to `deployments/arcTestnet-deployment.json`
- Contract ABI saved to `deployments/arcTestnet-CackPassArcPayment.abi.json`

## 📝 Contract Functions

### Payment Initialization

```solidity
function initializePayment(
    bytes32 paymentId,
    uint256 amount,
    string memory reference,
    bytes32 eventId,
    uint256 ticketQuantity
) external
```

Initialize a new payment. Called by the payer.

**Example:**
```bash
npx hardhat run scripts/interact.js --network arcTestnet init-payment \
  100 "CACK-001" "0x1234...5678" 5
```

### Payment Confirmation

```solidity
function confirmPayment(bytes32 paymentId) external onlyPlatformOwner
```

Confirm a pending payment. Only platform owner can call.

### Payment Failure

```solidity
function failPayment(bytes32 paymentId, string memory reason) external onlyPlatformOwner
```

Mark a payment as failed. Only platform owner can call.

### View Functions

```solidity
function getPayment(bytes32 paymentId) external view returns (Payment memory)
function getPaymentStatus(bytes32 paymentId) external view returns (string memory)
function getUserPayments(address user) external view returns (bytes32[] memory)
function getUserPaymentCount(address user) external view returns (uint256)
```

Get payment information.

### Admin Functions

```solidity
function updatePlatformFee(uint256 newFeeBps) external onlyPlatformOwner
function transferOwnership(address newOwner) external onlyPlatformOwner
```

Manage platform settings.

## 🔧 Using the Interaction Script

The `interact.js` script provides CLI interface for contract interaction.

### Get Contract Info

```bash
npx hardhat run scripts/interact.js --network arcTestnet info
```

### Initialize Payment

```bash
npx hardhat run scripts/interact.js --network arcTestnet init-payment \
  100 "CACK-001" "0xeventid123" 5
```

### Confirm Payment

```bash
npx hardhat run scripts/interact.js --network arcTestnet confirm \
  "0xpaymentid123"
```

### Get Payment Details

```bash
npx hardhat run scripts/interact.js --network arcTestnet get-payment \
  "0xpaymentid123"
```

### Get User Payment History

```bash
npx hardhat run scripts/interact.js --network arcTestnet get-user-payments \
  "0xUserAddress"
```

### Update Platform Fee

```bash
npx hardhat run scripts/interact.js --network arcTestnet update-fee 300
```

## 📊 Test Suite

Comprehensive test coverage includes:

- **Deployment Tests**: Verify correct initialization
- **Payment Initialization**: Test payment creation, validation, and fee calculation
- **Payment Confirmation**: Test payment approval workflow
- **Payment Failure**: Test payment rejection workflow
- **Status Management**: Test payment status tracking
- **Fee Management**: Test platform fee updates
- **Ownership Transfer**: Test ownership management
- **Edge Cases**: Test large amounts, small amounts, large quantities

Run tests:

```bash
# All tests
npm test

# With gas reporting
npm run gas-report

# With coverage
npm run test:coverage
```

## 🔐 Security Considerations

### Access Control
- Only platform owner can confirm/fail payments
- Only platform owner can update fees
- Only platform owner can transfer ownership

### Validation
- Payment IDs must be non-zero
- Amounts must be greater than 0
- References cannot be empty
- Ticket quantities must be greater than 0
- Fees capped at 10%

### State Management
- Payments can only be confirmed if pending
- Duplicate payment IDs are rejected
- User payment history is tracked

## 🌐 Arc Testnet Details

| Parameter | Value |
|-----------|-------|
| Network Name | Arc Testnet |
| RPC URL | https://rpc-testnet.arc.io |
| Chain ID | 1234 |
| Currency | USDC |
| Explorer | https://testnet.arcscan.app |
| Block Time | ~2-3 seconds |

## 📖 Contract Verification

Verify contract on Arc explorer:

```bash
npx hardhat verify --network arcTestnet \
  0xContractAddress
```

Or manually:
1. Go to https://testnet.arcscan.app
2. Search for contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Select compiler version: 0.8.19
6. Paste contract code
7. Submit

## 🛠️ Advanced Usage

### Local Testing

```bash
# Start local Hardhat node
npm run node

# In another terminal, deploy locally
npm run deploy:local
```

### Gas Analysis

```bash
npm run gas-report
```

Generates detailed gas usage report for all contract functions.

### Contract Flattening

```bash
npm run flatten
```

Creates flattened version for manual verification.

### Network Management

List available networks:

```bash
npx hardhat networks
```

### Debugging

Enable verbose logging:

```bash
DEBUG=hardhat* npx hardhat run scripts/deploy.js --network arcTestnet
```

## 📦 Deployment Artifacts

After successful deployment, these files are created:

### `deployments/arcTestnet-deployment.json`
```json
{
  "contractName": "CackPassArcPayment",
  "contractAddress": "0x...",
  "deployerAddress": "0x...",
  "platformOwner": "0x...",
  "platformFeeBps": "200",
  "transactionHash": "0x...",
  "network": "arcTestnet",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### `deployments/arcTestnet-CackPassArcPayment.abi.json`
Complete contract ABI for external integrations.

## 🚨 Troubleshooting

### Error: "Invalid private key"
- Ensure `PRIVATE_KEY` in `.env` doesn't have `0x` prefix
- Private key must be 64 characters (32 bytes)

### Error: "Not enough funds"
- Fund your account on Arc Testnet
- Check balance: `npx hardhat run scripts/interact.js info --network arcTestnet`

### Error: "Chain ID mismatch"
- Verify chain ID in `hardhat.config.js` matches Arc Testnet
- Current: 1234

### Error: "Contract verification failed"
- Ensure `ARC_API_KEY` is set in `.env`
- Wait a few blocks after deployment before verifying
- Check compiler version matches (0.8.19)

### Network Timeout
- Increase timeout in `hardhat.config.js`
- Check Arc RPC endpoint status
- Try alternative RPC endpoint

## 📚 Additional Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Solidity Documentation](https://docs.soliditylang.org/)
- [Ethers.js v6](https://docs.ethers.org/v6/)
- [Arc Testnet Docs](https://docs.arc.io)

## 📄 License

MIT License - See LICENSE file for details

## 👨‍💻 Development

### Adding New Functions

1. Update `contracts/CackPassArcPayment.sol`
2. Run `npm run compile`
3. Add tests in `test/CackPassArcPayment.test.js`
4. Run `npm test`
5. Deploy with `npm run deploy:testnet`

### Updating Tests

Tests use Chai assertions and Hardhat utilities:

```javascript
expect(value).to.equal(expected);
expect(call).to.emit(contract, "EventName");
expect(call).to.be.revertedWith("Error message");
```

## 🤝 Support

For issues or questions:
1. Check troubleshooting section above
2. Review test suite examples
3. Consult Hardhat documentation
4. Check Arc Testnet status

## ✅ Pre-Deployment Checklist

- [ ] `.env` configured with private key
- [ ] Arc Testnet faucet funded account
- [ ] `npm install` completed
- [ ] `npm test` passes
- [ ] `npm run compile` succeeds
- [ ] Contract ABI updated
- [ ] Deployment script tested locally
- [ ] Network configuration verified

## 🎉 Deployment Success

After successful deployment:

1. ✅ Contract deployed to Arc Testnet
2. ✅ Deployment info saved
3. ✅ Contract ABI available
4. ✅ Ready for integration
5. ✅ Can be verified on explorer

Start using:
```bash
npx hardhat run scripts/interact.js --network arcTestnet info
```




npm run deploy

> cack-pass-arc-payment@1.0.0 deploy
> npx hardhat run scripts/deploy.ts --network arcTestnet


🚀 =========================================
   CACKPASS ARC PAYMENT CONTRACT DEPLOYMENT
   =========================================

📡 Deployer Address: 0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16
💰 Deployer Balance: 20.0 USDC
🔗 Network: arcTestnet
⛓️  Chain ID: 5042002
📦 Balance (wei): 20000000000000000000

⏳ Deploying CackPassArcPayment contract...
✅ Contract deployed to: 0x084622e6970BBcBA510454C6145313c2993ED9E4
📝 Deployment TX: 0xcf960ead7c4406d59c8ee3cf41e2e1295ef32a16f1fb8d162527eca570e0f202
🔗 Explorer: https://testnet.arcscan.app/tx/0xcf960ead7c4406d59c8ee3cf41e2e1295ef32a16f1fb8d162527eca570e0f202

📋 Contract Details:
   Address: 0x084622e6970BBcBA510454C6145313c2993ED9E4
   Platform Owner: 0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16
   Platform Fee: 200 bps (2%)
   Block Number: 61151189

💾 Deployment info saved to: /home/augustineonuora/Dapps-Empty/2026/Sep2026/cackpass-ethonline/arc-contracts/deployments/arc-1788911894020.json

🔍 Verifying contract on Arc Explorer...
   ⏳ Waiting 30 seconds for block confirmation...
[WARNING] Network and explorer-specific api keys are deprecated in favour of the new Etherscan v2 api. Support for v1 is expected to end by May 31st, 2025. To migrate, please specify a single Etherscan.io api key the apiKey config value.
Successfully submitted source code for contract
contracts/CackPassArcPayment.sol:CackPassArcPayment at 0x084622e6970BBcBA510454C6145313c2993ED9E4
for verification on the block explorer. Waiting for verification result...

Successfully verified contract CackPassArcPayment on the block explorer.
https://testnet.arcscan.app/address/0x084622e6970BBcBA510454C6145313c2993ED9E4#code

✅ Contract verified successfully!
🔗 https://testnet.arcscan.app/address/0x084622e6970BBcBA510454C6145313c2993ED9E4#code

🧪 Testing contract functions...
   ✅ Platform owner: 0x2c3b2B2325610a6814f2f822D0bF4DAB8CF16e16
   ✅ Platform fee: 2%

   📝 Creating test payment...
   ✅ Test payment created: 0x0d0f682ef69f43a616f4a64b19d7976ad95592c4e0b2aa3020a729e8ff5735ed
   📊 Status: pending

🎉 =========================================
   DEPLOYMENT COMPLETE!
   =========================================

📌 Contract Address: 0x084622e6970BBcBA510454C6145313c2993ED9E4
🔗 Explorer: https://testnet.arcscan.app/address/0x084622e6970BBcBA510454C6145313c2993ED9E4

📚 Next Steps:
   1. Add the contract address to your .env:
      ARC_CONTRACT_ADDRESS=0x084622e6970BBcBA510454C6145313c2993ED9E4
   2. Update your frontend with the new address
   3. Test the integration with your CACK-pass app

✅ Done!

