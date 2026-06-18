import { useState, useEffect } from 'react';

// Use the Vite environment variable (falls back to localhost for testing)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export function useGpsTracker(tripId: string | null) {
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (!isTracking || !tripId) return;

    console.log("🛰️ Starting continuous GPS Watcher...");

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await fetch(`${API_URL}/api/location/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
                tripId, 
                lat: pos.coords.latitude, 
                lng: pos.coords.longitude 
            })
          });
        } catch (err) {
          console.error("❌ Failed to send GPS update:", err);
        }
      },
      (err) => console.error("📍 GPS Watcher Error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => {
        console.log("🛑 Stopping GPS Watcher...");
        navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking, tripId]);

  const handleStartTrip = async () => {
    if (!tripId) {
        console.warn("⚠️ No tripId provided");
        return;
    }

    // 1. Get initial position to satisfy backend requirement
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const initialLat = pos.coords.latitude;
        const initialLng = pos.coords.longitude;

        try {
          console.log("📨 Sending Start Trip request with initial coordinates...");
          
          const response = await fetch(`${API_URL}/api/location/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ 
              tripId, 
              lat: initialLat, 
              lng: initialLng 
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Backend failed to start trip");
          }

          console.log("✅ Trip started successfully!");
          setIsTracking(true); 
          
        } catch (err) {
          console.error("🚨 Start Trip API Error:", err);
          alert(`Could not start trip. Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      },
      (err) => {
        console.error("📍 Initial GPS Error:", err);
        alert("Please enable location permissions to start the trip.");
      },
      { enableHighAccuracy: true }
    );
  };

  const stopTracking = () => {
    console.log("🏁 Ending trip tracking...");
    setIsTracking(false);
  };

  return { isTracking, handleStartTrip, stopTracking };
}
