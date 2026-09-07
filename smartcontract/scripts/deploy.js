const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deployment configuration
const NETWORK = hre.network.name;
const DEPLOYMENT_LOG_FILE = path.join(__dirname, `../deployments/${NETWORK}-deployment.json`);

/**
 * Create deployments directory if it doesn't exist
 */
function ensureDeploymentsDir() {
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
}

/**
 * Log deployment information
 */
function logDeployment(deploymentInfo) {
  ensureDeploymentsDir();
  
  const timestamp = new Date().toISOString();
  const deploymentData = {
    ...deploymentInfo,
    network: NETWORK,
    timestamp: timestamp,
  };

  fs.writeFileSync(DEPLOYMENT_LOG_FILE, JSON.stringify(deploymentData, null, 2));
  console.log(`\n📋 Deployment info saved to: ${DEPLOYMENT_LOG_FILE}\n`);
}

/**
 * Get contract ABI
 */
function getContractABI() {
  const artifactPath = path.join(__dirname, "../artifacts/contracts/CackPassArcPayment.sol/CackPassArcPayment.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  return artifact.abi;
}

/**
 * Save contract ABI to file
 */
function saveContractABI(abi) {
  ensureDeploymentsDir();
  const abiPath = path.join(__dirname, `../deployments/${NETWORK}-CackPassArcPayment.abi.json`);
  fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
  console.log(`💾 Contract ABI saved to: ${abiPath}`);
}

/**
 * Main deployment function
 */
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("🚀 CackPassArcPayment Deployment Script");
  console.log("=".repeat(60));

  try {
    // Network information
    console.log(`\n📡 Network: ${NETWORK}`);
    console.log(`Chain ID: ${(await hre.ethers.provider.getNetwork()).chainId}`);

    // Get deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log(`\n👤 Deployer: ${deployer.address}`);

    // Get deployer balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    const balanceInEther = hre.ethers.formatEther(balance);
    console.log(`💰 Balance: ${balanceInEther} ETH/USDC`);

    // Check if sufficient balance
    if (balance < hre.ethers.parseEther("0.1")) {
      console.warn("\n⚠️  Warning: Low balance. Ensure you have enough funds for deployment.");
    }

    // Get gas price estimate
    const gasPrice = await hre.ethers.provider.getFeeData();
    console.log(`\n⛽ Gas Price: ${hre.ethers.formatUnits(gasPrice.gasPrice, "gwei")} gwei`);

    // Deploy contract
    console.log("\n" + "-".repeat(60));
    console.log("📦 Deploying CackPassArcPayment...");
    console.log("-".repeat(60) + "\n");

    const CackPassArcPayment = await hre.ethers.getContractFactory("CackPassArcPayment");
    const contract = await CackPassArcPayment.deploy();

    // Wait for deployment
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log("✅ Contract deployed successfully!");
    console.log(`\n📍 Contract Address: ${contractAddress}`);

    // Get deployment transaction
    const deploymentTx = contract.deploymentTransaction();
    if (deploymentTx) {
      console.log(`📝 Transaction Hash: ${deploymentTx.hash}`);
      console.log(`⛽ Gas Used: ${deploymentTx.gasLimit.toString()}`);
    }

    // Get platform owner
    const owner = await contract.platformOwner();
    console.log(`👑 Platform Owner: ${owner}`);

    // Get initial platform fee
    const platformFee = await contract.platformFeeBps();
    console.log(`💳 Platform Fee: ${platformFee.toString()} bps (${(platformFee / 100).toFixed(2)}%)`);

    // Save deployment information
    const deploymentInfo = {
      contractName: "CackPassArcPayment",
      contractAddress: contractAddress,
      deployerAddress: deployer.address,
      platformOwner: owner,
      platformFeeBps: platformFee.toString(),
      transactionHash: deploymentTx?.hash || "N/A",
      gasLimit: deploymentTx?.gasLimit.toString() || "N/A",
      deploymentBlock: deploymentTx?.blockNumber || "N/A",
    };

    logDeployment(deploymentInfo);

    // Get and save contract ABI
    console.log("\n📄 Saving Contract ABI...");
    const abi = getContractABI();
    saveContractABI(abi);

    // Display explorer link
    if (NETWORK === "arcTestnet") {
      console.log("\n🔗 Verification Links:");
      console.log(`   Arc Explorer: https://testnet.arcscan.app/address/${contractAddress}`);
      console.log(`   Verify Command: npx hardhat verify --network arcTestnet ${contractAddress}`);
    }

    // Contract verification instructions
    console.log("\n" + "=".repeat(60));
    console.log("📚 Next Steps:");
    console.log("=".repeat(60));
    console.log("1. Verify contract on explorer (if API key is set):");
    console.log(`   npx hardhat verify --network ${NETWORK} ${contractAddress}`);
    console.log("\n2. Interact with contract:");
    console.log(`   const contract = await hre.ethers.getContractAt("CackPassArcPayment", "${contractAddress}");`);
    console.log("\n3. Test payment initialization:");
    console.log('   await contract.initializePayment(paymentId, amount, "CACK-001", eventId, ticketQty);');
    console.log("\n" + "=".repeat(60) + "\n");

    return contractAddress;
  } catch (error) {
    console.error("\n❌ Deployment failed!");
    console.error("Error:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    process.exit(1);
  }
}

// Run deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
