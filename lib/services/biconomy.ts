// lib/services/biconomy.ts
import { IBundler, Bundler } from '@biconomy/bundler'
import { BiconomySmartAccountV2, DEFAULT_ENTRYPOINT_ADDRESS } from "@biconomy/account"
import { IPaymaster, BiconomyPaymaster } from '@biconomy/paymaster'
import { Wallet, ethers } from 'ethers'

const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '4202')

// Biconomy API URLs - Get these from your Biconomy dashboard
const bundler: IBundler = new Bundler({
  bundlerUrl: `https://bundler.biconomy.io/api/v2/${chainId}/your-bundler-api-key`,
  chainId,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
})

const paymaster: IPaymaster = new BiconomyPaymaster({
  paymasterUrl: `https://paymaster.biconomy.io/api/v1/${chainId}/your-paymaster-api-key`,
})

export async function createSmartAccount(signer: ethers.Signer) {
  try {
    // Use BiconomySmartAccountV2 (latest version)
    const biconomySmartAccount = await BiconomySmartAccountV2.create({
      chainId,
      bundler,
      paymaster,
      entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
      defaultValidationModule: await ECDSAOwnershipModule.create({
        signer: signer,
        moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
      }),
      activeValidationModule: await ECDSAOwnershipModule.create({
        signer: signer,
        moduleAddress: DEFAULT_ECDSA_OWNERSHIP_MODULE
      }),
    })
    
    return biconomySmartAccount
  } catch (error) {
    console.error('Error creating smart account:', error)
    throw error
  }
}

// Alternative: Simplified version for testing
export async function sendGaslessTransaction(
  to: string,
  data: string,
  signer: ethers.Signer
) {
  try {
    // For now, use a simpler approach
    const tx = {
      to,
      data,
      chainId,
    }
    
    // In production, you would use Biconomy SDK here
    // For testing, we'll use regular transactions
    const signedTx = await signer.sendTransaction(tx)
    return signedTx
  } catch (error) {
    console.error('Error sending gasless transaction:', error)
    throw error
  }
}

// Simple wrapper for contract calls
export async function executeContractCall(
  contract: ethers.Contract,
  method: string,
  args: any[],
  signer: ethers.Signer
) {
  const tx = await contract.connect(signer)[method](...args)
  return tx
}