// lib/pinata/config.ts
"server only"

import { PinataSDK } from "pinata"

export const pinata = new PinataSDK({
  pinataJwt: `${process.env.PINATA_JWT}`,
  pinataGateway: `${process.env.NEXT_PUBLIC_GATEWAY_URL}`
})

// Helper functions for upload
export async function uploadToPinata(file: File) {
  try {
    const { cid } = await pinata.upload.public.file(file)
    const gatewayUrl = await pinata.gateways.public.convert(cid)
    return {
      success: true,
      cid,
      ipfsUrl: `ipfs://${cid}`,
      gatewayUrl
    }
  } catch (error) {
    console.error('Pinata upload error:', error)
    return { success: false, error }
  }
}

export async function uploadJSONToPinata(data: any, name: string) {
  try {
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const file = new File([blob], `${name}.json`)
    
    const { cid } = await pinata.upload.public.file(file)
    const gatewayUrl = await pinata.gateways.public.convert(cid)
    
    return {
      success: true,
      cid,
      ipfsUrl: `ipfs://${cid}`,
      gatewayUrl
    }
  } catch (error) {
    console.error('Pinata JSON upload error:', error)
    return { success: false, error }
  }
}