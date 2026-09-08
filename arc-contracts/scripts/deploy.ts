import { ethers, run } from "hardhat";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// Deployment configuration
const DEPLOY_CONFIG = {
  network: "arcTestnet",
  verify: true,
  saveAddress: true,
};

async function main() {
  console.log("\n🚀 =========================================");
  console.log("   CACKPASS ARC PAYMENT CONTRACT DEPLOYMENT");
  console.log("   =========================================\n");

  // Get the deployer's wallet
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  
  console.log(`📡 Deployer Address: ${deployer.address}`);
  console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} USDC`);
  console.log(`🔗 Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`⛓️  Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
  console.log(`📦 Balance (wei): ${balance.toString()}\n`);

  // Check balance
  if (balance === 0n) {
    console.error("❌ ERROR: Deployer has zero balance!");
    console.log("   Please fund your wallet with USDC from the Arc faucet:");
    console.log("   https://faucet.circle.com\n");
    process.exit(1);
  }

  // Deploy the contract
  console.log("⏳ Deploying CackPassArcPayment contract...");
  
  const ContractFactory = await ethers.getContractFactory("CackPassArcPayment");
  const contract = await ContractFactory.deploy();
  await contract.waitForDeployment();
  
  const address = await contract.getAddress();
  console.log(`✅ Contract deployed to: ${address}`);

  // Get deployment transaction
  const deploymentTx = contract.deploymentTransaction();
  if (deploymentTx) {
    console.log(`📝 Deployment TX: ${deploymentTx.hash}`);
    console.log(`🔗 Explorer: https://testnet.arcscan.app/tx/${deploymentTx.hash}`);
  }

  // Log contract details
  console.log("\n📋 Contract Details:");
  console.log(`   Address: ${address}`);
  console.log(`   Platform Owner: ${await contract.platformOwner()}`);
  console.log(`   Platform Fee: ${await contract.platformFeeBps()} bps (${Number(await contract.platformFeeBps()) / 100}%)`);
  console.log(`   Block Number: ${await ethers.provider.getBlockNumber()}`);

  // Save deployment info to file
  if (DEPLOY_CONFIG.saveAddress) {
    const deploymentInfo = {
      network: DEPLOY_CONFIG.network,
      contractAddress: address,
      platformOwner: await contract.platformOwner(),
      platformFeeBps: Number(await contract.platformFeeBps()),
      deploymentBlock: await ethers.provider.getBlockNumber(),
      deploymentTx: deploymentTx?.hash || "N/A",
      timestamp: new Date().toISOString(),
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filePath = path.join(deploymentsDir, `arc-${Date.now()}.json`);
    fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`\n💾 Deployment info saved to: ${filePath}`);
  }

  // Verify the contract
  if (DEPLOY_CONFIG.verify) {
    console.log("\n🔍 Verifying contract on Arc Explorer...");
    console.log("   ⏳ Waiting 30 seconds for block confirmation...");
    
    // Wait for block confirmation
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      await run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
      console.log(`🔗 https://testnet.arcscan.app/address/${address}#code`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Contract is already verified!");
      } else {
        console.error("❌ Verification failed:", error.message);
        console.log("   You can manually verify with:");
        console.log(`   npx hardhat verify --network arcTestnet ${address}`);
      }
    }
  }

  // ──────────────────────────────────────────────
  // Test the contract
  // ──────────────────────────────────────────────
  console.log("\n🧪 Testing contract functions...");
  
  try {
    // Test 1: Check platform owner
    const owner = await contract.platformOwner();
    console.log(`   ✅ Platform owner: ${owner}`);
    
    // Test 2: Check platform fee
    const fee = await contract.platformFeeBps();
    console.log(`   ✅ Platform fee: ${Number(fee) / 100}%`);
    
    // Test 3: Create a test payment
    const testPaymentId = ethers.id("test-deployment-" + Date.now());
    const testEventId = ethers.id("test-event-123");
    const testAmount = ethers.parseUnits("10", 18);
    
    console.log("\n   📝 Creating test payment...");
    const tx = await contract.initializePayment(
      testPaymentId,
      testAmount,
      "DEPLOYMENT-TEST",
      testEventId,
      1
    );
    await tx.wait();
    
    const payment = await contract.getPayment(testPaymentId);
    console.log(`   ✅ Test payment created: ${payment.paymentId}`);
    console.log(`   📊 Status: ${await contract.getPaymentStatus(testPaymentId)}`);
    
  } catch (error: any) {
    console.log(`   ⚠️ Test failed: ${error.message}`);
  }

  // ──────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────
  console.log("\n🎉 =========================================");
  console.log("   DEPLOYMENT COMPLETE!");
  console.log("   =========================================");
  console.log(`\n📌 Contract Address: ${address}`);
  console.log(`🔗 Explorer: https://testnet.arcscan.app/address/${address}`);
  console.log("\n📚 Next Steps:");
  console.log(`   1. Add the contract address to your .env:`);
  console.log(`      ARC_CONTRACT_ADDRESS=${address}`);
  console.log(`   2. Update your frontend with the new address`);
  console.log(`   3. Test the integration with your CACK-pass app`);
  console.log("\n✅ Done!\n");
}

// Run deployment with error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });