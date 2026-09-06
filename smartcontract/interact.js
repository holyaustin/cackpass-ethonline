const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Load deployment info from deployment JSON file
 */
function loadDeploymentInfo() {
  const NETWORK = hre.network.name;
  const deploymentFile = path.join(__dirname, `../deployments/${NETWORK}-deployment.json`);
  
  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}\nPlease run deploy script first.`);
  }

  const data = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  return data;
}

/**
 * Load contract ABI
 */
function loadContractABI() {
  const NETWORK = hre.network.name;
  const abiFile = path.join(__dirname, `../deployments/${NETWORK}-CackPassArcPayment.abi.json`);
  
  if (!fs.existsSync(abiFile)) {
    throw new Error(`ABI file not found: ${abiFile}`);
  }

  return JSON.parse(fs.readFileSync(abiFile, "utf8"));
}

/**
 * Get contract instance
 */
async function getContract() {
  const deploymentInfo = loadDeploymentInfo();
  const abi = loadContractABI();
  
  const contract = new hre.ethers.Contract(
    deploymentInfo.contractAddress,
    abi,
    hre.ethers.provider
  );

  return { contract, deploymentInfo };
}

/**
 * Get contract with signer
 */
async function getContractWithSigner() {
  const [signer] = await hre.ethers.getSigners();
  const deploymentInfo = loadDeploymentInfo();
  const abi = loadContractABI();
  
  const contract = new hre.ethers.Contract(
    deploymentInfo.contractAddress,
    abi,
    signer
  );

  return { contract, deploymentInfo, signer };
}

/**
 * Initialize a payment
 */
async function initializePayment(amount, reference, eventId, ticketQuantity) {
  const { contract, signer } = await getContractWithSigner();
  
  const paymentId = hre.ethers.id(reference);
  const amountWei = hre.ethers.parseUnits(amount.toString(), 18);

  console.log("\n📝 Initializing payment...");
  console.log(`   Payment ID: ${paymentId}`);
  console.log(`   Payer: ${signer.address}`);
  console.log(`   Amount: ${amount} USDC`);
  console.log(`   Reference: ${reference}`);
  console.log(`   Event ID: ${eventId}`);
  console.log(`   Tickets: ${ticketQuantity}`);

  const tx = await contract.initializePayment(
    paymentId,
    amountWei,
    reference,
    eventId,
    ticketQuantity
  );

  const receipt = await tx.wait();
  console.log(`✅ Payment initialized!`);
  console.log(`   Tx Hash: ${receipt.hash}`);
  console.log(`   Tx Block: ${receipt.blockNumber}`);

  return paymentId;
}

/**
 * Confirm a payment
 */
async function confirmPayment(paymentId) {
  const { contract, deploymentInfo } = await getContractWithSigner();

  console.log("\n✔️ Confirming payment...");
  console.log(`   Payment ID: ${paymentId}`);

  const tx = await contract.confirmPayment(paymentId);
  const receipt = await tx.wait();

  console.log(`✅ Payment confirmed!`);
  console.log(`   Tx Hash: ${receipt.hash}`);
  console.log(`   Tx Block: ${receipt.blockNumber}`);
}

/**
 * Fail a payment
 */
async function failPayment(paymentId, reason) {
  const { contract } = await getContractWithSigner();

  console.log("\n❌ Marking payment as failed...");
  console.log(`   Payment ID: ${paymentId}`);
  console.log(`   Reason: ${reason}`);

  const tx = await contract.failPayment(paymentId, reason);
  const receipt = await tx.wait();

  console.log(`✅ Payment marked as failed!`);
  console.log(`   Tx Hash: ${receipt.hash}`);
  console.log(`   Tx Block: ${receipt.blockNumber}`);
}

/**
 * Get payment details
 */
async function getPaymentDetails(paymentId) {
  const { contract } = await getContract();

  console.log("\n📋 Payment Details:");
  console.log(`   Payment ID: ${paymentId}`);

  try {
    const payment = await contract.getPayment(paymentId);
    
    console.log(`   Payer: ${payment.payer}`);
    console.log(`   Amount: ${hre.ethers.formatUnits(payment.amount, 18)} USDC`);
    console.log(`   Fee: ${hre.ethers.formatUnits(payment.fee, 18)} USDC`);
    console.log(`   Status: ${payment.status}`);
    console.log(`   Reference: ${payment.reference}`);
    console.log(`   Event ID: ${payment.eventId}`);
    console.log(`   Tickets: ${payment.ticketQuantity}`);
    console.log(`   Created: ${new Date(Number(payment.createdAt) * 1000).toISOString()}`);
    
    if (payment.confirmedAt > 0) {
      console.log(`   Confirmed: ${new Date(Number(payment.confirmedAt) * 1000).toISOString()}`);
    }

    return payment;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

/**
 * Get user payment history
 */
async function getUserPayments(userAddress) {
  const { contract } = await getContract();

  console.log(`\n📊 Payment History for ${userAddress}:`);

  try {
    const paymentIds = await contract.getUserPayments(userAddress);
    const count = await contract.getUserPaymentCount(userAddress);

    console.log(`   Total Payments: ${count}`);

    if (paymentIds.length === 0) {
      console.log("   No payments found.");
      return;
    }

    for (let i = 0; i < paymentIds.length; i++) {
      const payment = await contract.getPayment(paymentIds[i]);
      console.log(`\n   Payment ${i + 1}:`);
      console.log(`     ID: ${paymentIds[i]}`);
      console.log(`     Amount: ${hre.ethers.formatUnits(payment.amount, 18)} USDC`);
      console.log(`     Status: ${payment.status}`);
      console.log(`     Reference: ${payment.reference}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

