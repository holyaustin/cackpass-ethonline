// scripts/test-setup.js
const { ethers } = require('ethers');
require('dotenv').config({ path: '.env.local' });

console.log('🔧 Testing blockchain setup...\n');

// Check environment variables
console.log('📋 Environment variables check:');

const requiredVars = [
  'GASLESS_PRIVATE_KEY',
  'PINATA_JWT',
  'NEXT_PUBLIC_CACKPASS_CORE_ADDRESS',
  'MONGODB_URI',
  'PRIVY_APP_SECRET',
  'NEXT_PUBLIC_PRIVY_APP_ID'
];

let allVarsPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${varName.includes('PRIVATE_KEY') ? '***SET***' : value.substring(0, 20) + '...'}`);
  } else {
    console.log(`❌ ${varName}: MISSING`);
    allVarsPresent = false;
  }
});

console.log('\n');

// Check if we can create a wallet
try {
  const wallet = ethers.Wallet.createRandom();
  console.log('✅ Wallet generation works');
  console.log('   Address:', wallet.address);
  console.log('   Private Key:', wallet.privateKey.substring(0, 10) + '...');
  console.log('');
} catch (error) {
  console.log('❌ Wallet generation failed:', error.message);
}

// Validate GASLESS_PRIVATE_KEY
const gaslessPrivateKey = process.env.GASLESS_PRIVATE_KEY;
if (gaslessPrivateKey) {
  try {
    const gaslessWallet = new ethers.Wallet(gaslessPrivateKey);
    console.log('✅ GASLESS_PRIVATE_KEY is valid');
    console.log('   Address:', gaslessWallet.address);
    console.log('   (This wallet needs ETH for gas fees)\n');
  } catch (error) {
    console.log('❌ GASLESS_PRIVATE_KEY is invalid:', error.message);
  }
}

// Validate contract address
const contractAddress = process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS;
if (contractAddress) {
  if (ethers.isAddress(contractAddress)) {
    console.log('✅ Contract address is valid:', contractAddress);
  } else {
    console.log('❌ Contract address is invalid:', contractAddress);
  }
}

console.log('\n💡 Next steps:');
console.log('1. Run: npm run dev');
console.log('2. Visit: http://localhost:3000/dashboard/create-ticket');
console.log('3. Test with a free event first');
console.log('4. Then test with a paid event (requires funded wallet)');

if (allVarsPresent) {
  console.log('\n🎉 All required environment variables are present!');
} else {
  console.log('\n⚠️  Some environment variables are missing. Please check .env.local');
}