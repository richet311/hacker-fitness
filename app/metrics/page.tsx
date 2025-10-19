"use client"

import React, { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

// Import shadcn/ui components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const Metrics = () => {
  const { user } = useUser();
  const router = useRouter(); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    age: '',
    sex: '',
    weight: '',
    feetHeight: '',
    inchesHeight: '',
    activityLevel: '',
    primaryGoal: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!user) {
      setError("You must be logged in to save your metrics.");
      return;
    }

    // Basic validation
    if (!formData.age || !formData.sex || !formData.weight || !formData.feetHeight || 
        !formData.inchesHeight || !formData.activityLevel || !formData.primaryGoal) {
      setError("Please fill in all fields.");
      return;
    }

    const age = parseInt(formData.age);
    const weight = parseFloat(formData.weight);
    const feetHeight = parseInt(formData.feetHeight);
    const inchesHeight = parseInt(formData.inchesHeight);

    if (age < 13 || age > 100) {
      setError("Age must be between 13 and 100.");
      return;
    }

    if (weight < 70 || weight > 500) {
      setError("Weight must be between 70 and 500 lbs.");
      return;
    }

    if (feetHeight < 3 || feetHeight > 8) {
      setError("Height in feet must be between 3 and 8.");
      return;
    }

    if (inchesHeight < 0 || inchesHeight > 11) {
      setError("Height in inches must be between 0 and 11.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/user-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.imageUrl,
          profile: {
            age,
            sex: formData.sex,
            weight,
            feetHeight,
            inchesHeight,
            activityLevel: formData.activityLevel,
            primaryGoal: formData.primaryGoal,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save profile. Please try again.');
      }

      console.log("Profile saved successfully!");
      router.push('/macro-meals'); 

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900">Your Metrics</h1>
          <p className="text-slate-500 mt-2">Enter your details to get started.</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-6">
          
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input 
              id="age"
              type="number" 
              placeholder="13-100" 
              value={formData.age}
              onChange={(e) => handleInputChange('age', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sex">Sex</Label>
            <Select value={formData.sex} onValueChange={(value) => handleInputChange('sex', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select your sex" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Weight (lbs)</Label>
            <Input 
              id="weight"
              type="number" 
              placeholder="70-500" 
              value={formData.weight}
              onChange={(e) => handleInputChange('weight', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Height</Label>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input 
                  type="number" 
                  placeholder="Feet (3-8)" 
                  value={formData.feetHeight}
                  onChange={(e) => handleInputChange('feetHeight', e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Input 
                  type="number" 
                  placeholder="Inches (0-11)" 
                  value={formData.inchesHeight}
                  onChange={(e) => handleInputChange('inchesHeight', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activityLevel">Activity Level</Label>
            <Select value={formData.activityLevel} onValueChange={(value) => handleInputChange('activityLevel', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="light">Lightly active</SelectItem>
                <SelectItem value="moderate">Moderately active</SelectItem>
                <SelectItem value="active">Very active</SelectItem>
                <SelectItem value="very_active">Extra active</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryGoal">Primary Goal</Label>
            <Select value={formData.primaryGoal} onValueChange={(value) => handleInputChange('primaryGoal', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select primary goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weight_loss">Weight Loss</SelectItem>
                <SelectItem value="fat_loss">Lose Body Fat</SelectItem>
                <SelectItem value="muscle_gain">Muscle Gain</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="endurance">Endurance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          
          <Button type="submit" className="w-full cursor-pointer" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save and Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default Metrics;