/**
 * Get contract info
 */
async function getContractInfo() {
  const { contract, deploymentInfo } = await getContract();

  console.log("\n📱 Contract Information:");
  console.log(`   Address: ${deploymentInfo.contractAddress}`);
  console.log(`   Network: ${deploymentInfo.network}`);
  console.log(`   Deployer: ${deploymentInfo.deployerAddress}`);
  console.log(`   Owner: ${deploymentInfo.platformOwner}`);
  console.log(`   Platform Fee: ${deploymentInfo.platformFeeBps} bps (${(deploymentInfo.platformFeeBps / 100).toFixed(2)}%)`);
  console.log(`   Deployed: ${deploymentInfo.timestamp}`);
  console.log(`   Block: ${deploymentInfo.deploymentBlock}`);
}

/**
 * Update platform fee
 */
async function updatePlatformFee(newFeeBps) {
  const { contract } = await getContractWithSigner();

  console.log("\n💳 Updating platform fee...");
  console.log(`   New Fee: ${newFeeBps} bps (${(newFeeBps / 100).toFixed(2)}%)`);

  const tx = await contract.updatePlatformFee(newFeeBps);
  const receipt = await tx.wait();

  console.log(`✅ Platform fee updated!`);
  console.log(`   Tx Hash: ${receipt.hash}`);
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log("\n" + "=".repeat(60));
  console.log("🎫 CackPassArcPayment Contract Interaction");
  console.log("=".repeat(60));

  try {
    switch (command) {
      case "info":
        await getContractInfo();
        break;

      case "init-payment":
        if (args.length < 5) {
          console.log("Usage: npx hardhat run scripts/interact.js init-payment <amount> <reference> <eventId> <ticketQty>");
          break;
        }
        await initializePayment(args[1], args[2], args[3], parseInt(args[4]));
        break;

      case "confirm":
        if (args.length < 2) {
          console.log("Usage: npx hardhat run scripts/interact.js confirm <paymentId>");
          break;
        }
        await confirmPayment(args[1]);
        break;

      case "fail":
        if (args.length < 3) {
          console.log("Usage: npx hardhat run scripts/interact.js fail <paymentId> <reason>");
          break;
        }
        await failPayment(args[1], args[2]);
        break;

      case "get-payment":
        if (args.length < 2) {
          console.log("Usage: npx hardhat run scripts/interact.js get-payment <paymentId>");
          break;
        }
        await getPaymentDetails(args[1]);
        break;

      case "get-user-payments":
        if (args.length < 2) {
          console.log("Usage: npx hardhat run scripts/interact.js get-user-payments <userAddress>");
          break;
        }
        await getUserPayments(args[1]);
        break;

      case "update-fee":
        if (args.length < 2) {
          console.log("Usage: npx hardhat run scripts/interact.js update-fee <feeBps>");
          break;
        }
        await updatePlatformFee(parseInt(args[1]));
        break;

      default:
        console.log("\n📚 Available Commands:");
        console.log("   info                    - Show contract information");
        console.log("   init-payment            - Initialize a new payment");
        console.log("   confirm                 - Confirm a pending payment");
        console.log("   fail                    - Mark payment as failed");
        console.log("   get-payment             - Get payment details");
        console.log("   get-user-payments       - Get user's payment history");
        console.log("   update-fee              - Update platform fee");
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  }

  console.log("\n" + "=".repeat(60) + "\n");
}

main().catch(console.error);
