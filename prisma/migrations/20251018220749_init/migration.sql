-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "profileImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "age" INTEGER,
    "sex" TEXT,
    "activityLevel" TEXT,
    "primaryGoal" TEXT,
    "targetWeight" DOUBLE PRECISION,
    "targetDate" TIMESTAMP(3),
    "units" TEXT NOT NULL DEFAULT 'imperial',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "caloriesBurned" INTEGER,
    "notes" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "weight" DOUBLE PRECISION,
    "duration" INTEGER,
    "distance" DOUBLE PRECISION,
    "restTime" INTEGER,
    "notes" TEXT,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_plan_exercises" (
    "id" TEXT NOT NULL,
    "workoutPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight" DOUBLE PRECISION,
    "duration" INTEGER,
    "restTime" INTEGER,
    "notes" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "workout_plan_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nutrition_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION,
    "carbs" DOUBLE PRECISION,
    "fat" DOUBLE PRECISION,
    "unit" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nutrition_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "currentValue" DOUBLE PRECISION,
    "unit" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "icon" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_userId_key" ON "user_profiles"("userId");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nutrition_entries" ADD CONSTRAINT "nutrition_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
