"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, User, Activity, Target, Edit3, Save, X, CheckCircle, Circle, Calendar } from "lucide-react";

type UserMetrics = {
  age?: number;
  feetHeight?: number;
  inchesHeight?: number;
  weight?: number;
  sex?: string;
  activityLevel?: string;
  primaryGoal?: string;
};

type WorkoutPlan = {
  id: string;
  day: string;
  date: string;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    weight?: number;
    duration?: number;
    completed: boolean;
  }[];
  meals: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    completed: boolean;
    dbId?: string; // Database ID if saved
  }[];
  completed: boolean;
};


const MacroTips = () => {
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit metrics state
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [editingMetrics, setEditingMetrics] = useState<UserMetrics | null>(null);
  const [isSavingMetrics, setIsSavingMetrics] = useState(false);
  const [showSaveAlert, setShowSaveAlert] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [selectedDay, setSelectedDay] = useState<WorkoutPlan | null>(null);
  const [isMealDialogOpen, setIsMealDialogOpen] = useState(false);
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [newMeal, setNewMeal] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: ''
  });
  const [addToWholeWeek, setAddToWholeWeek] = useState(false);
  const [calculatedMacros, setCalculatedMacros] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);
  const [isLoadingMacros, setIsLoadingMacros] = useState(false);
  const hasInitializedSelectedDay = useRef(false);
  
  // Memoize userMetrics to prevent unnecessary re-renders
  const memoizedUserMetrics = useMemo(() => userMetrics, [userMetrics]);

  // Check authentication and redirect if needed
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/?auth-required=true');
    }
  }, [isLoaded, isSignedIn, router]);

  // Use local date-only (YYYY-MM-DD) to avoid timezone shifts from toISOString()
  const formatISODateLocal = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // If the UI should shift the week mapping, adjust WEEK_START_SHIFT.
  // Setting this to 1 shifts the start-of-week forward one day (fixes off-by-one where Sunday shows previous day).
  const WEEK_START_SHIFT = 1;

  const getWeekStartLocal = (d: Date) => {
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    const start = new Date(dt);
    start.setDate(dt.getDate() - dt.getDay() + WEEK_START_SHIFT);
    start.setHours(0, 0, 0, 0);
    return start;
  };

  // Check if user has complete metrics
  const hasCompleteMetrics = memoizedUserMetrics?.age && memoizedUserMetrics?.weight && 
    memoizedUserMetrics?.feetHeight !== undefined && memoizedUserMetrics?.inchesHeight !== undefined && 
    memoizedUserMetrics?.sex && memoizedUserMetrics?.activityLevel && memoizedUserMetrics?.primaryGoal;

  const generateWeeklyPlan = useCallback(() => {
  const startOfWeek = getWeekStartLocal(currentWeek);

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const plan: WorkoutPlan[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const dayPlan: WorkoutPlan = {
        id: `day-${i}`,
        day: days[i],
        // store local date-only string to avoid timezone offsets
        date: formatISODateLocal(date),
        completed: false,
        exercises: generateDayExercises(days[i], memoizedUserMetrics?.primaryGoal || 'maintenance'),
        meals: generateDayMeals()
      };
      
      plan.push(dayPlan);
    }

    setWorkoutPlan(plan);
  }, [currentWeek, memoizedUserMetrics?.primaryGoal]);

  const fetchNutritionEntries = useCallback(async (): Promise<Array<{
    id: string;
    foodName: string;
    calories: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    date: string;
    notes?: string;
  }>> => {
    if (!user) return [];

    try {
  const startOfWeek = getWeekStartLocal(currentWeek);
      
  const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      const response = await fetch(
        `/api/nutrition?clerkId=${user.id}&startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`
      );

      if (response.ok) {
        const data = await response.json();
        return data.entries || [];
      }
    } catch (error) {
      console.error("Error fetching nutrition entries:", error);
    }
    return [];
  }, [user, currentWeek]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const response = await fetch(`/api/user-profile?clerkId=${user.id}`);
        if (response.ok) {
          const data = await response.json();
          // Always set userMetrics, even if profile is null or incomplete
          setUserMetrics({
            age: data.profile?.age,
            feetHeight: data.profile?.feetHeight,
            inchesHeight: data.profile?.inchesHeight,
            weight: data.profile?.weight,
            sex: data.profile?.sex,
            activityLevel: data.profile?.activityLevel,
            primaryGoal: data.profile?.primaryGoal,
          });
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
    fetchNutritionEntries();
  }, [user, fetchNutritionEntries]);



  // Save workout plan to localStorage whenever it changes
  useEffect(() => {
    if (workoutPlan.length > 0) {
      const weekKey = `workoutPlan_${formatISODateLocal(getWeekStartLocal(currentWeek))}`;
      console.log('Saving workout plan to localStorage:', weekKey, workoutPlan);
      localStorage.setItem(weekKey, JSON.stringify(workoutPlan));
    }
  }, [workoutPlan, currentWeek]);

  // Load workout plan from localStorage on component mount or week change
  // and merge with database nutrition entries
  useEffect(() => {
    const loadPlanAndMergeNutrition = async () => {
  const weekKey = `workoutPlan_${formatISODateLocal(getWeekStartLocal(currentWeek))}`;
      const savedPlan = localStorage.getItem(weekKey);
      
      let plan: WorkoutPlan[];
      
      if (savedPlan) {
        try {
          plan = JSON.parse(savedPlan);
          console.log('Loading saved workout plan:', plan);
        } catch (error) {
          console.error('Error loading saved workout plan:', error);
          // If there's an error, generate a new plan
          if (memoizedUserMetrics) {
            generateWeeklyPlan();
          }
          return;
        }
      } else {
        // No saved data for this week, generate new plan
        console.log('No saved plan found, generating new plan');
        if (memoizedUserMetrics) {
          generateWeeklyPlan();
        }
        return;
      }

  // Fetch nutrition entries from database
  const entries = await fetchNutritionEntries();
      
      // Merge database entries with the plan
      if (entries && entries.length > 0) {
        plan = plan.map(day => {
          const dayDate = day.date;
          const dayEntries = entries.filter((entry) => {
            // Normalize entry date to local YYYY-MM-DD to compare with stored day.date
            const entryDate = formatISODateLocal(new Date(entry.date));
            return entryDate === dayDate;
          });

          // Update meals with database data
          const updatedMeals = day.meals.map(meal => {
            // Check if this meal exists in the database
            const dbEntry = dayEntries.find((entry) => 
              entry.foodName === meal.name
            );
            
            if (dbEntry) {
              return {
                ...meal,
                completed: true,
                dbId: dbEntry.id
              };
            }
            return meal;
          });

          return {
            ...day,
            meals: updatedMeals
          };
        });
      }

      setWorkoutPlan(plan);
    };

    loadPlanAndMergeNutrition();
  }, [currentWeek, memoizedUserMetrics, generateWeeklyPlan, fetchNutritionEntries]);

  // When workoutPlan updates, default selectedDay to today's day in the plan
  useEffect(() => {
    if (workoutPlan.length === 0) return;
    
    // Only set selectedDay to today if we haven't initialized it yet
    // This prevents redirecting back to current day when modifying other days
    if (!hasInitializedSelectedDay.current) {
      const todayKey = formatISODateLocal(new Date());
      const todayDay = workoutPlan.find(d => d.date === todayKey) || workoutPlan[0];
      setSelectedDay(todayDay);
      hasInitializedSelectedDay.current = true;
    }
  }, [workoutPlan]);

  const generateDayExercises = (day: string, goal: string) => {
    const baseExercises = [
      { name: "Push-ups", sets: 3, reps: 12, completed: false },
      { name: "Squats", sets: 3, reps: 15, completed: false },
      { name: "Plank", sets: 3, reps: 1, duration: 30, completed: false }
    ];

    if (goal === "muscle_gain") {
      return [
        ...baseExercises,
        { name: "Bench Press", sets: 4, reps: 8, weight: 135, completed: false },
        { name: "Deadlifts", sets: 4, reps: 6, weight: 185, completed: false }
      ];
    } else if (goal === "weight_loss" || goal === "lose_body_fat") {
      return [
        ...baseExercises,
        { name: "Burpees", sets: 3, reps: 10, completed: false },
        { name: "Mountain Climbers", sets: 3, reps: 20, completed: false }
      ];
    }

    return baseExercises;
  };

  const generateDayMeals = () => {
    // Start with empty meals - users will add their own or get suggestions from LLM
    return [];
  };

  const toggleMealCompletion = async (dayId: string, mealIndex: number) => {
    if (!user) return;

    const day = workoutPlan.find(d => d.id === dayId);
    if (!day) return;

    const meal = day.meals[mealIndex];
    if (!meal) return;

    // Prevent marking future meals as eaten
    if (isDateInFuture(day.date) && !meal.completed) {
      console.log('Cannot mark future meal as eaten');
      return;
    }

    const isCompleting = !meal.completed;
    console.log('toggleMealCompletion - meal:', meal.name, 'current completed:', meal.completed, 'will be:', isCompleting);

    try {
      if (isCompleting) {
        // Save to database when marking as completed
        const response = await fetch('/api/nutrition', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clerkId: user.id,
            foodName: meal.name,
            calories: meal.calories,
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat,
            date: day.date,
            notes: 'Meal from plan',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Update the meal with the database ID
          setWorkoutPlan(prev => prev.map(d => {
            if (d.id === dayId) {
              const updatedMeals = d.meals.map((m, index) => 
                index === mealIndex ? { ...m, completed: true, dbId: data.entry.id } : m
              );
              const allCompleted = updatedMeals.every(m => m.completed);
              return { ...d, meals: updatedMeals, completed: allCompleted };
            }
            return d;
          }));
          console.log('Meal marked as eaten and saved to database');
        }
      } else {
        // Delete from database when unmarking
        if (meal.dbId) {
          const response = await fetch(`/api/nutrition?entryId=${meal.dbId}`, {
            method: 'DELETE',
          });

          if (response.ok) {
            setWorkoutPlan(prev => prev.map(d => {
              if (d.id === dayId) {
                const updatedMeals = d.meals.map((m, index) => 
                  index === mealIndex ? { ...m, completed: false, dbId: undefined } : m
                );
                const allCompleted = updatedMeals.every(m => m.completed);
                return { ...d, meals: updatedMeals, completed: allCompleted };
              }
              return d;
            }));
            console.log('Meal unmarked and removed from database');
          }
        } else {
          // If no dbId, just update local state
          setWorkoutPlan(prev => prev.map(d => {
            if (d.id === dayId) {
              const updatedMeals = d.meals.map((m, index) => 
                index === mealIndex ? { ...m, completed: false } : m
              );
              const allCompleted = updatedMeals.every(m => m.completed);
              return { ...d, meals: updatedMeals, completed: allCompleted };
            }
            return d;
          }));
        }
      }
    } catch (error) {
      console.error('Error toggling meal completion:', error);
      alert('Failed to update meal. Please try again.');
    }
  };

  

  const navigateWeek = (direction: 'prev' | 'next') => {
    setIsTransitioning(true);
    setSlideDirection(direction === 'prev' ? 'right' : 'left');
    
    setTimeout(() => {
      const newWeek = new Date(currentWeek);
      newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
      setCurrentWeek(newWeek);
      
      // Preserve selectedDay by finding the corresponding day in the new week
      if (selectedDay) {
        const dayOfWeek = new Date(selectedDay.date).getDay();
        const newWeekStart = new Date(newWeek);
        newWeekStart.setDate(newWeek.getDate() - newWeek.getDay());
        const newSelectedDate = new Date(newWeekStart);
        newSelectedDate.setDate(newWeekStart.getDate() + dayOfWeek);
        
        // Find the corresponding day in the new week's plan
        setTimeout(() => {
          const newSelectedDay = workoutPlan.find(day => day.date === newSelectedDate.toISOString().split('T')[0]);
          if (newSelectedDay) {
            setSelectedDay(newSelectedDay);
          }
        }, 50);
      }
      
      setTimeout(() => {
        setIsTransitioning(false);
        setSlideDirection(null);
      }, 100);
    }, 150);
  };

  const openMealDialog = (day: WorkoutPlan) => {
    setSelectedDay(day);
    setIsMealDialogOpen(true);
  };

  // Get the current day data from workoutPlan to ensure we have the latest state
  const getCurrentDayData = () => {
    if (!selectedDay) return null;
    return workoutPlan.find(day => day.id === selectedDay.id) || selectedDay;
  };

  // Check if a date is in the future (after today)
  const isDateInFuture = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date > today;
  };

  const addCustomMeal = () => {
    if (!newMeal.name || !newMeal.calories || !newMeal.protein || !newMeal.carbs || !newMeal.fat) {
      alert('Please fill in all fields');
      return;
    }

    const customMeal = {
      name: newMeal.name,
      calories: parseInt(newMeal.calories),
      protein: parseInt(newMeal.protein),
      carbs: parseInt(newMeal.carbs),
      fat: parseInt(newMeal.fat),
      completed: false
    };

    const currentDay = getCurrentDayData()!;
    const currentDayIndex = workoutPlan.findIndex(day => day.id === currentDay.id);
    
    console.log('Adding custom meal:', customMeal);
    console.log('Current day:', currentDay);
    console.log('Current workout plan before update:', workoutPlan);

    setWorkoutPlan(prev => prev.map((day, index) => {
      // If adding to whole week, add to all days except past days
      if (addToWholeWeek) {
        // Only add to current day and future days in the week
        if (index >= currentDayIndex) {
          return {
            ...day,
            meals: [...day.meals, customMeal]
          };
        }
        return day;
      } else {
        // Only add to the current day
        if (day.id === currentDay.id) {
          return {
            ...day,
            meals: [...day.meals, customMeal]
          };
        }
        return day;
      }
    }));

    console.log('Custom meal added successfully (saved to localStorage)');

    // Reset form and close dialog
    setNewMeal({
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: ''
    });
    setAddToWholeWeek(false);
    setIsAddMealOpen(false);
  };


  const deleteMeal = async (dayId: string, mealIndex: number) => {
    const day = workoutPlan.find(d => d.id === dayId);
    if (!day) return;

    const meal = day.meals[mealIndex];
    if (!meal) return;

    try {
      // If the meal has a database ID, delete it from the database
      if (meal.dbId) {
        const response = await fetch(`/api/nutrition?entryId=${meal.dbId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          console.error('Failed to delete meal from database');
          alert('Failed to delete meal. Please try again.');
          return;
        }
        console.log('Meal deleted from database');
      }

      // Remove from local state
      setWorkoutPlan(prev => prev.map(d => {
        if (d.id === dayId) {
          const updatedMeals = d.meals.filter((_, index) => index !== mealIndex);
          const allCompleted = updatedMeals.every(m => m.completed);
          return { ...d, meals: updatedMeals, completed: allCompleted };
        }
        return d;
      }));

      console.log('Meal deleted successfully');
    } catch (error) {
      console.error('Error deleting meal:', error);
      alert('Failed to delete meal. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const fetchMacrosFromGemini = useCallback(async (metrics: UserMetrics) => {
    if (!metrics.age || !metrics.weight || !metrics.feetHeight || metrics.inchesHeight === undefined || !metrics.sex || !metrics.activityLevel || !metrics.primaryGoal) {
      console.log('Missing required metrics:', metrics);
      return false;
    }

    console.log('Fetching macros for metrics:', metrics);
    setIsLoadingMacros(true);
    try {
      console.log('Making API call to /api/llm/meals...');
      const response = await fetch('/api/llm/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Calculate my daily macros based on my profile:
          - Age: ${metrics.age} years
          - Height: ${metrics.feetHeight}'${metrics.inchesHeight}"
          - Weight: ${metrics.weight} lbs
          - Sex: ${metrics.sex}
          - Activity Level: ${metrics.activityLevel}
          - Goal: ${metrics.primaryGoal}
          
          Please provide my daily calorie target and macro breakdown (protein, carbs, fat in grams). Return ONLY the numbers in this exact format:
          Calories: [number]
          Protein: [number]g
          Carbs: [number]g
          Fat: [number]g`,
          userMetrics: metrics,
        }),
      });

      if (!response.ok) {
        console.error('HTTP Error:', response.status, response.statusText);
        setCalculatedMacros(null);
        return false;
      }

      const data = await response.json();
      console.log('API Response:', data);
      
      // Check for API errors first
      if (data.error) {
        console.error('API Error:', data.error);
        console.error('Full error response:', data);
        setCalculatedMacros(null);
        return false;
      }
      
      // Check if the API returned parsed macros directly
      if (data.macros && data.type === 'macros') {
        console.log('Received parsed macros from API:', data.macros);
        setCalculatedMacros(data.macros);
        return true;
      }
      
      // Fallback: try to extract macros from the response text
      if (data.response) {
        const caloriesMatch = data.response.match(/Calories?:\s*(\d+)/i);
        const proteinMatch = data.response.match(/Protein:\s*(\d+)/i);
        const carbsMatch = data.response.match(/Carbs?:\s*(\d+)/i);
        const fatMatch = data.response.match(/Fat:\s*(\d+)/i);

        if (caloriesMatch && proteinMatch && carbsMatch && fatMatch) {
          const macros = {
            calories: parseInt(caloriesMatch[1]),
            protein: parseInt(proteinMatch[1]),
            carbs: parseInt(carbsMatch[1]),
            fat: parseInt(fatMatch[1])
          };
          setCalculatedMacros(macros);
          return true;
        }
      }
      
      // If we can't parse the response, show error
      console.error('Could not parse macro values from AI response:', data);
      setCalculatedMacros(null);
      return false;
    } catch (error) {
      console.error('Error fetching macros from Gemini:', error);
      setCalculatedMacros(null);
      return false;
    } finally {
      setIsLoadingMacros(false);
    }
  }, []);


  useEffect(() => {
    if (memoizedUserMetrics) {
      generateWeeklyPlan();
      // Fetch macros from Gemini when user metrics are available
      if (hasCompleteMetrics && !calculatedMacros) {
        console.log('Fetching macros from Gemini...');
        fetchMacrosFromGemini(memoizedUserMetrics);
      }
    }
  }, [memoizedUserMetrics, generateWeeklyPlan, hasCompleteMetrics, calculatedMacros, fetchMacrosFromGemini]);

  const getCompletionPercentage = () => {
    const totalMeals = workoutPlan.reduce((sum, day) => sum + day.meals.length, 0);
    const completedMeals = workoutPlan.reduce((sum, day) => 
      sum + day.meals.filter(meal => meal.completed).length, 0
    );
    
    return totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0;
  };


  const startEditingMetrics = () => {
    if (userMetrics) {
      setEditingMetrics({ ...userMetrics });
      setIsEditingMetrics(true);
    }
  };

  // Validation helpers
  const validateMetrics = (metrics: UserMetrics | null) => {
    const errors: { age?: string; weight?: string; feetHeight?: string; inchesHeight?: string } = {};
    if (!metrics) return errors;

    if (metrics.age === undefined || Number.isNaN(metrics.age)) {
      errors.age = 'Age is required';
    } else if (metrics.age < 13 || metrics.age > 100) {
      errors.age = 'Age must be between 13 and 100';
    }

    if (metrics.weight === undefined || Number.isNaN(metrics.weight)) {
      errors.weight = 'Weight is required';
    } else if (metrics.weight < 70 || metrics.weight > 500) {
      errors.weight = 'Weight must be between 70 and 500 lbs';
    }

    if (metrics.feetHeight === undefined || Number.isNaN(metrics.feetHeight)) {
      errors.feetHeight = 'Height (feet) is required';
    } else if (metrics.feetHeight < 3 || metrics.feetHeight > 8) {
      errors.feetHeight = 'Feet must be between 3 and 8';
    }

    if (metrics.inchesHeight === undefined || Number.isNaN(metrics.inchesHeight)) {
      errors.inchesHeight = 'Height (inches) is required';
    } else if (metrics.inchesHeight < 0 || metrics.inchesHeight > 11) {
      errors.inchesHeight = 'Inches must be between 0 and 11';
    }

    return errors;
  };

  const currentValidationErrors = validateMetrics(editingMetrics);
  const hasValidationErrors = Object.keys(currentValidationErrors).length > 0;

  const cancelEditingMetrics = () => {
    setIsEditingMetrics(false);
    setEditingMetrics(null);
  };

  const saveMetrics = async () => {
    if (!editingMetrics || !user) return;

    setIsSavingMetrics(true);
    try {
      // Clamp values to allowed ranges
      const clamped = { ...editingMetrics } as UserMetrics;
      if (clamped.age !== undefined) clamped.age = Math.min(100, Math.max(13, clamped.age));
      if (clamped.weight !== undefined) clamped.weight = Math.min(500, Math.max(70, clamped.weight));
      if (clamped.feetHeight !== undefined) clamped.feetHeight = Math.min(8, Math.max(3, clamped.feetHeight));
      if (clamped.inchesHeight !== undefined) clamped.inchesHeight = Math.min(11, Math.max(0, clamped.inchesHeight));

      // Use clamped values for submission
      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.imageUrl,
          profile: {
            age: clamped.age,
            weight: clamped.weight,
            feetHeight: clamped.feetHeight,
            inchesHeight: clamped.inchesHeight,
            sex: editingMetrics.sex,
            activityLevel: editingMetrics.activityLevel,
            primaryGoal: editingMetrics.primaryGoal,
          }
        }),
      });

      if (response.ok) {
        setUserMetrics({ ...editingMetrics });
        setIsEditingMetrics(false);
        setEditingMetrics(null);
        setShowSaveAlert(true);
      }
    } catch (error) {
      console.error('Error saving metrics:', error);
    } finally {
      setIsSavingMetrics(false);
    }
  };

  const formatGoal = (goal?: string) => {
    if (!goal) return "Not set";
    return goal.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const formatActivityLevel = (level?: string) => {
    if (!level) return "Not set";
    return level.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  // Show loading while checking authentication
  if (!isLoaded || loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading your meal plan...</p>
          </div>
        </div>
      </>
    );
  }

  // Don't render anything if not signed in (will redirect)
  if (!isSignedIn) {
    return null;
  }

  if (!userMetrics) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Complete Your Profile</CardTitle>
          </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Please complete your fitness metrics to get your personalized meal plan.
              </p>
              <Button onClick={() => window.location.href = '/metrics'} className="cursor-pointer">
                Complete Profile
            </Button>
          </CardContent>
        </Card>
      </div>
      </>
    );
  }


  // Use AI-calculated macros
  const macros = calculatedMacros;

  // Compute consumed macros from the selected day (meals marked completed)
  const getTodayConsumedMacros = () => {
    // Use selectedDay instead of today's date to show macros for the currently viewed day
    const day = selectedDay || workoutPlan.find(d => d.date === formatISODateLocal(new Date()));
    if (!day) return { protein: 0, carbs: 0, fat: 0, calories: 0 };

    console.log('getTodayConsumedMacros - day:', day.date, 'meals:', day.meals);
    
    const result = day.meals.reduce((acc, meal) => {
      console.log('Processing meal:', meal.name, 'completed:', meal.completed, 'protein:', meal.protein);
      if (!meal.completed) return acc;
      return {
        protein: acc.protein + (meal.protein || 0),
        carbs: acc.carbs + (meal.carbs || 0),
        fat: acc.fat + (meal.fat || 0),
        calories: acc.calories + (meal.calories || 0),
      };
    }, { protein: 0, carbs: 0, fat: 0, calories: 0 });
    
    console.log('getTodayConsumedMacros result:', result);
    return result;
  };


  

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Macro Tips & Meal Planning for You</h1>
            <p className="text-muted-foreground">Plan your meals and track your macros for optimal nutrition</p>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[calc(100vh-12rem)]">
            {/* Left Side - Profile (wider) */}
            <div className="lg:col-span-2 space-y-6 flex flex-col">
              {/* Profile Card */}
            <Card className="flex-1">
              <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile
                    </CardTitle>
                  {!isEditingMetrics && (
                    <Button
                      size="sm"
                        variant="outline"
                      onClick={startEditingMetrics}
                        className="h-8 cursor-pointer"
                    >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                    </Button>
                  )}
                  </div>
              </CardHeader>
                <CardContent className="space-y-4">
                  {!isEditingMetrics ? (
                  <>
                      <div className="flex justify-between">
                      <span className="text-muted-foreground">Age:</span>
                        <span className="font-semibold">
                          {userMetrics.age ? `${userMetrics.age} years` : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Height:</span>
                        <span className="font-semibold">
                          {userMetrics.feetHeight && userMetrics.inchesHeight !== undefined 
                            ? `${userMetrics.feetHeight}' ${userMetrics.inchesHeight}"` 
                            : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="font-semibold">
                          {userMetrics.weight || 'Not set'}
                          {userMetrics.weight && <span className="text-sm text-muted-foreground ml-1">lbs</span>}
                        </span>
                    </div>
                      <Separator />
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Activity className="h-4 w-4" /> Activity:
                        </span>
                        <span className="font-semibold text-sm">{formatActivityLevel(userMetrics.activityLevel)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                          <Target className="h-4 w-4" /> Goal:
                      </span>
                        <span className="font-semibold text-sm">{formatGoal(userMetrics.primaryGoal)}</span>
                      </div>
                      {(!userMetrics.age || !userMetrics.weight || !userMetrics.feetHeight || userMetrics.inchesHeight === undefined || !userMetrics.sex || !userMetrics.activityLevel || !userMetrics.primaryGoal) && (
                        <>
                          <Separator />
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                            <p className="text-sm text-yellow-800">
                              <strong>Incomplete Profile:</strong> Some metrics are missing. 
                              Click the edit button to complete your profile for better recommendations.
                            </p>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Age:</span>
                        <Input
                          type="number"
                          value={editingMetrics?.age || ''}
                            min={13}
                            max={100}
                          onChange={(e) => setEditingMetrics({
                            ...editingMetrics!,
                            age: parseInt(e.target.value) || undefined
                          })}
                          className="w-20 h-8"
                        />
                          {currentValidationErrors.age && (
                            <p className="text-xs text-red-600 mt-1">{currentValidationErrors.age}</p>
                          )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Height:</span>
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            value={editingMetrics?.feetHeight || ''}
                            min={3}
                            max={8}
                            onChange={(e) => setEditingMetrics({
                              ...editingMetrics!,
                              feetHeight: parseInt(e.target.value) || undefined
                            })}
                            placeholder="Feet"
                            className="w-16 h-8"
                          />
                          {currentValidationErrors.feetHeight && (
                            <p className="text-xs text-red-600 mt-1">{currentValidationErrors.feetHeight}</p>
                          )}
                          <Input
                            type="number"
                            value={editingMetrics?.inchesHeight || ''}
                            min={0}
                            max={11}
                            onChange={(e) => setEditingMetrics({
                              ...editingMetrics!,
                              inchesHeight: parseInt(e.target.value) || undefined
                            })}
                            placeholder="Inches"
                            className="w-16 h-8"
                          />
                          {currentValidationErrors.inchesHeight && (
                            <p className="text-xs text-red-600 mt-1">{currentValidationErrors.inchesHeight}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Weight:</span>
                        <Input
                          type="number"
                          value={editingMetrics?.weight || ''}
                          min={70}
                          max={500}
                          onChange={(e) => setEditingMetrics({
                            ...editingMetrics!,
                            weight: parseFloat(e.target.value) || undefined
                          })}
                          className="w-20 h-8"
                        />
                        {currentValidationErrors.weight && (
                          <p className="text-xs text-red-600 mt-1">{currentValidationErrors.weight}</p>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Activity:</span>
                      <Select
                          value={editingMetrics?.activityLevel || ''}
                        onValueChange={(value) => setEditingMetrics({
                            ...editingMetrics!,
                          activityLevel: value
                        })}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="moderate">Moderate</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="very_active">Very Active</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Target className="h-4 w-4" /> Goal:
                      </span>
                      <Select
                          value={editingMetrics?.primaryGoal || ''}
                        onValueChange={(value) => setEditingMetrics({
                            ...editingMetrics!,
                          primaryGoal: value
                        })}
                      >
                        <SelectTrigger className="w-28 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weight_loss">Weight Loss</SelectItem>
                          <SelectItem value="lose_body_fat">Lose Body Fat</SelectItem>
                          <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="endurance">Endurance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={saveMetrics}
                        disabled={isSavingMetrics || hasValidationErrors}
                        className="bg-primary hover:bg-primary/90 cursor-pointer"
                      >
                        {isSavingMetrics ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditingMetrics}
                        className="cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Daily Macros are now integrated into the main right-side Daily Plan view below */}
          </div>

            {/* Right Side - Meal Planning */}
          <div className="lg:col-span-3">
            <Card className="min-h-[600px]">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Weekly Meal Plan
                  </CardTitle>
                <CardDescription>
                    Plan your meals and track your daily macro intake
                </CardDescription>
              </CardHeader>
                <CardContent className="min-h-[500px] flex flex-col">
                  <div className="h-full flex flex-col">
                    {/* Week Navigation */}
                    <div className="flex justify-between items-center mb-4">
                      <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="cursor-pointer">
                        ← Previous
                      </Button>
                      <div className="text-center">
                        <h3 className="font-semibold">
                          Week of {workoutPlan[0] && formatDate(workoutPlan[0].date)}
                        </h3>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="cursor-pointer">
                        Next →
                      </Button>
                    </div>

                    {/* Single Day View: integrated Macros + Meals for selectedDay */}
                    <ScrollArea className="flex-1 min-h-[400px]">
                      <div className={`transition-all duration-300 pb-4 ${
                        isTransitioning 
                          ? `opacity-50 transform ${slideDirection === 'left' ? 'translate-x-[-100%]' : slideDirection === 'right' ? 'translate-x-[100%]' : 'scale-95'}` 
                          : 'opacity-100 transform translate-x-0 scale-100'
                      }`}>
                        {selectedDay ? (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <h3 className="font-semibold">{selectedDay.day} — {formatDate(selectedDay.date)}</h3>
                                <p className="text-sm text-muted-foreground">Daily calorie & macro goals with your meals</p>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openMealDialog(selectedDay)} className="cursor-pointer">View Meals</Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                  const idx = workoutPlan.findIndex(d => d.id === selectedDay.id);
                                  if (idx > 0) {
                                    setIsTransitioning(true);
                                    setSlideDirection('right');
                                    setTimeout(() => {
                                      setSelectedDay(workoutPlan[idx - 1]);
                                      setTimeout(() => {
                                        setIsTransitioning(false);
                                        setSlideDirection(null);
                                      }, 100);
                                    }, 150);
                                  }
                                }} className="cursor-pointer">← Prev Day</Button>
                                <Button variant="outline" size="sm" onClick={() => {
                                  const idx = workoutPlan.findIndex(d => d.id === selectedDay.id);
                                  if (idx >= 0 && idx < workoutPlan.length - 1) {
                                    setIsTransitioning(true);
                                    setSlideDirection('left');
                                    setTimeout(() => {
                                      setSelectedDay(workoutPlan[idx + 1]);
                                      setTimeout(() => {
                                        setIsTransitioning(false);
                                        setSlideDirection(null);
                                      }, 100);
                                    }, 150);
                                  }
                                }} className="cursor-pointer">Next Day →</Button>
                              </div>
                            </div>

                            {/* Macros summary */}
                            <Card>
                              <CardContent>
                                {hasCompleteMetrics ? (
                                  isLoadingMacros ? (
                                    <div className="text-center p-4">
                                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                      <div className="text-sm text-muted-foreground">Calculating your macros...</div>
                                    </div>
                                  ) : macros ? (
                                    <div className="text-center p-6 bg-primary/10 rounded-lg">
                                      <div className="text-5xl md:text-6xl font-extrabold text-primary">{macros.calories}</div>
                                      <div className="text-sm text-muted-foreground">Calories/day</div>
                                      <div className="mt-4 grid grid-cols-3 gap-3">
                                        <div className="text-center p-2 bg-green-50 rounded">
                                          <div className="text-sm text-muted-foreground">Protein</div>
                                          <div className="font-medium text-lg">{getTodayConsumedMacros().protein}/{macros.protein}g</div>
                                        </div>
                                        <div className="text-center p-2 bg-yellow-50 rounded">
                                          <div className="text-sm text-muted-foreground">Carbs</div>
                                          <div className="font-medium text-lg">{getTodayConsumedMacros().carbs}/{macros.carbs}g</div>
                                        </div>
                                        <div className="text-center p-2 bg-red-50 rounded">
                                          <div className="text-sm text-muted-foreground">Fat</div>
                                          <div className="font-medium text-lg">{getTodayConsumedMacros().fat}/{macros.fat}g</div>
                                        </div>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-center p-4">
                                      <div className="text-muted-foreground mb-4">Unable to calculate macros.</div>
                                    </div>
                                  )
                                ) : (
                                  <div className="text-center p-4">
                                    <div className="text-muted-foreground mb-4">Complete your profile to see personalized macros</div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>

                            {/* Today's Meals list */}
                            <div>
                              <h4 className="text-lg font-medium mb-2">Meals for {selectedDay.day}</h4>
                              {selectedDay.meals.length === 0 ? (
                                <div className="text-muted-foreground">No meals planned yet. Add a custom meal or ask AI for suggestions.</div>
                              ) : (
                                <div className="space-y-3">
                                  {selectedDay.meals.map((meal, index) => (
                                    <Card key={index} className={`p-3 ${meal.completed ? 'bg-purple-50' : ''}`}>
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <div className="font-semibold">{meal.name}</div>
                                          <div className="text-xs text-muted-foreground">{meal.calories} kcal • {meal.protein}p • {meal.carbs}c • {meal.fat}f</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                          <button 
                                            onClick={() => toggleMealCompletion(selectedDay.id, index)} 
                                            disabled={isDateInFuture(selectedDay.date)}
                                            className={`px-3 py-1 text-sm rounded cursor-pointer ${
                                              meal.completed 
                                                ? 'bg-purple-600 text-white' 
                                                : isDateInFuture(selectedDay.date)
                                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                  : 'bg-white border hover:bg-gray-50'
                                            }`}
                                          >
                                            {meal.completed ? 'Eaten' : isDateInFuture(selectedDay.date) ? 'Future Meal' : 'Mark as Eaten'}
                                          </button>
                                          <button onClick={() => deleteMeal(selectedDay.id, index)} className="text-xs text-red-500 cursor-pointer">Delete</button>
                                        </div>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground">No day selected</div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Progress Summary */}
                    <div className="mt-4 pt-4 border-t bg-white">
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-primary">
                            {workoutPlan.filter(day => day.completed).length}/7
                          </div>
                          <p className="text-xs text-muted-foreground">Days Planned</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-primary">
                            {getCompletionPercentage()}%
                          </div>
                          <p className="text-xs text-muted-foreground">Meal Progress</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-primary">
                            {workoutPlan.reduce((sum, day) => sum + day.meals.filter(meal => meal.completed).length, 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">Meals Eaten</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-primary">
                            {Math.round(workoutPlan.reduce((sum, day) => 
                              sum + day.meals.filter(meal => meal.completed).reduce((daySum, meal) => daySum + meal.calories, 0), 0
                            ) / 7)}
                          </div>
                          <p className="text-xs text-muted-foreground">Avg Calories</p>
                        </div>
                      </div>
                    </div>
                  </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      </div>

      {/* Chat Widget */}

      {/* Meal Dialog */}
      <Dialog open={isMealDialogOpen} onOpenChange={setIsMealDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDay?.day} - {selectedDay && formatDate(selectedDay.date)} Meals
            </DialogTitle>
            <DialogDescription>
              View and manage your suggested meals for this day
            </DialogDescription>
          </DialogHeader>
          
          {selectedDay && getCurrentDayData() && (
            <div className={`space-y-4 transition-all duration-300 ${
              isTransitioning 
                ? `opacity-50 transform ${slideDirection === 'left' ? 'translate-x-[-100%]' : slideDirection === 'right' ? 'translate-x-[100%]' : 'scale-95'}` 
                : 'opacity-100 transform translate-x-0 scale-100'
            }`}>
              {getCurrentDayData()!.meals.length > 0 ? (
                getCurrentDayData()!.meals.map((meal, index) => (
                <Card key={index} className={`transition-all duration-200 relative ${
                  meal.completed ? 'bg-purple-100 border-purple-300 shadow-lg' : 'bg-white'
                }`}>
                  <CardContent className="p-4">
                    {/* Delete button */}
                    <button
                      onClick={() => deleteMeal(getCurrentDayData()!.id, index)}
                      className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors duration-200 cursor-pointer"
                      title="Delete meal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    
                    <div className="flex justify-between items-start">
                      <div className="flex-1 pr-6">
                        <h4 className="font-semibold text-lg mb-2">{meal.name}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <div className="font-semibold text-blue-600">{meal.calories}</div>
                            <div className="text-xs text-muted-foreground">Calories</div>
                          </div>
                          <div className="text-center p-2 bg-green-50 rounded">
                            <div className="font-semibold text-green-600">{meal.protein}g</div>
                            <div className="text-xs text-muted-foreground">Protein</div>
                          </div>
                          <div className="text-center p-2 bg-yellow-50 rounded">
                            <div className="font-semibold text-yellow-600">{meal.carbs}g</div>
                            <div className="text-xs text-muted-foreground">Carbs</div>
                          </div>
                          <div className="text-center p-2 bg-purple-50 rounded">
                            <div className="font-semibold text-purple-600">{meal.fat}g</div>
                            <div className="text-xs text-muted-foreground">Fat</div>
                          </div>
                        </div>
                      </div>
                        <button
                          onClick={() => toggleMealCompletion(getCurrentDayData()!.id, index)}
                          disabled={isDateInFuture(getCurrentDayData()!.date)}
                          className={`ml-4 cursor-pointer px-3 py-1.5 text-sm font-medium rounded-md border transition-all duration-200 ${
                            meal.completed 
                              ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600' 
                              : isDateInFuture(getCurrentDayData()!.date)
                                ? 'bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed'
                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
                          }`}
                        >
                        {meal.completed ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1 inline" />
                            Eaten
                          </>
                        ) : isDateInFuture(getCurrentDayData()!.date) ? (
                          <>
                            <Circle className="h-4 w-4 mr-1 inline" />
                            Future Meal
                          </>
                        ) : (
                          <>
                            <Circle className="h-4 w-4 mr-1 inline" />
                            Mark as Eaten
                          </>
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">
                    <h3 className="text-lg font-semibold mb-2">No meals planned yet</h3>
                    <p className="text-sm">Add your own meals or ask the AI to suggest some!</p>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full cursor-pointer"
                  onClick={() => setIsAddMealOpen(true)}
                >
                  + Add Custom Meal
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full cursor-pointer text-sm"
                  onClick={() => {
                    // This will be handled by the chat widget
                    console.log('Ask AI for meal suggestions');
                  }}
                >
                  🤖 Ask AI for Meal Suggestions
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Custom Meal Dialog */}
      <Dialog open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Custom Meal</DialogTitle>
            <DialogDescription>
              Enter the details for your custom meal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Meal Name</label>
              <Input
                value={newMeal.name}
                onChange={(e) => setNewMeal({...newMeal, name: e.target.value})}
                placeholder="e.g., Grilled Salmon"
                className="w-full"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Calories</label>
                <Input
                  type="number"
                  value={newMeal.calories}
                  onChange={(e) => setNewMeal({...newMeal, calories: e.target.value})}
                  placeholder="300"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Protein (g)</label>
                <Input
                  type="number"
                  value={newMeal.protein}
                  onChange={(e) => setNewMeal({...newMeal, protein: e.target.value})}
                  placeholder="25"
                  className="w-full"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Carbs (g)</label>
                <Input
                  type="number"
                  value={newMeal.carbs}
                  onChange={(e) => setNewMeal({...newMeal, carbs: e.target.value})}
                  placeholder="20"
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Fat (g)</label>
                <Input
                  type="number"
                  value={newMeal.fat}
                  onChange={(e) => setNewMeal({...newMeal, fat: e.target.value})}
                  placeholder="8"
                  className="w-full"
                />
              </div>
            </div>
            
            {/* Add to whole week option */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="checkbox"
                id="addToWeek"
                checked={addToWholeWeek}
                onChange={(e) => setAddToWholeWeek(e.target.checked)}
                className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <label htmlFor="addToWeek" className="text-sm text-gray-700 cursor-pointer">
                Add this meal to the rest of the week (from today onwards)
              </label>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={addCustomMeal}
                className="flex-1 cursor-pointer"
              >
                Add Meal
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsAddMealOpen(false)}
                className="flex-1 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Alert */}
      <AlertDialog open={showSaveAlert} onOpenChange={setShowSaveAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-green-600">Success!</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile has been updated successfully!
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowSaveAlert(false)}
              className="bg-primary hover:bg-primary/90 cursor-pointer"
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MacroTips;