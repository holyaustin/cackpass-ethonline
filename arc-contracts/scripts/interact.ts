// scripts/interact.ts
import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { network } from "hardhat";

async function main() {
  const latestPath = path.join(
    __dirname,
    "../deployments",
    `${network.name}-latest.json`
  );

  if (!fs.existsSync(latestPath)) {
    throw new Error(`No deployment for ${network.name}. Deploy first.`);
  }

  const deployment = JSON.parse(fs.readFileSync(latestPath, "utf-8"));
  const registry = await ethers.getContractAt(
    "CackPassArcRegistry",
    deployment.contractAddress
  );

  console.log(`\n📋 Registry @ ${deployment.contractAddress}`);
  console.log(`   platformOwner:    ${await registry.platformOwner()}`);
  console.log(`   paymentProcessor: ${await registry.paymentProcessor()}`);
  console.log(`   paused:           ${await registry.paused()}`);
  console.log(`   totalBatches:     ${await registry.getTotalBatches()}\n`);

  // Example: fetch a specific payment by id
  const [paymentId] = process.argv.slice(2);
  if (paymentId) {
    try {
      const p = await registry.getPayment(paymentId);
      console.log(`Payment ${paymentId}:`);
      console.log(`   payer:            ${p.payer}`);
      console.log(`   amount:           ${ethers.formatUnits(p.amount, 18)} USDC`);
      console.log(`   reference:        ${p.paymentReference}`);
      console.log(`   status:           ${await registry.getPaymentStatus(paymentId)}`);
    } catch {
      console.log(`Payment ${paymentId} not found.`);
    }
  }
}

main().catch(console.error);