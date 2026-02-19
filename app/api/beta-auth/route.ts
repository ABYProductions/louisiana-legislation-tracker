import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { accessCode } = await request.json()
    
    // Get valid access codes from environment variable
    const validCodes = process.env.BETA_ACCESS_CODES?.split(',') || []
    
    if (validCodes.includes(accessCode.trim())) {
      const response = NextResponse.json({ success: true })
      
      // Set cookie that expires in 30 days
      response.cookies.set('beta_access', 'granted', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      })
      
      return response
    }
    
    return NextResponse.json(
      { error: 'Invalid access code' },
      { status: 401 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}
