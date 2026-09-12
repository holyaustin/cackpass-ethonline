const { ethers } = require('ethers');

const RPC_URL = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network';
const CONTRACT = process.env.NEXT_PUBLIC_ARC_CONTRACT_ADDRESS;

const ABI = [
  "function getPaymentStatus(bytes32 paymentId) external view returns (string)",
  "function paymentExists(bytes32 paymentId) external view returns (bool)",
];

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT, ABI, provider);

  // Replace with the actual paymentId from your DB
  const paymentId = '0x1716ea935edf3d9f32e65af4bf03e872a0bf6e1099dd5b2f60eb92b693894ac7';
  const paymentIdBytes = ethers.id(paymentId); // Convert to bytes32 if needed

  console.log('Contract:', CONTRACT);
  console.log('Payment ID:', paymentId);

  try {
    const exists = await contract.paymentExists(paymentIdBytes);
    console.log('Payment exists on-chain:', exists);

    if (exists) {
      const status = await contract.getPaymentStatus(paymentIdBytes);
      console.log('On-chain status:', status);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();