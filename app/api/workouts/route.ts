import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ExerciseData = {
  name: string;
  category: string;
  sets: number;
  reps: number;
  weight?: number;
  duration?: number;
  distance?: number;
  restTime?: number;
  notes?: string;
};

// GET - Fetch workouts for a user within a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clerkId = searchParams.get('clerkId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!clerkId) {
      return NextResponse.json({ error: 'Clerk ID is required' }, { status: 400 });
    }

    // Find the user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build query filters
    const where: { userId: string; date?: { gte: Date; lte: Date } } = { userId: user.id };
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Fetch workouts with exercises
    const workouts = await prisma.workout.findMany({
      where,
      include: {
        exercises: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json({ workouts });
  } catch (error) {
    console.error('Error fetching workouts:', error);
    return NextResponse.json({ error: 'Failed to fetch workouts' }, { status: 500 });
  }
}

// POST - Create a new workout with exercises
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clerkId, name, type, duration, caloriesBurned, notes, date, exercises, completed } = body;

    console.log('POST /api/workouts - Request body:', body);

    if (!clerkId || !name || !date) {
      console.log('Missing required fields:', { clerkId: !!clerkId, name: !!name, date: !!date });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the user by Clerk ID
    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    console.log('Found user:', user ? { id: user.id, clerkId: user.clerkId } : 'Not found');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create workout with exercises
    const workoutData = {
      userId: user.id,
      name,
      type: type || 'strength',
      duration: duration || 0,
      caloriesBurned,
      notes,
      date: new Date(date),
      exercises: exercises ? {
        create: exercises.map((ex: ExerciseData) => ({
          name: ex.name,
          category: ex.category,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          duration: ex.duration,
          distance: ex.distance,
          restTime: ex.restTime,
          notes: ex.notes,
        })),
      } : undefined,
    };

    console.log('Creating workout with data:', workoutData);

    const workout = await prisma.workout.create({
      data: workoutData,
      include: {
        exercises: true,
      },
    });

    console.log('Workout created successfully:', workout);

    return NextResponse.json({ workout }, { status: 201 });
  } catch (error) {
    console.error('Error creating workout:', error);
    return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 });
  }
}

// DELETE - Delete a workout
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workoutId = searchParams.get('workoutId');

    if (!workoutId) {
      return NextResponse.json({ error: 'Workout ID is required' }, { status: 400 });
    }

    await prisma.workout.delete({
      where: { id: workoutId },
    });

    return NextResponse.json({ message: 'Workout deleted successfully' });
  } catch (error) {
    console.error('Error deleting workout:', error);
    return NextResponse.json({ error: 'Failed to delete workout' }, { status: 500 });
  }
}

// PUT - Update a workout
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { workoutId, name, type, duration, caloriesBurned, notes, exercises, completed } = body;

    if (!workoutId) {
      return NextResponse.json({ error: 'Workout ID is required' }, { status: 400 });
    }

    // Delete existing exercises and create new ones
    await prisma.exercise.deleteMany({
      where: { workoutId },
    });

    const workout = await prisma.workout.update({
      where: { id: workoutId },
      data: {
        name,
        type,
        duration,
        caloriesBurned,
        notes,
        exercises: exercises ? {
          create: exercises.map((ex: ExerciseData) => ({
            name: ex.name,
            category: ex.category,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            duration: ex.duration,
            distance: ex.distance,
            restTime: ex.restTime,
            notes: ex.notes,
          })),
        } : undefined,
      },
      include: {
        exercises: true,
      },
    });

    return NextResponse.json({ workout });
  } catch (error) {
    console.error('Error updating workout:', error);
    return NextResponse.json({ error: 'Failed to update workout' }, { status: 500 });
  }
}

