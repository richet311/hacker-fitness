import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
} from "@/components/ui/navigation-menu";
import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function Header() {
  return (
    <header className="border-b border-border bg-background/90 backdrop-blur-sm sticky top-0 z-50">
      {/* Top banner */}
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo/Brand */}
        <div>
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <Image
              className="hover:cursor-pointer"
              src="/logo.png"
              alt="HackerFitness"
              width={56}
              height={56}
            />
            <span className="text-2xl md:text-3xl font-extrabold text-primary">
              HackerFitness
            </span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link href="/" passHref legacyBehavior>
                <NavigationMenuLink className="px-4 py-2 cursor-pointer">
                  Home
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/macro-meals" passHref legacyBehavior>
                <NavigationMenuLink className="px-4 py-2 cursor-pointer">
                  Macro and Meals
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/timeline" passHref legacyBehavior>
                <NavigationMenuLink className="px-4 py-2 cursor-pointer">
                  Workout Plan
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* User Button */}
        <div className="flex gap-2">
          <UserButton afterSignOutUrl="/" />
        </div>
      </div>
    </header>
  );
}

