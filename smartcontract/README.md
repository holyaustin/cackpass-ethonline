# CackPassArcPayment - Hardhat Implementation

Complete Hardhat implementation for deploying the CackPassArcPayment smart contract to Arc Testnet.

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
