// app/api/pinata/url/route.ts
import { NextResponse } from 'next/server'
import { pinata } from '@/lib/pinata/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // If you're going to use auth you'll want to verify here
    const url = await pinata.upload.public.createSignedURL({
      expires: 300, // Valid for 5 minutes
    })
    return NextResponse.json({ url: url }, { status: 200 })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: 'Error creating signed URL' },
      { status: 500 }
    )
  }
}