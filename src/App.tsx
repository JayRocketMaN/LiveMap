import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { io } from 'socket.io-client';
import L from 'leaflet';
import { useGpsTracker } from './hooks/useGpsTracker';

// --- LEAFLET ICON FIX ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

import './App.css';
import 'leaflet/dist/leaflet.css';

interface LocationUpdate {
  tripId: string;
  lat: number;
  lng: number;
}

// Environment Variable for Hosting
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const CURRENT_TRIP_ID = "33333333-3333-4333-a333-333333333333";

function RecenterMap({ markers }: { markers: Record<string, [number, number]> }) {
  const map = useMap();
  useEffect(() => {
    const activeCoords = Object.values(markers);
    if (activeCoords.length > 0) {
      const latestPos = activeCoords[activeCoords.length - 1];
      map.setView(latestPos, map.getZoom(), { animate: true });
    }
  }, [markers, map]);
  return null;
}

export default function App() {
  const [markers, setMarkers] = useState<Record<string, [number, number]>>({});
  const { isTracking, handleStartTrip, stopTracking } = useGpsTracker(CURRENT_TRIP_ID);

  useEffect(() => {
    const socket = io(API_URL);

    // --- ROOMS LOGIC ---
    // Tell the server we only care about this specific trip
    socket.emit("join-trip", CURRENT_TRIP_ID);

    socket.on("location-update", (data: LocationUpdate) => {
      console.log(" Room Update Received:", data);
      setMarkers((prev: Record<string, [number, number]>) => ({
        ...prev,
        [data.tripId]: [data.lat, data.lng]
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      
      {/* Floating Control Panel */}
      <div style={{ 
        position: "absolute", top: 20, left: 20, zIndex: 1000,
        background: "white", padding: "15px", borderRadius: "10px", 
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)", minWidth: "180px"
      }}>
        <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>Driver Dashboard</h4>
        
        {!isTracking ? (
          <button 
            onClick={handleStartTrip}
            style={{
              width: "100%", backgroundColor: "#2ed573", color: "white", 
              border: "none", padding: "12px", borderRadius: "6px", 
              cursor: "pointer", fontWeight: "bold"
            }}
          >
             START TRIP
          </button>
        ) : (
          <button 
            onClick={stopTracking}
            style={{
              width: "100%", backgroundColor: "#ff4757", color: "white", 
              border: "none", padding: "12px", borderRadius: "6px", 
              cursor: "pointer", fontWeight: "bold"
            }}
          >
             END TRIP
          </button>
        )}

        <div style={{ marginTop: "10px", textAlign: "center" }}>
          <span style={{ fontSize: "11px", color: "#888", textTransform: "uppercase" }}>
            Status: <strong style={{ color: isTracking ? "#2ed573" : "#ff4757" }}>
              {isTracking ? "Live" : "Offline"}
            </strong>
          </span>
          <div style={{ fontSize: "9px", color: "#bbb", marginTop: "5px" }}>
            Room: {CURRENT_TRIP_ID.split('-')[0]}...
          </div>
        </div>
      </div>

      <MapContainer 
        center={[51.505, -0.09]} 
        zoom={13} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap markers={markers} />

        {Object.entries(markers).map(([tripId, position]) => (
          <Marker key={tripId} position={position}>
            <Popup>
              <strong>Trip ID:</strong> <br /> 
              {tripId}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
