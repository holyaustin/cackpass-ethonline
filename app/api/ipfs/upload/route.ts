// app/api/ipfs/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pinata } from '@/lib/pinata/config';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file: File | null = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Upload file to Pinata
    const uploadResult = await pinata.upload.public.file(file);
    
    // Get gateway URL
    const gatewayUrl = await pinata.gateways.public.convert(uploadResult.cid);
    
    return NextResponse.json({
      success: true,
      cid: uploadResult.cid,
      ipfsUrl: `ipfs://${uploadResult.cid}`,
      gatewayUrl: gatewayUrl,
      fileName: file.name,
      size: file.size,
      type: file.type
    }, { status: 200 });
    
  } catch (error) {
    console.error('API upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}