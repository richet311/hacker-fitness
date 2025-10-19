import { NextRequest, NextResponse } from 'next/server';

function calculateMacrosFallback(userMetrics: {
  age: number;
  weight: number;
  feetHeight: number;
  inchesHeight: number;
  sex: string;
  activityLevel: string;
  primaryGoal: string;
}) {
  const { age, weight, feetHeight, inchesHeight, sex, activityLevel, primaryGoal } = userMetrics;
  
  // Convert height to cm for BMR calculation
  const heightInInches = (feetHeight * 12) + inchesHeight;
  const heightInCm = heightInInches * 2.54;
  
  // Convert weight to kg for BMR calculation
  const weightInKg = weight * 0.453592;
  
  // Calculate BMR using Mifflin-St Jeor Equation
  let bmr: number;
  if (sex.toLowerCase() === 'male') {
    bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * age) + 5;
  } else {
    bmr = (10 * weightInKg) + (6.25 * heightInCm) - (5 * age) - 161;
  }
  
  // Activity level multipliers (adjusted for realistic calories)
  const activityMultipliers: { [key: string]: number } = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.65,
    'very_active': 1.7
  };
  
  const activityMultiplier = activityMultipliers[activityLevel] || 1.55;
  let tdee = bmr * activityMultiplier;
  
  // Adjust calories based on specific goals
  if (primaryGoal === 'weight_loss' || primaryGoal === 'fat_loss') {
    tdee = tdee * 0.8; // 20% deficit for weight/fat loss
  } else if (primaryGoal === 'muscle_gain') {
    tdee = tdee * 1.1; // 10% surplus for muscle gain
  } else if (primaryGoal === 'endurance') {
    tdee = tdee * 1.05; // 5% surplus for endurance training
  }
  // maintenance stays at TDEE
  
  const calories = Math.round(tdee);
  
  // Calculate macros based on goal and activity level
  let proteinGrams: number;
  let fatGrams: number;
  
  if (primaryGoal === 'muscle_gain') {
    // Higher protein for muscle building
    proteinGrams = Math.round(weight * 1.2); // 1.2g per lb
    fatGrams = Math.round(weight * 0.5); // 0.5g per lb
  } else if (primaryGoal === 'weight_loss' || primaryGoal === 'fat_loss') {
    // Moderate protein, lower carbs for fat loss
    proteinGrams = Math.round(weight * 1.0); // 1.0g per lb
    fatGrams = Math.round(weight * 0.3); // 0.3g per lb (lower fat)
  } else if (primaryGoal === 'endurance') {
    // Higher carbs for endurance
    proteinGrams = Math.round(weight * 0.8); // 0.8g per lb
    fatGrams = Math.round(weight * 0.4); // 0.4g per lb
  } else {
    // Maintenance - balanced
    proteinGrams = Math.round(weight * 0.9); // 0.9g per lb
    fatGrams = Math.round(weight * 0.4); // 0.4g per lb
  }
  
  // Calculate calories from protein and fat
  const proteinCals = proteinGrams * 4;
  const fatCals = fatGrams * 9;
  
  // Remaining calories go to carbs
  const remainingCals = calories - proteinCals - fatCals;
  const carbGrams = Math.max(0, Math.round(remainingCals / 4));
  
  return {
    calories,
    protein: proteinGrams,
    carbs: carbGrams,
    fat: fatGrams
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, userMetrics, responseFormat = 'text' } = body;

    // Check if this is a macro calculation request
    const isMacroCalculation = userMetrics && (
      message?.toLowerCase().includes('macro') ||
      message?.toLowerCase().includes('calorie') ||
      responseFormat === 'macros'
    );

    // For macro calculations, use intelligent fallback that adapts to user's metrics and goals
    if (isMacroCalculation && userMetrics) {
      // Use the improved fallback calculation that considers all user metrics and goals
      const calculatedMacros = calculateMacrosFallback(userMetrics);
      return NextResponse.json({
        response: `Personalized macros: Calories: ${calculatedMacros.calories}, Protein: ${calculatedMacros.protein}g, Carbs: ${calculatedMacros.carbs}g, Fat: ${calculatedMacros.fat}g`,
        macros: calculatedMacros,
        type: 'macros',
        fallback: false // This is now the primary method since it's goal-specific
      });
    }

    // For general chat/meal plans
    return NextResponse.json({
      response: "I'm focused on macro calculations. Please use the macro-meals page for personalized nutrition guidance.",
      type: 'text'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

