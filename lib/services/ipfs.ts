// lib/services/ipfs.ts
import { pinata } from '@/lib/pinata/config';

/**
 * Upload a file to IPFS via Pinata
 * @param file - File object from browser
 * @param fileName - Optional custom filename
 * @returns Object containing CID and URL
 */
export async function uploadFileToIPFS(file: File, fileName?: string) {
  try {
    // Upload file to Pinata
    const uploadResult = await pinata.upload.public.file(file);
    
    // Convert CID to gateway URL
    const gatewayUrl = await pinata.gateways.public.convert(uploadResult.cid);
    
    return {
      cid: uploadResult.cid,
      ipfsUrl: `ipfs://${uploadResult.cid}`,
      gatewayUrl: gatewayUrl,
      fileName: fileName || file.name,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error uploading file to IPFS:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload JSON data to IPFS
 * @param json - JSON object to upload
 * @param name - Name for the JSON file
 * @returns Object containing CID and URLs
 */
export async function uploadJSONToIPFS(json: any, name: string) {
  try {
    // Create a JSON Blob
    const jsonString = JSON.stringify(json);
    const jsonBlob = new Blob([jsonString], { type: 'application/json' });
    
    // Convert Blob to File
    const jsonFile = new File([jsonBlob], `${name}.json`, {
      type: 'application/json',
      lastModified: Date.now()
    });
    
    // Upload the JSON file
    return await uploadFileToIPFS(jsonFile, `${name}.json`);
  } catch (error) {
    console.error('Error uploading JSON to IPFS:', error);
    throw new Error(`Failed to upload JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload base64 image to IPFS
 * @param base64Data - Base64 string (data:image/...)
 * @param fileName - Name for the image file
 * @returns Object containing CID and URLs
 */
export async function uploadBase64ImageToIPFS(base64Data: string, fileName: string) {
  try {
    // Convert base64 to Blob
    const response = await fetch(base64Data);
    const blob = await response.blob();
    
    // Create File from Blob
    const file = new File([blob], fileName, {
      type: blob.type,
      lastModified: Date.now()
    });
    
    return await uploadFileToIPFS(file, fileName);
  } catch (error) {
    console.error('Error uploading base64 image:', error);
    throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get gateway URL from CID
 * @param cid - IPFS Content Identifier
 * @returns Gateway URL
 */
export function getGatewayUrl(cid: string): string {
  return `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cid}`;
}

/**
 * Get IPFS protocol URL from CID
 * @param cid - IPFS Content Identifier
 * @returns IPFS protocol URL
 */
export function getIPFSUrl(cid: string): string {
  return `ipfs://${cid}`;
}

/**
 * Create a temporary signed URL for client-side uploads
 * Use this for large files that exceed Next.js API route limits
 * @param expiresIn - Expiration time in seconds (default: 30)
 * @returns Signed upload URL
 */
export async function createSignedUploadURL(expiresIn: number = 30) {
  try {
    const signedUrl = await pinata.upload.public.createSignedURL({
      expires: expiresIn
    });
    return signedUrl;
  } catch (error) {
    console.error('Error creating signed URL:', error);
    throw error;
  }
}

/**
 * Client-side upload using signed URL
 * @param file - File to upload
 * @param signedUrl - Temporary signed URL from createSignedUploadURL
 * @returns Upload result with CID
 */
export async function uploadWithSignedURL(file: File, signedUrl: string) {
  try {
    const upload = await pinata.upload.public
      .file(file)
      .url(signedUrl);
    
    return {
      cid: upload.cid,
      ipfsUrl: `ipfs://${upload.cid}`,
      gatewayUrl: await pinata.gateways.public.convert(upload.cid)
    };
  } catch (error) {
    console.error('Error uploading with signed URL:', error);
    throw error;
  }
}

// Export the pinata instance for direct use if needed
export { pinata };