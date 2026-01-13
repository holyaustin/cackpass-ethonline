// app/api/onramp/create-url/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const walletAddress = searchParams.get('walletAddress')
    const currencyCode = searchParams.get('currencyCode') || 'eth'
    const baseCurrencyAmount = searchParams.get('baseCurrencyAmount')
    const baseCurrencyCode = searchParams.get('baseCurrencyCode') || 'usd'

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Get MoonPay secret key from environment variables
    const secretKey = process.env.MOONPAY_SECRET_KEY
    if (!secretKey) {
      throw new Error('MoonPay secret key not configured')
    }

    // Create query parameters
    const params = new URLSearchParams({
      apiKey: process.env.MOONPAY_PUBLISHABLE_KEY!,
      currencyCode,
      walletAddress,
      baseCurrencyCode,
      ...(baseCurrencyAmount && { baseCurrencyAmount }),
      redirectURL: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?onramp=success`,
      paymentMethod: 'credit_debit_card',
    })

    // Create signature
    const queryString = params.toString()
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(queryString)
      .digest('base64')

    // Encode signature for URL
    const encodedSignature = encodeURIComponent(signature)

    // Construct MoonPay URL
    const moonpayBaseUrl = process.env.MOONPAY_ENV === 'production' 
      ? 'https://buy.moonpay.com'
      : 'https://buy-sandbox.moonpay.com'

    const moonpayUrl = `${moonpayBaseUrl}?${queryString}&signature=${encodedSignature}`

    return NextResponse.json({
      success: true,
      url: moonpayUrl,
    })

  } catch (error) {
    console.error('Error creating MoonPay URL:', error)
    return NextResponse.json(
      { error: 'Failed to create onramp URL' },
      { status: 500 }
    )
  }
}