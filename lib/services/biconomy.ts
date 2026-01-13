// lib/services/biconomy.ts
import { IBundler, Bundler } from '@biconomy/bundler'
import { 
  BiconomySmartAccountV2, 
  DEFAULT_ENTRYPOINT_ADDRESS,
  createECDSAOwnershipValidationModule
} from "@biconomy/account"
import { IPaymaster, BiconomyPaymaster } from '@biconomy/paymaster'
import { ethers } from 'ethers'

const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '4202')

// Biconomy API URLs - Get these from your Biconomy dashboard
// Sign up at https://dashboard.biconomy.io/
const bundler: IBundler = new Bundler({
  bundlerUrl: `https://bundler.biconomy.io/api/v2/${chainId}/YOUR_BUNDLER_API_KEY`,
  chainId,
  entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
})

const paymaster: IPaymaster = new BiconomyPaymaster({
  paymasterUrl: `https://paymaster.biconomy.io/api/v1/${chainId}/YOUR_PAYMASTER_API_KEY`,
})

export async function createSmartAccount(signer: ethers.Signer) {
  try {
    // Create ECDSA ownership validation module
    const ecdsaModule = await createECDSAOwnershipValidationModule({
      signer: signer,
      moduleAddress: "0x0000001c5b32F37F5beA87BDD5374eB2aC54eA8e", // Default ECDSA module address
    })

    // Create Biconomy Smart Account V2
    const biconomySmartAccount = await BiconomySmartAccountV2.create({
      chainId,
      bundler,
      paymaster,
      entryPointAddress: DEFAULT_ENTRYPOINT_ADDRESS,
      defaultValidationModule: ecdsaModule,
      activeValidationModule: ecdsaModule,
    })
    
    return biconomySmartAccount
  } catch (error) {
    console.error('Error creating smart account:', error)
    throw error
  }
}

// Alternative: Simplified version for gasless transactions
export async function sendGaslessTransaction(
  to: string,
  data: string,
  signer: ethers.Signer,
  value?: string
) {
  try {
    // Create smart account
    const smartAccount = await createSmartAccount(signer)
    
    // Build user operation
    const partialUserOp = await smartAccount.buildUserOp([{
      to,
      data,
      value: value ? ethers.parseEther(value) : "0",
    }])

    // Get paymaster and data
    const biconomyPaymaster = smartAccount.paymaster as IPaymaster
    const paymasterAndDataResponse = await biconomyPaymaster.getPaymasterAndData(partialUserOp)
    
    // Update user operation with paymaster data
    partialUserOp.paymasterAndData = paymasterAndDataResponse.paymasterAndData

    // Sign and send user operation
    const userOpResponse = await smartAccount.sendUserOp(partialUserOp)
    const receipt = await userOpResponse.wait()
    
    return {
      userOpHash: userOpResponse.userOpHash,
      receipt,
      transactionHash: receipt.receipt.transactionHash,
    }
  } catch (error) {
    console.error('Error sending gasless transaction:', error)
    throw error
  }
}

// Simple wrapper for contract calls with gas sponsorship
export async function executeContractCall(
  contract: ethers.Contract,
  method: string,
  args: any[],
  signer: ethers.Signer
) {
  try {
    // Get contract ABI to find function fragment
    const iface = contract.interface
    const functionFragment = iface.getFunction(method)
    
    if (!functionFragment) {
      throw new Error(`Function ${method} not found in contract ABI`)
    }
    
    // Encode function data
    const data = iface.encodeFunctionData(functionFragment, args)
    
    // Send gasless transaction
    const result = await sendGaslessTransaction(
      await contract.getAddress(),
      data,
      signer
    )
    
    return result
  } catch (error) {
    console.error('Error executing contract call:', error)
    throw error
  }
}