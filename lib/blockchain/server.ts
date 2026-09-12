// /lib/blockchain/server.ts - UPDATED WITH PAYMENT RECEIVER
import { ethers } from 'ethers'
import { CackPassCoreABI } from '@/lib/contracts/abis/CackPassCore'

// Get the payment receiver address from environment
const PAYMENT_RECEIVER_ADDRESS = process.env.PAYMENT_RECEIVER_ADDRESS || '0x2c3b2b2325610a6814f2f822d0bf4dab8cf16e16'

export async function mintTicketWithApproval(
  approvalData: any,
  signature: string,
  quantity: number = 1
) {
  try {
    console.log('🎫 [BLOCKCHAIN SERVER] Minting ticket with approval')
    
    if (!process.env.GASLESS_PRIVATE_KEY) {
      throw new Error('GASLESS_PRIVATE_KEY not configured')
    }

    const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY, provider)
    
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!,
      CackPassCoreABI,
      wallet
    )

    console.log('💰 Using payment receiver:', PAYMENT_RECEIVER_ADDRESS)

    // Calculate total value to send
    const priceInEth = Number(ethers.formatEther(approvalData.price || 0))
    const totalValue = priceInEth * (approvalData.amount || quantity)
    
    console.log('📊 Transaction details:', {
      price: priceInEth,
      quantity: approvalData.amount || quantity,
      totalValue,
      paymentReceiver: PAYMENT_RECEIVER_ADDRESS
    })

    // Prepare transaction options
    const txOptions: any = {
      gasLimit: 300000
    }
    
    // If there's a price, send the value to the payment receiver
    if (totalValue > 0) {
      txOptions.value = ethers.parseEther(totalValue.toString())
      console.log('💰 Sending', totalValue, 'ETH to', PAYMENT_RECEIVER_ADDRESS)
    }

    // Prepare approval data for contract
    const approvalDataForContract = {
      recipient: approvalData.recipient,
      eventId: BigInt(approvalData.eventId),
      ticketCategory: approvalData.ticketCategory || 0,
      amount: BigInt(approvalData.amount || quantity),
      price: BigInt(approvalData.price || 0),
      validUntil: BigInt(approvalData.validUntil || Math.floor(Date.now() / 1000) + 3600),
      id: approvalData.id
    }

    console.log('📝 Minting with approval data:', approvalDataForContract)
    
    // Call contract to mint with approval
    const tx = await contract.mintWithApproval(
      approvalDataForContract,
      signature,
      txOptions
    )

    console.log('✅ Transaction sent:', tx.hash)
    const receipt = await tx.wait()
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber)

    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
      totalValue: totalValue,
      gasUsed: receipt.gasUsed?.toString(),
      effectiveGasPrice: receipt.effectiveGasPrice?.toString()
    }

  } catch (error: any) {
    console.error('❌ Minting error:', error)
    
    // Provide more helpful error messages
    let errorMessage = error.message
    if (error.code === 'INSUFFICIENT_FUNDS') {
      errorMessage = `Gasless wallet has insufficient funds. Please fund: ${process.env.GASLESS_PRIVATE_KEY ? new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY).address : 'gasless wallet'}`
    } else if (error.code === 'CALL_EXCEPTION') {
      errorMessage = 'Contract call failed. Check contract address and approval data.'
    }
    
    throw new Error(`Blockchain minting failed: ${errorMessage}`)
  }
}

export async function mintTicketDirect(
  recipient: string,
  eventId: number,
  quantity: number = 1
) {
  try {
    console.log('🎫 [BLOCKCHAIN SERVER] Minting ticket directly')
    
    if (!process.env.GASLESS_PRIVATE_KEY) {
      throw new Error('GASLESS_PRIVATE_KEY not configured')
    }

    const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY, provider)
    
    const contract = new ethers.Contract(
      process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS!,
      CackPassCoreABI,
      wallet
    )

    console.log('💰 Using payment receiver:', PAYMENT_RECEIVER_ADDRESS)
    
    // Simple mint without approval (for free tickets or testing)
    const tx = await contract.mint(
      recipient,
      eventId,
      0, // General Admission category
      quantity,
      {
        gasLimit: 300000
      }
    )
    
    console.log('✅ Transaction sent:', tx.hash)
    const receipt = await tx.wait()
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber)

    return {
      success: true,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      paymentReceiver: PAYMENT_RECEIVER_ADDRESS,
      gasUsed: receipt.gasUsed?.toString()
    }

  } catch (error: any) {
    console.error('❌ Direct minting error:', error)
    throw new Error(`Direct blockchain minting failed: ${error.message}`)
  }
}

// Helper to check gasless wallet balance
export async function checkGaslessWalletBalance() {
  try {
    if (!process.env.GASLESS_PRIVATE_KEY) {
      return {
        success: false,
        error: 'GASLESS_PRIVATE_KEY not configured'
      }
    }

    const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const wallet = new ethers.Wallet(process.env.GASLESS_PRIVATE_KEY, provider)
    
    const balance = await provider.getBalance(wallet.address)
    const balanceInEth = ethers.formatEther(balance)

    return {
      success: true,
      address: wallet.address,
      balance: balanceInEth,
      hasSufficientFunds: parseFloat(balanceInEth) > 0.01,
      paymentReceiver: PAYMENT_RECEIVER_ADDRESS
    }

  } catch (error: any) {
    console.error('❌ Check balance error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Helper to get network info
export async function getNetworkInfo() {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_ARC_RPC_URL || 'https://rpc.testnet.arc.network'
    const provider = new ethers.JsonRpcProvider(rpcUrl)
    
    const network = await provider.getNetwork()
    const blockNumber = await provider.getBlockNumber()
    const feeData = await provider.getFeeData()

    return {
      success: true,
      network: {
        name: network.name,
        chainId: network.chainId,
        blockNumber,
        gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : 'Unknown',
        maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') + ' gwei' : 'Unknown'
      },
      contract: {
        address: process.env.NEXT_PUBLIC_CACKPASS_CORE_ADDRESS,
        paymentReceiver: PAYMENT_RECEIVER_ADDRESS
      }
    }

  } catch (error: any) {
    console.error('❌ Network info error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}