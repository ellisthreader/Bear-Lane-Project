"use client";
import React, { useRef, useState } from "react";
import "@google/model-viewer";

export default function GameDevShowcase() {
  const ModelViewer: any = "model-viewer";
  const viewerRef = useRef<any>(null);
  const [hotspotInfo, setHotspotInfo] = useState<{ title: string; description: string } | null>(null);

  // Click handler for hotspots with maximum zoom
  const handleHotspotClick = (
    target: string,
    orbit: string,
    title: string,
    description: string
  ) => {
    if (!viewerRef.current) return;

    viewerRef.current.cameraTarget = target;

    // Extract azimuth and elevation from orbit string
    const [azimuth, elevation] = orbit.split(" ");

    // Set radius to minimum allowed for maximum zoom
    const minRadius = 0.1; // same as min-camera-orbit
    viewerRef.current.cameraOrbit = `${azimuth} ${elevation} ${minRadius}m`;
    viewerRef.current.jumpCameraToGoal();

    setHotspotInfo({ title, description });
  };

  const handleCloseInfo = () => setHotspotInfo(null);

  return (
    <div className="flex flex-col items-center gap-6 w-full relative">
      <h3 className="text-3xl font-semibold dark:text-white text-center">
        🎮 3D Modeling & Game Development
      </h3>

      {/* Custom styles injected directly to kill grey flash */}
      <style jsx global>{`
        model-viewer {
          --poster-color: transparent !important;
          background-color: transparent !important;
        }
        model-viewer::part(default-progress-bar) {
          display: none !important;
        }
      `}</style>

      <ModelViewer
        ref={viewerRef}
        src="/models/island.glb"
        alt="3D Model Preview"
        camera-controls
        auto-rotate
        exposure="1.2"
        min-camera-orbit="0.1m auto auto"
        max-camera-orbit="5m auto auto"
        style={{ width: "100vw", height: "650px" }}
        className="bg-transparent"
      >
        {/* Farmhouse Hotspot */}
        <button
          slot="hotspot-farm"
          data-position="0.2 0.5 -0.5"
          data-normal="0 1 0"
          className="hotspot w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow cursor-pointer hover:scale-110 transition-transform"
          onClick={() =>
            handleHotspotClick(
              "0.2m 0.5m -0.5m",
              "90deg 80deg",
              "Farmhouse Frenzy",
              "Welcome to the farmhouse! Where chickens are CEOs and the cows unionize before breakfast."
            )
          }
        >
          {/* Unified icon for all hotspots */}
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-gray-800 dark:text-white">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z" />
          </svg>
        </button>

        {/* Lazy Lake Hotspot */}
        <button
          slot="hotspot-lake"
          data-position="0.4 0.2 0.2"
          data-normal="0 1 0"
          className="hotspot w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow cursor-pointer hover:scale-110 transition-transform"
          onClick={() =>
            handleHotspotClick(
              "0.4m 0.2m 0.2m",
              "135deg 75deg",
              "Lazy Lake",
              "Behold Lazy Lake! Famous for its legendary rubber duck races and occasional flying fish protests."
            )
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-gray-800 dark:text-white">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z" />
          </svg>
        </button>

        {/* Mountains Hotspot */}
        <button
          slot="hotspot-mountains"
          data-position="-0.6 0.8 -0.2"
          data-normal="0 1 0"
          className="hotspot w-6 h-6 flex items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow cursor-pointer hover:scale-110 transition-transform"
          onClick={() =>
            handleHotspotClick(
              "-0.6m 0.8m -0.2m",
              "160deg 70deg",
              "Mighty Mountains",
              "The mountains! Where goats are trained in parkour and snowmen throw snowball protests every winter."
            )
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4 text-gray-800 dark:text-white">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14h-2v-2h2zm0-4h-2V7h2z" />
          </svg>
        </button>
      </ModelViewer>

      {/* Info Box */}
      {hotspotInfo && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-lg max-w-sm w-full z-50">
          <div className="flex justify-between items-start">
            <h4 className="text-lg font-semibold">{hotspotInfo.title}</h4>
            <button className="text-gray-500 hover:text-gray-900 dark:hover:text-white" onClick={handleCloseInfo}>
              ✖
            </button>
          </div>
          <p className="mt-2 text-gray-700 dark:text-gray-300">{hotspotInfo.description}</p>
        </div>
      )}

      <p className="text-center text-gray-600 dark:text-gray-300 mt-4 max-w-2xl">
        I create 3D assets in Blender and build interactive game experiences on Roblox. Try rotating the model above with your mouse or touch!
      </p>
    </div>
  );
}
