"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

export default function DebugPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDebugData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/debug-user?clerkId=${user.id}`);
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      console.error("Error fetching debug data:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDebugData();
    }
  }, [user, fetchDebugData]);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug Information</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Clerk Authentication Status</h2>
          <p><strong>Is Loaded:</strong> {isLoaded ? "Yes" : "No"}</p>
          <p><strong>Is Signed In:</strong> {isSignedIn ? "Yes" : "No"}</p>
          <p><strong>User ID:</strong> {user?.id || "None"}</p>
          <p><strong>Email:</strong> {user?.primaryEmailAddress?.emailAddress || "None"}</p>
          <p><strong>First Name:</strong> {user?.firstName || "None"}</p>
          <p><strong>Last Name:</strong> {user?.lastName || "None"}</p>
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Database Information</h2>
          <button 
            onClick={fetchDebugData}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded mb-4"
          >
            {loading ? "Loading..." : "Refresh Database Data"}
          </button>
          
          {debugData && (
            <pre className="bg-white p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-green-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Quick Actions</h2>
          <div className="space-x-4">
            <Link href="/metrics" className="bg-green-500 text-white px-4 py-2 rounded inline-block">
              Go to Metrics
            </Link>
            <Link href="/personalized-plan" className="bg-green-500 text-white px-4 py-2 rounded inline-block">
              Go to Dashboard
            </Link>
            <Link href="/" className="bg-green-500 text-white px-4 py-2 rounded inline-block">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
