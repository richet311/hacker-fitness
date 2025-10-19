"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Dumbbell, Plus, X, CheckCircle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Exercise = {
  id?: string;
  name: string;
  category: string;
  sets: number;
  reps: number;
  weight?: number;
  notes?: string;
};

type Workout = {
  id: string;
  name: string;
  type: string;
  duration: number;
  caloriesBurned?: number;
  notes?: string;
  date: string;
  exercises: Exercise[];
  completed?: boolean;
};

type DayPlan = {
  id: string;
  day: string;
  date: string;
  workouts: Workout[];
};

const MUSCLE_GROUPS = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "legs", label: "Legs" },
  { value: "core", label: "Core" },
  { value: "cardio", label: "Cardio" },
];

const Timeline = () => {
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [isWorkoutDialogOpen, setIsWorkoutDialogOpen] = useState(false);
  const [isAddWorkoutOpen, setIsAddWorkoutOpen] = useState(false);
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [hoveredMuscle, setHoveredMuscle] = useState<string | null>(null);
  const [newWorkout, setNewWorkout] = useState({
    name: '',
    sets: '',
    reps: '',
    weight: '',
  });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Check authentication and redirect if needed
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/?auth-required=true');
    }
  }, [isLoaded, isSignedIn, router]);

  const generateWeeklyPlan = useCallback(() => {
    const startOfWeek = new Date(currentWeek);
    startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const plan: DayPlan[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      plan.push({
        id: `day-${i}`,
        day: days[i],
        date: date.toISOString().split('T')[0],
        workouts: []
      });
    }

    setWeekPlan(plan);
  }, [currentWeek]);


  useEffect(() => {
    generateWeeklyPlan();
  }, [generateWeeklyPlan]);

  // Save workout plan to localStorage whenever it changes
  useEffect(() => {
    if (weekPlan.length > 0) {
      const weekKey = `workoutPlan_${currentWeek.toISOString().split('T')[0]}`;
      console.log('Saving workout plan to localStorage:', weekKey, weekPlan);
      localStorage.setItem(weekKey, JSON.stringify(weekPlan));
    }
  }, [weekPlan, currentWeek]);

  // Load workout plan from localStorage on component mount or week change
  // and merge with database workouts
  useEffect(() => {
    const loadPlanAndMergeWorkouts = async () => {
      const weekKey = `workoutPlan_${currentWeek.toISOString().split('T')[0]}`;
      const savedPlan = localStorage.getItem(weekKey);
      
      let plan: DayPlan[];
      
      if (savedPlan) {
        try {
          plan = JSON.parse(savedPlan);
          console.log('Loading saved workout plan:', plan);
        } catch (error) {
          console.error('Error loading saved workout plan:', error);
          // If there's an error, generate a new plan
          generateWeeklyPlan();
          return;
        }
      } else {
        // No saved data for this week, generate new plan
        console.log('No saved plan found, generating new plan');
        generateWeeklyPlan();
        return;
      }

      // Fetch workouts from database
      if (user) {
        try {
          const startOfWeek = new Date(currentWeek);
          startOfWeek.setDate(currentWeek.getDate() - currentWeek.getDay());
          
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);

          const response = await fetch(
            `/api/workouts?clerkId=${user.id}&startDate=${startOfWeek.toISOString()}&endDate=${endOfWeek.toISOString()}`
          );

          if (response.ok) {
            const data = await response.json();
            console.log('Fetched workouts data:', data);
            
            // Merge database workouts with the plan
            plan = plan.map(day => {
              const dayWorkouts = data.workouts.filter((w: Workout) => {
                const workoutDate = new Date(w.date).toISOString().split('T')[0];
                return workoutDate === day.date;
              });
              
              return {
                ...day,
                workouts: dayWorkouts
              };
            });
          }
        } catch (error) {
          console.error("Error fetching workouts:", error);
        }
      }

      setWeekPlan(plan);
      setLoading(false);
    };

    loadPlanAndMergeWorkouts();
  }, [currentWeek, user, generateWeeklyPlan]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setIsTransitioning(true);
    setSlideDirection(direction === 'prev' ? 'right' : 'left');
    
    setTimeout(() => {
      const newWeek = new Date(currentWeek);
      newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
      setCurrentWeek(newWeek);
      
      setTimeout(() => {
        setIsTransitioning(false);
        setSlideDirection(null);
      }, 100);
    }, 150);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const openWorkoutDialog = (day: DayPlan) => {
    setSelectedDay(day);
    setIsWorkoutDialogOpen(true);
  };

  const toggleMuscleGroup = (muscle: string) => {
    setSelectedMuscles(prev => 
      prev.includes(muscle) 
        ? prev.filter(m => m !== muscle)
        : [...prev, muscle]
    );
  };

  const addWorkout = async () => {
    // Debug logging
    console.log('=== ADD WORKOUT DEBUG ===');
    console.log('Validation check:', {
      name: newWorkout.name,
      selectedMuscles: selectedMuscles,
      sets: newWorkout.sets,
      reps: newWorkout.reps,
      selectedDay: selectedDay,
      user: user ? { id: user.id, email: user.primaryEmailAddress?.emailAddress } : null
    });
    console.log('selectedDay.date:', selectedDay?.date);
    console.log('user.id:', user?.id);

    if (!newWorkout.name.trim()) {
      setAlertMessage('Please enter a workout name');
      setShowAlert(true);
      return;
    }

    if (selectedMuscles.length === 0) {
      setAlertMessage('Please select at least one muscle group');
      setShowAlert(true);
      return;
    }

    if (!newWorkout.sets.trim() || !newWorkout.reps.trim()) {
      setAlertMessage('Please fill in both sets and reps');
      setShowAlert(true);
      return;
    }

    if (!selectedDay || !user) {
      setAlertMessage('Please select a day and ensure you are logged in');
      setShowAlert(true);
      return;
    }

    try {
      // Create exercises for each selected muscle group
      const exercises = selectedMuscles.map(muscle => ({
        name: newWorkout.name,
        category: muscle,
        sets: parseInt(newWorkout.sets),
        reps: parseInt(newWorkout.reps),
        weight: newWorkout.weight ? parseFloat(newWorkout.weight) : undefined,
      }));

      const requestBody = {
        clerkId: user.id,
        name: newWorkout.name,
        type: 'strength',
        duration: 0,
        date: selectedDay.date,
        exercises,
      };

      console.log('Sending workout request:', requestBody);

      const response = await fetch('/api/workouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (response.ok) {
        const result = await response.json();
        console.log('Workout created successfully:', result);
        
        // Add the workout to the current day's plan immediately
        setWeekPlan(prev => prev.map(day => {
          if (day.id === selectedDay.id) {
            return {
              ...day,
              workouts: [...day.workouts, result.workout]
            };
          }
          return day;
        }));
        
        // Reset form
        setNewWorkout({ name: '', sets: '', reps: '', weight: '' });
        setSelectedMuscles([]);
        setIsAddWorkoutOpen(false);
      } else {
        const errorData = await response.json();
        console.error('Failed to create workout:', errorData);
        setAlertMessage(`Failed to create workout: ${errorData.error || 'Unknown error'}`);
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Error adding workout:', error);
      setAlertMessage('Failed to add workout. Please try again.');
      setShowAlert(true);
    }
  };

  const deleteWorkout = async (workoutId: string) => {
    try {
      const response = await fetch(`/api/workouts?workoutId=${workoutId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove the workout from the current day's plan immediately
        setWeekPlan(prev => prev.map(day => {
          if (selectedDay && day.id === selectedDay.id) {
            return {
              ...day,
              workouts: day.workouts.filter(w => w.id !== workoutId)
            };
          }
          return day;
        }));
      }
    } catch (error) {
      console.error('Error deleting workout:', error);
      setAlertMessage('Failed to delete workout. Please try again.');
      setShowAlert(true);
    }
  };

  const toggleWorkoutCompletion = async (workoutId: string) => {
    if (!user) return;

    const currentDay = getCurrentDayData();
    if (!currentDay) return;

    const workout = currentDay.workouts.find(w => w.id === workoutId);
    if (!workout) return;

    const isCompleting = !workout.completed;

    try {
      // For now, just update the local state until Prisma client is regenerated
      setWeekPlan(prev => prev.map(day => {
        if (day.id === currentDay.id) {
          return {
            ...day,
            workouts: day.workouts.map(w => 
              w.id === workoutId ? { ...w, completed: isCompleting } : w
            )
          };
        }
        return day;
      }));
      console.log(`Workout ${isCompleting ? 'completed' : 'uncompleted'} successfully (local state only)`);
    } catch (error) {
      console.error('Error toggling workout completion:', error);
      setAlertMessage('Failed to update workout status. Please try again.');
      setShowAlert(true);
    }
  };

  const getCurrentDayData = () => {
    if (!selectedDay) return null;
    return weekPlan.find(day => day.id === selectedDay.id) || selectedDay;
  };

  const getMuscleColor = (category: string, isSelected: boolean = false) => {
    if (isSelected) {
      return "bg-yellow-300 text-yellow-900 border-yellow-500";
    }
    return "bg-blue-100 text-blue-700 border-blue-300";
  };

  // Show loading while checking authentication
  if (!isLoaded || loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your workout timeline...</p>
          </div>
        </div>
      </>
    );
  }

  // Don't render anything if not signed in (will redirect)
  if (!isSignedIn) {
    return null;
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Workout Timeline</h1>
            <p className="text-muted-foreground">Track your workouts and muscle groups across the week</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
            {/* Left Side - Anatomy Visualization */}
            <div className="lg:col-span-1">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5" />
                    Muscle Groups
                  </CardTitle>
                  <CardDescription>Select target areas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Human Body SVG */}
                  <div className="relative w-full aspect-[3/4] bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg p-4">
                    <svg viewBox="0 0 200 300" className="w-full h-full">
                      {/* Head */}
                      <ellipse cx="100" cy="30" rx="20" ry="25" fill="#d1d5db" stroke="#333" strokeWidth="2" />
                      
                      {/* Shoulders */}
                      <rect 
                        x="60" y="55" width="80" height="15" rx="5" 
                        fill={selectedMuscles.includes('shoulders') ? '#fde047' : hoveredMuscle === 'shoulders' ? '#bfdbfe' : '#93c5fd'}
                        stroke={selectedMuscles.includes('shoulders') ? '#eab308' : '#333'}
                        strokeWidth={selectedMuscles.includes('shoulders') ? '3' : '2'}
                        onMouseEnter={() => setHoveredMuscle('shoulders')}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        onClick={() => toggleMuscleGroup('shoulders')}
                        className="cursor-pointer transition-all"
                      />
                      
                      {/* Chest */}
                      <ellipse 
                        cx="100" cy="85" rx="30" ry="20"
                        fill={selectedMuscles.includes('chest') ? '#fde047' : hoveredMuscle === 'chest' ? '#bfdbfe' : '#93c5fd'}
                        stroke={selectedMuscles.includes('chest') ? '#eab308' : '#333'}
                        strokeWidth={selectedMuscles.includes('chest') ? '3' : '2'}
                        onMouseEnter={() => setHoveredMuscle('chest')}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        onClick={() => toggleMuscleGroup('chest')}
                        className="cursor-pointer transition-all"
                      />
                      
                      {/* Core */}
                      <rect 
                        x="75" y="105" width="50" height="40" rx="5"
                        fill={selectedMuscles.includes('core') ? '#fde047' : hoveredMuscle === 'core' ? '#bfdbfe' : '#93c5fd'}
                        stroke={selectedMuscles.includes('core') ? '#eab308' : '#333'}
                        strokeWidth={selectedMuscles.includes('core') ? '3' : '2'}
                        onMouseEnter={() => setHoveredMuscle('core')}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        onClick={() => toggleMuscleGroup('core')}
                        className="cursor-pointer transition-all"
                      />
                      
                      {/* Arms - Left */}
                      <rect 
                        x="40" y="70" width="15" height="60" rx="7"
                        fill={selectedMuscles.includes('arms') ? '#fde047' : hoveredMuscle === 'arms' ? '#bfdbfe' : '#93c5fd'}
                        stroke={selectedMuscles.includes('arms') ? '#eab308' : '#333'}
                        strokeWidth={selectedMuscles.includes('arms') ? '3' : '2'}
                        onMouseEnter={() => setHoveredMuscle('arms')}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        onClick={() => toggleMuscleGroup('arms')}
                        className="cursor-pointer transition-all"
                      />
                      
                      {/* Arms - Right */}
                      <rect 
                        x="145" y="70" width="15" height="60" rx="7"
                        fill={selectedMuscles.includes('arms') ? '#fde047' : hoveredMuscle === 'arms' ? '#bfdbfe' : '#93c5fd'}
                        stroke={selectedMuscles.includes('arms') ? '#eab308' : '#333'}
                        strokeWidth={selectedMuscles.includes('arms') ? '3' : '2'}
                        onMouseEnter={() => setHoveredMuscle('arms')}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        onClick={() => toggleMuscleGroup('arms')}
                        className="cursor-pointer transition-all"
                      />
                      
                      {/* Back (indicated behind) */}
                      <ellipse 
                        cx="100" cy="95" rx="25" ry="25"
                        fill={selectedMuscles.includes('back') ? '#fde047' : hoveredMuscle === 'back' ? '#bfdbfe' : 'none'}
                        stroke={selectedMuscles.includes('back') ? '#eab308' : hoveredMuscle === 'back' ? '#333' : '#666'}
                        strokeWidth={selectedMuscles.includes('back') ? '3' : '2'}
                        strokeDasharray="4"
                        onMouseEnter={() => setHoveredMuscle('back')}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        onClick={() => toggleMuscleGroup('back')}
                        className="cursor-pointer transition-all"
                      />
                      
                      {/* Legs - Left */}
                      <rect 
                        x="70" y="145" width="20" height="100" rx="10"
                        fill={selectedMuscles.includes('legs') ? '#fde047' : hoveredMuscle === 'legs' ? '#bfdbfe' : '#93c5fd'}
                        stroke={selectedMuscles.includes('legs') ? '#eab308' : '#333'}
                        strokeWidth={selectedMuscles.includes('legs') ? '3' : '2'}
                        onMouseEnter={() => setHoveredMuscle('legs')}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        onClick={() => toggleMuscleGroup('legs')}
                        className="cursor-pointer transition-all"
                      />
                      
                      {/* Legs - Right */}
                      <rect 
                        x="110" y="145" width="20" height="100" rx="10"
                        fill={selectedMuscles.includes('legs') ? '#fde047' : hoveredMuscle === 'legs' ? '#bfdbfe' : '#93c5fd'}
                        stroke={selectedMuscles.includes('legs') ? '#eab308' : '#333'}
                        strokeWidth={selectedMuscles.includes('legs') ? '3' : '2'}
                        onMouseEnter={() => setHoveredMuscle('legs')}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        onClick={() => toggleMuscleGroup('legs')}
                        className="cursor-pointer transition-all"
                      />
                      
                      {/* Cardio heart icon */}
                      <g 
                        onMouseEnter={() => setHoveredMuscle('cardio')}
                        onMouseLeave={() => setHoveredMuscle(null)}
                        onClick={() => toggleMuscleGroup('cardio')}
                        className="cursor-pointer"
                      >
                        <path 
                          d="M100,110 L95,105 Q85,95 85,85 Q85,75 95,75 Q100,75 100,80 Q100,75 105,75 Q115,75 115,85 Q115,95 105,105 Z"
                          fill={selectedMuscles.includes('cardio') ? '#fde047' : hoveredMuscle === 'cardio' ? '#bfdbfe' : '#93c5fd'}
                          stroke={selectedMuscles.includes('cardio') ? '#eab308' : '#333'}
                          strokeWidth={selectedMuscles.includes('cardio') ? '2' : '1.5'}
                        />
                      </g>
                    </svg>
                  </div>

                  <Separator />

                  {/* Muscle Groups List */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground">Available Muscle Groups</h3>
                    <p className="text-xs text-muted-foreground">Click to select muscles to work on</p>
                    <div className="grid grid-cols-1 gap-2">
                      {MUSCLE_GROUPS.map(muscle => (
                        <Badge 
                          key={muscle.value}
                          variant="outline"
                          className={`justify-start cursor-pointer hover:opacity-80 transition-all ${
                            selectedMuscles.includes(muscle.value)
                              ? 'bg-yellow-300 text-yellow-900 border-yellow-500 ring-2 ring-yellow-400 ring-offset-1'
                              : 'bg-blue-100 text-blue-700 border-blue-300'
                          } ${
                            hoveredMuscle === muscle.value ? 'ring-2 ring-offset-2 ring-blue-400' : ''
                          }`}
                          onMouseEnter={() => setHoveredMuscle(muscle.value)}
                          onMouseLeave={() => setHoveredMuscle(null)}
                          onClick={() => toggleMuscleGroup(muscle.value)}
                        >
                          {selectedMuscles.includes(muscle.value) && <CheckCircle className="h-3 w-3 mr-1" />}
                          {muscle.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Workout Calendar */}
            <div className="lg:col-span-3">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Weekly Workout Plan
                  </CardTitle>
                  <CardDescription>
                    Plan and track your workouts for each muscle group
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[calc(100%-5rem)] overflow-hidden">
                  <div className="h-full flex flex-col">
                    {/* Week Navigation */}
                    <div className="flex justify-between items-center mb-4">
                      <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')} className="cursor-pointer">
                        ← Previous
                      </Button>
                      <div className="text-center">
                        <h3 className="font-semibold">
                          Week of {weekPlan[0] && formatDate(weekPlan[0].date)}
                        </h3>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigateWeek('next')} className="cursor-pointer">
                        Next →
                      </Button>
                    </div>

                    {/* Weekly Plan Grid */}
                    <ScrollArea className="flex-1">
                      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 transition-all duration-300 ${
                        isTransitioning 
                          ? `opacity-50 transform ${slideDirection === 'left' ? 'translate-x-[-100%]' : slideDirection === 'right' ? 'translate-x-[100%]' : 'scale-95'}` 
                          : 'opacity-100 transform translate-x-0 scale-100'
                      }`}>
                        {weekPlan.map((day) => {
                          const completedWorkouts = day.workouts?.filter(w => w.completed).length || 0;
                          const totalWorkouts = day.workouts?.length || 0;
                          const isDayCompleted = totalWorkouts > 0 && completedWorkouts === totalWorkouts;
                          
                          return (
                          <Card 
                            key={day.id} 
                            className={`transition-all duration-200 hover:shadow-md ${
                              isDayCompleted 
                                ? 'bg-green-100 border-green-300 shadow-lg' 
                                : 'bg-white'
                            }`}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-center">
                                <div>
                                  <CardTitle className="text-sm">{day.day}</CardTitle>
                                  <p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="space-y-3">
                                {/* Workouts Summary */}
                                <div className="text-center min-h-[60px]">
                                  {day.workouts && day.workouts.length > 0 ? (
                                    <>
                                      <h5 className="text-sm font-semibold text-muted-foreground mb-2">
                                        {completedWorkouts}/{totalWorkouts} Workout{totalWorkouts !== 1 ? 's' : ''} Complete
                                      </h5>
                                      <div className="flex flex-wrap gap-1 justify-center">
                                        {[...new Set(day.workouts.flatMap(w => w.exercises?.map(e => e.category) || []))].slice(0, 3).map((category, idx) => (
                                          <Badge 
                                            key={idx} 
                                            variant="outline" 
                                            className={`text-xs ${getMuscleColor(category, true)}`}
                                          >
                                            {MUSCLE_GROUPS.find(m => m.value === category)?.label || category}
                                          </Badge>
                                        ))}
                                        {[...new Set(day.workouts.flatMap(w => w.exercises?.map(e => e.category) || []))].length > 3 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{[...new Set(day.workouts.flatMap(w => w.exercises?.map(e => e.category) || []))].length - 3}
                                          </Badge>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <h5 className="text-sm font-semibold text-muted-foreground mb-2">
                                        No Workouts
                                      </h5>
                                      <div className="text-xs text-muted-foreground">
                                        Click to add
                                      </div>
                                    </>
                                  )}
                                </div>
                                
                                {/* View Workouts Button */}
                                <Button
                                  size="sm"
                                  variant="outline" 
                                  className="w-full text-sm h-12 px-4 cursor-pointer flex items-center justify-center"
                                  onClick={() => openWorkoutDialog(day)}
                                >
                                  {day.workouts && day.workouts.length > 0 ? 'View Workouts' : 'Add Workout'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>

                    {/* Progress Summary */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-bold text-primary">
                            {weekPlan.filter(day => day.workouts && day.workouts.length > 0).length}/7
                          </div>
                          <p className="text-xs text-muted-foreground">Days Trained</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-primary">
                            {weekPlan.reduce((sum, day) => sum + (day.workouts?.length || 0), 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Workouts</p>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-primary">
                            {weekPlan.reduce((sum, day) => sum + (day.workouts?.flatMap(w => w.exercises || []).length || 0), 0)}
                          </div>
                          <p className="text-xs text-muted-foreground">Total Exercises</p>
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

      {/* Workout Dialog */}
      <Dialog open={isWorkoutDialogOpen} onOpenChange={setIsWorkoutDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDay?.day} - {selectedDay && formatDate(selectedDay.date)} Workouts
            </DialogTitle>
            <DialogDescription>
              View and manage your workouts for this day
            </DialogDescription>
          </DialogHeader>
          
          {selectedDay && getCurrentDayData() && (
            <div className={`space-y-4 transition-all duration-300 ${
              isTransitioning 
                ? `opacity-50 transform ${slideDirection === 'left' ? 'translate-x-[-100%]' : slideDirection === 'right' ? 'translate-x-[100%]' : 'scale-95'}` 
                : 'opacity-100 transform translate-x-0 scale-100'
            }`}>
              {getCurrentDayData()!.workouts && getCurrentDayData()!.workouts.length > 0 ? (
                getCurrentDayData()!.workouts.map((workout) => (
                  <Card 
                    key={workout.id} 
                    className={`transition-all duration-200 relative ${
                      workout.completed 
                        ? 'bg-green-100 border-green-300 shadow-lg' 
                        : 'bg-white'
                    }`}
                  >
                    <CardContent className="p-4">
                      {/* Delete button */}
                      <button
                        onClick={() => deleteWorkout(workout.id)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors duration-200 cursor-pointer"
                        title="Delete workout"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between pr-6">
                          <h4 className="font-semibold text-lg">{workout.name}</h4>
                          {workout.completed && (
                            <Badge className="bg-green-600 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        
                        {/* Exercises */}
                        <div className="space-y-2">
                          {workout.exercises && workout.exercises.map((exercise, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Badge 
                                  variant="outline" 
                                  className={getMuscleColor(exercise.category, true)}
                                >
                                  {MUSCLE_GROUPS.find(m => m.value === exercise.category)?.label || exercise.category}
                                </Badge>
                                <div>
                                  <div className="font-medium">{exercise.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {exercise.sets} sets × {exercise.reps} reps
                                    {exercise.weight && ` @ ${exercise.weight} lbs`}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Completion Button */}
                        <div className="pt-2">
                          <Button
                            onClick={() => toggleWorkoutCompletion(workout.id)}
                            className={`w-full cursor-pointer ${
                              workout.completed
                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {workout.completed ? (
                              <>
                                <X className="h-4 w-4 mr-2" />
                                Mark as Incomplete
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Complete
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="text-muted-foreground mb-4">
                    <h3 className="text-lg font-semibold mb-2">No workouts planned yet</h3>
                    <p className="text-sm">Add your first workout for this day!</p>
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="w-full cursor-pointer"
                  onClick={() => setIsAddWorkoutOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Workout
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Workout Dialog */}
      <Dialog open={isAddWorkoutOpen} onOpenChange={setIsAddWorkoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Workout</DialogTitle>
            <DialogDescription>
              Enter workout details and select target muscle groups
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Workout Name</label>
              <Input
                value={newWorkout.name}
                onChange={(e) => setNewWorkout({...newWorkout, name: e.target.value})}
                placeholder="e.g., Bench Press, Squats, etc."
                className="w-full"
              />
            </div>
            
            {/* Muscle Group Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Target Muscle Groups (select one or more)</label>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map(muscle => (
                  <Badge
                    key={muscle.value}
                    variant="outline"
                    className={`cursor-pointer transition-all ${
                      selectedMuscles.includes(muscle.value)
                        ? 'bg-yellow-300 text-yellow-900 border-yellow-500 ring-2 ring-yellow-400 ring-offset-1'
                        : 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
                    }`}
                    onClick={() => toggleMuscleGroup(muscle.value)}
                  >
                    {selectedMuscles.includes(muscle.value) && <CheckCircle className="h-3 w-3 mr-1" />}
                    {muscle.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Sets</label>
                <Input
                  type="number"
                  value={newWorkout.sets}
                  onChange={(e) => setNewWorkout({...newWorkout, sets: e.target.value})}
                  placeholder="3"
                  className="w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Reps</label>
                <Input
                  type="number"
                  value={newWorkout.reps}
                  onChange={(e) => setNewWorkout({...newWorkout, reps: e.target.value})}
                  placeholder="12"
                  className="w-full"
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Weight (lbs)</label>
                <Input
                  type="number"
                  value={newWorkout.weight}
                  onChange={(e) => setNewWorkout({...newWorkout, weight: e.target.value})}
                  placeholder="Optional"
                  className="w-full"
                  min="0"
                  step="5"
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={addWorkout}
                className="flex-1 cursor-pointer"
              >
                Add Workout
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsAddWorkoutOpen(false);
                  setNewWorkout({ name: '', sets: '', reps: '', weight: '' });
                  setSelectedMuscles([]);
                }}
                className="flex-1 cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <AlertDialog open={showAlert} onOpenChange={setShowAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Validation Error</AlertDialogTitle>
            <AlertDialogDescription>
              {alertMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction 
              onClick={() => setShowAlert(false)}
              className="bg-primary hover:bg-primary/90 cursor-pointer"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Timeline;
