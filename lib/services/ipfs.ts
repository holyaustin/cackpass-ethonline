// lib/services/ipfs.ts
import PinataClient from '@pinata/sdk'

// Initialize Pinata client
export const pinata = new PinataClient({
  pinataApiKey: process.env.PINATA_API_KEY!,
  pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY!,
})

// Helper functions for IPFS operations
export async function uploadFileToIPFS(file: Buffer | Blob, fileName: string) {
  try {
    const stream = file instanceof Buffer ? 
      require('stream').Readable.from(file) : 
      file
    
    const options = {
      pinataMetadata: {
        name: fileName,
      },
      pinataOptions: {
        cidVersion: 0 as const,
      },
    }

    const result = await pinata.pinFileToIPFS(stream, options)
    return {
      IpfsHash: result.IpfsHash,
      PinSize: result.PinSize,
      Timestamp: result.Timestamp,
    }
  } catch (error) {
    console.error('Error uploading file to IPFS:', error)
    throw error
  }
}

export async function uploadJSONToIPFS(json: any, name: string) {
  try {
    const options = {
      pinataMetadata: {
        name: name,
      },
    }

    const result = await pinata.pinJSONToIPFS(json, options)
    return {
      IpfsHash: result.IpfsHash,
      PinSize: result.PinSize,
      Timestamp: result.Timestamp,
    }
  } catch (error) {
    console.error('Error uploading JSON to IPFS:', error)
    throw error
  }
}

export function getIPFSGatewayUrl(ipfsHash: string): string {
  return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`
}

export function getIPFSProtocolUrl(ipfsHash: string): string {
  return `ipfs://${ipfsHash}`
}