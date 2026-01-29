const { ethers } = require('ethers');

console.log('🔧 Testing blockchain setup...\n');

// Check if we can create a wallet
try {
  const wallet = ethers.Wallet.createRandom();
  console.log('✅ Wallet generation works');
  console.log('   Address:', wallet.address);
  console.log('   Private Key:', wallet.privateKey);
  console.log('   (Add this private key to .env.local as GASLESS_PRIVATE_KEY)\n');
} catch (error) {
  console.log('❌ Wallet generation failed:', error.message);
}

// Check environment variables
console.log('📋 Required environment variables:');
console.log('1. GASLESS_PRIVATE_KEY - for paying gas fees');
console.log('2. PINATA_JWT - for IPFS uploads');
console.log('3. NEXT_PUBLIC_CACKPASS_CORE_ADDRESS - your deployed contract');
console.log('4. MONGODB_URI - for database');
console.log('5. PRIVY_APP_SECRET - for authentication\n');

console.log('💡 Setup instructions:');
console.log('1. Generate a wallet with ethers.Wallet.createRandom()');
console.log('2. Fund it with test ETH from a faucet');
console.log('3. Deploy the CACKPassCore contract to Lisk Sepolia');
console.log('4. Get a Pinata JWT from https://app.pinata.cloud/developers');
console.log('5. Create a MongoDB database');
console.log('6. Create a Privy app at https://privy.io');