// scripts/deploy.ts
import { ethers, run, network } from "hardhat";
import * as dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

// ────────────────────────────────────────────────────────────
// Network-specific config
// ────────────────────────────────────────────────────────────
type NetworkKey = "arcTestnet" | "arcMainnet";

interface NetworkConfig {
  label: string;
  chainId: number;
  explorerUrl: string;
  faucetUrl?: string;
}

const NETWORKS: Record<NetworkKey, NetworkConfig> = {
  arcTestnet: {
    label: "Arc Testnet",
    chainId: 5042002,
    explorerUrl: "https://testnet.arcscan.app",
    faucetUrl: "https://faucet.circle.com",
  },
  arcMainnet: {
    label: "Arc Mainnet",
    chainId: 1135,
    explorerUrl: "https://arcscan.app",
  },
};

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────
function detectNetwork(): NetworkKey {
  const name = network.name;
  if (name === "arcMainnet") return "arcMainnet";
  return "arcTestnet";
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `Add it to your .env file before deploying.`
    );
  }
  return value.trim();
}

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// ────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────
async function main() {
  const networkKey = detectNetwork();
  const config = NETWORKS[networkKey];

  console.log("\n🚀 ═══════════════════════════════════════════════════");
  console.log(`   CACKPASS ARC REGISTRY DEPLOYMENT — ${config.label}`);
  console.log("   ═══════════════════════════════════════════════════\n");

  // ── Wallet ──
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  const netInfo = await ethers.provider.getNetwork();

  console.log(`📡 Deployer:        ${deployer.address}`);
  console.log(`💰 Balance:         ${ethers.formatEther(balance)} USDC`);
  console.log(`🔗 Network:         ${config.label}`);
  console.log(`⛓️  Chain ID:        ${netInfo.chainId}`);
  console.log(`🌐 Explorer:        ${config.explorerUrl}\n`);

  if (BigInt(netInfo.chainId) !== BigInt(config.chainId)) {
    console.warn(
      `⚠️  WARNING: Connected chain ID ${netInfo.chainId} does not match expected ${config.chainId} for ${config.label}.`
    );
  }

  if (balance === 0n) {
    console.error("❌ Deployer has zero balance.");
    if (config.faucetUrl) {
      console.log(`   Fund it at: ${config.faucetUrl}`);
    }
    process.exit(1);
  }

  // ── Constructor args ──
  const paymentProcessor = getRequiredEnv("PAYMENT_PROCESSOR_ADDRESS");

  if (!isValidAddress(paymentProcessor)) {
    throw new Error(
      `PAYMENT_PROCESSOR_ADDRESS is not a valid Ethereum address: ${paymentProcessor}`
    );
  }

  console.log("📋 Constructor arguments:");
  console.log(`   initialPaymentProcessor: ${paymentProcessor}`);
  console.log(
    `   platformOwner (deployer): ${deployer.address}  ← becomes owner automatically\n`
  );

  // ── Deploy ──
  console.log("⏳ Deploying CackPassArcRegistry...");

  const RegistryFactory = await ethers.getContractFactory("CackPassArcRegistry");
  const registry = await RegistryFactory.deploy(paymentProcessor);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const deployTx = registry.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait() : null;

  console.log(`✅ Contract deployed to: ${address}`);
  if (deployTx) {
    console.log(`📝 Deployment TX:        ${deployTx.hash}`);
    console.log(`🔗 Explorer:             ${config.explorerUrl}/tx/${deployTx.hash}`);
  }
  if (receipt) {
    console.log(`📦 Block Number:         ${receipt.blockNumber}`);
  }

  // ── Read back state ──
  console.log("\n📋 Contract state:");
  const owner = await registry.platformOwner();
  const processor = await registry.paymentProcessor();
  const paused = await registry.paused();

  console.log(`   platformOwner:      ${owner}`);
  console.log(`   paymentProcessor:   ${processor}`);
  console.log(`   paused:             ${paused}`);

  // ── Save deployment artifact ──
  const deploymentInfo = {
    network: networkKey,
    label: config.label,
    chainId: Number(netInfo.chainId),
    contractName: "CackPassArcRegistry",
    contractAddress: address,
    platformOwner: owner,
    paymentProcessor: processor,
    deployer: deployer.address,
    deploymentBlock: receipt?.blockNumber ?? null,
    deploymentTx: deployTx?.hash ?? null,
    explorerUrl: `${config.explorerUrl}/address/${address}`,
    constructorArgs: [paymentProcessor],
    timestamp: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const fileName = `${networkKey}-${Date.now()}.json`;
  const filePath = path.join(deploymentsDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));

  // Also write a "latest" file for easy lookups
  const latestPath = path.join(deploymentsDir, `${networkKey}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\n💾 Deployment artifact saved to:`);
  console.log(`   ${filePath}`);
  console.log(`   ${latestPath}`);

  // ── Verify ──
  const shouldVerify =
    process.env.SKIP_VERIFY !== "true" && networkKey !== "arcTestnet"
      ? true // verify on mainnet by default
      : process.env.SKIP_VERIFY !== "true"; // verify on testnet unless skipped

  if (shouldVerify && deployTx) {
    console.log("\n🔍 Verifying contract on explorer...");
    console.log("   ⏳ Waiting 30s for block confirmations...");
    await new Promise((resolve) => setTimeout(resolve, 30_000));

    try {
      await run("verify:verify", {
        address,
        constructorArguments: [paymentProcessor],
      });
      console.log("✅ Contract verified!");
      console.log(`🔗 ${config.explorerUrl}/address/${address}#code`);
    } catch (error: any) {
      const msg = error?.message ?? String(error);
      if (msg.includes("Already Verified") || msg.includes("already verified")) {
        console.log("✅ Contract already verified.");
      } else {
        console.error("⚠️ Verification failed:", msg);
        console.log("\n   Retry manually:");
        console.log(
          `   npx hardhat verify --network ${network.name} ${address} "${paymentProcessor}"`
        );
      }
    }
  } else {
    console.log("\n⏭️  Verification skipped (SKIP_VERIFY=true or not applicable).");
  }

  // ── Smoke test ──
  console.log("\n🧪 Smoke test...");
  try {
    const totalBatches = await registry.getTotalBatches();
    console.log(`   ✅ getTotalBatches() = ${totalBatches}`);
    console.log(`   ✅ Contract is responsive and readable`);
  } catch (err: any) {
    console.warn(`   ⚠️  Smoke test failed: ${err.message}`);
  }

  // ── Summary ──
  console.log("\n🎉 ═══════════════════════════════════════════════════");
  console.log("   DEPLOYMENT COMPLETE");
  console.log("   ═══════════════════════════════════════════════════");
  console.log(`\n📌 Contract Address:   ${address}`);
  console.log(`🔗 Explorer:           ${config.explorerUrl}/address/${address}`);
  console.log(`👤 platformOwner:      ${owner}`);
  console.log(`🤖 paymentProcessor:   ${processor}`);

  console.log("\n📚 Next steps:");
  console.log("   1. Add to .env:");
  console.log(`      NEXT_PUBLIC_ARC_REGISTRY_ADDRESS=${address}`);
  console.log("   2. If you deployed from a hot wallet, rotate ownership:");
  console.log(`      → call updatePlatformOwner(<coldWallet>) from the owner wallet`);
  console.log("   3. Fund the paymentProcessor wallet with USDC for gas");
  console.log("   4. Update the backend client to use the new ABI\n");

  console.log("✅ Done!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:\n", error);
    process.exit(1);
  });