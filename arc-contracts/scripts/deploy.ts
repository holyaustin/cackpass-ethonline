import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log("\n🚀 Deploying CackPassArcPayment to Arc Testnet...");
  console.log("=================================================");

  // Get the deployer's wallet
  const [deployer] = await ethers.getSigners();
  console.log(`📡 Deployer address: ${deployer.address}`);
  console.log(`💰 Deployer balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} USDC`);

  // Deploy the contract
  const ContractFactory = await ethers.getContractFactory("CackPassArcPayment");
  console.log("⏳ Deploying contract...");
  
  const contract = await ContractFactory.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log(`✅ Contract deployed to: ${address}`);
  console.log(`🔗 View on Arc Explorer: https://testnet.arcscan.app/address/${address}`);

  // Log deployment details
  console.log("\n📋 Deployment Details:");
  console.log(`   Network: Arc Testnet`);
  console.log(`   Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`   Block: ${await ethers.provider.getBlockNumber()}`);
  console.log(`   Platform Owner: ${await contract.platformOwner()}`);
  console.log(`   Platform Fee: ${await contract.platformFeeBps()} bps (${Number(await contract.platformFeeBps()) / 100}%)`);

  // Verify contract on Arc Explorer
  console.log("\n🔍 Verifying contract on Arc Explorer...");
  console.log("   Run the following command to verify:");
  console.log(`   npx hardhat verify --network arcTestnet ${address}`);
  
  console.log("\n✅ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });