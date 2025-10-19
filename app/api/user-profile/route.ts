import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { clerkId, email, firstName, lastName, profileImageUrl, profile } = body
    
    if (!clerkId) {
      return NextResponse.json({ error: 'ClerkId is required' }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      include: { profile: true }
    })

    if (existingUser) {
      // Update existing user and profile
      const updatedUser = await prisma.user.update({
        where: { clerkId: clerkId },
        data: {
          email,
          firstName,
          lastName,
          profileImageUrl,
          profile: existingUser.profile ? {
            update: {
              age: profile.age,
              weight: profile.weight,
              feetHeight: profile.feetHeight,
              inchesHeight: profile.inchesHeight,
              sex: profile.sex,
              activityLevel: profile.activityLevel,
              primaryGoal: profile.primaryGoal,
            }
          } : {
            create: {
              age: profile.age,
              weight: profile.weight,
              feetHeight: profile.feetHeight,
              inchesHeight: profile.inchesHeight,
              sex: profile.sex,
              activityLevel: profile.activityLevel,
              primaryGoal: profile.primaryGoal,
            }
          }
        },
        include: {
          profile: true
        }
      })

      return NextResponse.json({ 
        success: true, 
        user: updatedUser,
        message: 'Profile updated successfully!' 
      })
    } else {
      // Create new user and profile
      const newUser = await prisma.user.create({
        data: {
          clerkId: clerkId,
          email,
          firstName,
          lastName,
          profileImageUrl,
          profile: {
            create: {
              age: profile.age,
              weight: profile.weight,
              feetHeight: profile.feetHeight,
              inchesHeight: profile.inchesHeight,
              sex: profile.sex,
              activityLevel: profile.activityLevel,
              primaryGoal: profile.primaryGoal,
            }
          }
        },
        include: {
          profile: true
        }
      })

      return NextResponse.json({ 
        success: true, 
        user: newUser,
        message: 'Profile created successfully!' 
      })
    }
  } catch (error) {
    console.error('Error saving user profile:', error)
    return NextResponse.json({ 
      error: 'Failed to save profile' 
    }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const clerkId = searchParams.get('clerkId')
    
    if (!clerkId) {
      return NextResponse.json({ error: 'ClerkId is required' }, { status: 400 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkId },
      include: { profile: true }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      success: true, 
      user: dbUser,
      profile: dbUser.profile
    })
  } catch (error) {
    console.error('Error fetching user profile:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch profile' 
    }, { status: 500 })
  }
}
