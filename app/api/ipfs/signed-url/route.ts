// app/api/ipfs/signed-url/route.ts
import { NextResponse } from 'next/server';
import { pinata } from '@/lib/pinata/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Create signed URL valid for 5 minutes (300 seconds)
    const signedUrl = await pinata.upload.public.createSignedURL({
      expires: 300
    });
    
    return NextResponse.json({
      url: signedUrl,
      expiresIn: 300
    }, { status: 200 });
    
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to create signed URL' },
      { status: 500 }
    );
  }
}