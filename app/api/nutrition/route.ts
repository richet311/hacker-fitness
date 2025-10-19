import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Fetch nutrition entries for a user within a date range
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get('clerkId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!clerkId) {
      return NextResponse.json({ error: 'clerkId is required' }, { status: 400 });
    }

    // Find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build the query filters
    const where: { userId: string; date?: { gte: Date; lte: Date } } = { userId: user.id };
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Fetch nutrition entries
    const nutritionEntries = await prisma.nutritionEntry.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ entries: nutritionEntries });
  } catch (error) {
    console.error('Error fetching nutrition entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nutrition entries' },
      { status: 500 }
    );
  }
}

// POST - Create or update a nutrition entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clerkId, foodName, calories, protein, carbs, fat, date, notes, entryId } = body;

    if (!clerkId) {
      return NextResponse.json({ error: 'clerkId is required' }, { status: 400 });
    }

    if (!foodName || calories === undefined) {
      return NextResponse.json(
        { error: 'foodName and calories are required' },
        { status: 400 }
      );
    }

    // Find the user by clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If entryId is provided, update existing entry
    if (entryId) {
      const updatedEntry = await prisma.nutritionEntry.update({
        where: { id: entryId },
        data: {
          foodName,
          calories,
          protein,
          carbs,
          fat,
          date: date ? new Date(date) : undefined,
          notes,
        },
      });

      return NextResponse.json({ entry: updatedEntry });
    }

    // Create new nutrition entry
    const nutritionEntry = await prisma.nutritionEntry.create({
      data: {
        userId: user.id,
        foodName,
        calories,
        protein,
        carbs,
        fat,
        date: date ? new Date(date) : new Date(),
        notes,
      },
    });

    return NextResponse.json({ entry: nutritionEntry });
  } catch (error) {
    console.error('Error creating nutrition entry:', error);
    return NextResponse.json(
      { error: 'Failed to create nutrition entry' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a nutrition entry
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entryId = searchParams.get('entryId');

    if (!entryId) {
      return NextResponse.json({ error: 'entryId is required' }, { status: 400 });
    }

    await prisma.nutritionEntry.delete({
      where: { id: entryId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting nutrition entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete nutrition entry' },
      { status: 500 }
    );
  }
}

