"use client";

import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";

function HomeContent() {
  const searchParams = useSearchParams();
  const { isSignedIn } = useUser();
  const [showAuthAlert, setShowAuthAlert] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (searchParams.get('auth-required') === 'true') {
      setShowAuthAlert(true);
    }
  }, [searchParams]);

  return (
    <>
      {/* Auth Required Alert */}
      <AlertDialog open={showAuthAlert} onOpenChange={setShowAuthAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Authentication Required</AlertDialogTitle>
            <AlertDialogDescription>
              Please sign up first and enter your metrics before accessing your personalized plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowAuthAlert(false)} className="cursor-pointer">
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      
  {/* Header/Navigation */}
  <header className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo/Brand */}
          <div className="text-xl font-bold text-primary">
            <Link href="/">
              <Image className="hover:cursor-pointer" src="/logo.png" alt="Gaze for the Gains" width={100} height={100} />
            </Link>
          </div>

          {/* Navigation Menu */}
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink href="/" className="px-4 py-2">
                  Home
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="/macro-meals" className="px-4 py-2">
                  Macro Tips
                </NavigationMenuLink>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="/timeline" className="px-4 py-2">
                  Timeline
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Auth Buttons / User Button */}
          <div className="flex gap-2">
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <>
                <SignInButton mode="redirect" forceRedirectUrl="/macro-meals">
                  <Button className="cursor-pointer" variant="outline">Sign In</Button>
                </SignInButton>
                <SignUpButton mode="redirect" forceRedirectUrl="/metrics">
                  <Button className="cursor-pointer">Sign Up</Button>
                </SignUpButton>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-[calc(100vh-4rem)]">
        {/* overlay to blend background into the photo on the right */}
        <div
          aria-hidden
          className="hidden md:block pointer-events-none absolute inset-y-0 right-0 w-1/2 z-10"
          style={{
            /* multi-stop gradient + slight blur to avoid a hard seam */
            background: 'linear-gradient(to left, rgba(248,250,252,0) 0%, rgba(248,250,252,0.15) 25%, rgba(248,250,252,0.45) 55%, rgba(248,250,252,0.75) 80%)',
            filter: 'blur(6px)'
          }}
        />
        <div className="flex h-full">
          {/* Left side - Hero content */}
          <div className="flex-1 flex flex-col justify-center items-start py-20 px-4 lg:px-8 z-20 relative">
            <div className="w-full max-w-lg mx-auto">
              <div className="text-sm font-semibold text-primary mb-2">#1 Health Tracking App using AI</div>

              <h1 className="text-6xl font-bold bg-gradient-to-r from-[#FF1493] to-[#7C3AED] bg-clip-text text-transparent animate-shimmer">
                HackerFitness
              </h1>
              <p className="text-xl text-muted-foreground">
                Your fitness journey starts here
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => {
                    // Flash animation only
                    setIsFlashing(true);
                    setTimeout(() => setIsFlashing(false), 500);
                  }}
                  className={`px-4 py-2 rounded-md text-white bg-[#FF1493] cursor-pointer ${isFlashing ? 'animate-click-flash' : ''}`}
                >
                  Start Now
                </button>
              </div>
            </div>
          </div>

          {/* Right side - Image/visual - extends to right edge */}
          <div className="relative w-1/2 min-h-[calc(100vh-4rem)] z-0">
            <Image
              src="/fitness.jpeg"
              alt="Fitness Photo"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative z-10 bg-muted/90 backdrop-blur-sm py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-8 text-center">Why Us?</h2>
          <p className="text-lg text-muted-foreground text-center">
            Gaze for the Gains is your all-in-one fitness companion designed to help you achieve your health 
            and fitness goals through intelligent tracking and personalized planning.
            Whether you are just starting your fitness journey or you are a seasoned athlete,
            our platform provides the tools you need to stay consistent, track progress, and reach new milestones.
            Our Mission: To empower individuals to take control of their health by making fitness tracking simple, 
            intuitive, and motivating. We believe that when you keep your gaze on your gains, success follows.
          </p>
        </div>
      </section>
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
