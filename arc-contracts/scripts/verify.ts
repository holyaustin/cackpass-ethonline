// scripts/verify.ts
import { run, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ────────────────────────────────────────────────────────────
// Usage:
//   npx hardhat run scripts/verify.ts --network arcTestnet
//
// Reads the latest deployment artifact for the current network,
// then re-runs verification with the recorded constructor args.
// ────────────────────────────────────────────────────────────

async function main() {
  const networkName = network.name;
  const deploymentsDir = path.join(__dirname, "../deployments");
  const latestPath = path.join(deploymentsDir, `${networkName}-latest.json`);

  if (!fs.existsSync(latestPath)) {
    throw new Error(
      `No deployment found for network "${networkName}" at ${latestPath}.\n` +
        `Run scripts/deploy.ts first.`
    );
  }

  const deployment = JSON.parse(fs.readFileSync(latestPath, "utf-8"));
  const { contractAddress, constructorArgs } = deployment;

  if (!contractAddress) {
    throw new Error(`Deployment artifact missing contractAddress.`);
  }

  console.log(`\n🔍 Verifying contract on ${networkName}`);
  console.log(`   Address:  ${contractAddress}`);
  console.log(`   Args:     ${JSON.stringify(constructorArgs)}\n`);

  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArgs ?? [],
    });
    console.log("✅ Verified successfully!\n");
  } catch (error: any) {
    const msg = error?.message ?? String(error);
    if (msg.includes("Already Verified") || msg.includes("already verified")) {
      console.log("✅ Already verified.\n");
    } else {
      console.error("❌ Verification failed:", msg);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });