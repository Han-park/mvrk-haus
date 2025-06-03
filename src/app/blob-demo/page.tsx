"use client";

import React, { useState } from "react";
import BlobHalftoneCanvas from "@/components/BlobHalftoneCanvas";
import BlobHalftoneBackground from "@/components/BlobHalftoneBackground";
import { generateRandomBlob, BlobOptions } from "@/lib/blobGenerator";
import Link from "next/link";

export default function BlobDemo() {
  const [singleBlobPath, setSingleBlobPath] = useState(() => generateRandomBlob());
  const [blobOptions, setBlobOptions] = useState<BlobOptions>({
    width: 400,
    height: 400,
    points: 8,
    randomness: 0.3,
  });
  const [halftoneOptions, setHalftoneOptions] = useState({
    grid: 10,
    maxRadius: 5,
    dotColor: "#000000",
  });
  const [showHalftone, setShowHalftone] = useState(false);

  const regenerateBlob = () => {
    const newBlob = generateRandomBlob(blobOptions);
    setSingleBlobPath(newBlob);
    setShowHalftone(false); // Reset to show blob first
  };

  const updateBlobOption = (key: keyof BlobOptions, value: number) => {
    const newOptions = { ...blobOptions, [key]: value };
    setBlobOptions(newOptions);
    setSingleBlobPath(generateRandomBlob(newOptions));
    setShowHalftone(false); // Reset to show blob first
  };

  const updateHalftoneOption = (key: string, value: number | string) => {
    setHalftoneOptions(prev => ({ ...prev, [key]: value }));
  };

  // Component to show just the blob shape
  const BlobShapeCanvas = ({ blobPath, width, height }: { blobPath: string; width: number; height: number }) => {
    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = width;
      canvas.height = height;
      ctx.clearRect(0, 0, width, height);

      try {
        // Parse and draw blob path
        const { parseSVG, makeAbsolute } = require("svg-path-parser");
        const commands = makeAbsolute(parseSVG(blobPath));
        
        ctx.beginPath();
        commands.forEach((cmd: any) => {
          if (cmd.code === "M") {
            ctx.moveTo(cmd.x, cmd.y);
          } else if (cmd.code === "L") {
            ctx.lineTo(cmd.x, cmd.y);
          } else if (cmd.code === "C") {
            ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
          } else if (cmd.code === "Q") {
            ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
          } else if (cmd.code === "Z") {
            ctx.closePath();
          }
        });

        // Fill the blob shape
        ctx.fillStyle = "#e5e7eb"; // Light gray
        ctx.fill();
        
        // Add a stroke for better visibility
        ctx.strokeStyle = "#374151"; // Dark gray
        ctx.lineWidth = 2;
        ctx.stroke();
      } catch (error) {
        console.error("Error rendering blob:", error);
      }
    }, [blobPath, width, height]);

    return (
      <canvas 
        ref={canvasRef} 
        style={{ 
          width: "100%", 
          height: "auto",
          display: "block"
        }} 
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Blob Halftone Generator Demo
          </h1>
          <p className="text-gray-600">
            Step-by-step demonstration: Create blob → Apply halftone
          </p>
          <Link 
            href="/"
            className="inline-block mt-4 text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Back to Home
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Blob Creation */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Step 1: Create Blob Shape</h2>
            
            {/* Blob Controls */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Width: {blobOptions.width}px
                </label>
                <input
                  type="range"
                  min="200"
                  max="600"
                  value={blobOptions.width}
                  onChange={(e) => updateBlobOption('width', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Height: {blobOptions.height}px
                </label>
                <input
                  type="range"
                  min="200"
                  max="600"
                  value={blobOptions.height}
                  onChange={(e) => updateBlobOption('height', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Points: {blobOptions.points}
                </label>
                <input
                  type="range"
                  min="4"
                  max="16"
                  value={blobOptions.points}
                  onChange={(e) => updateBlobOption('points', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Randomness: {blobOptions.randomness?.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.3"
                  max="0.95"
                  step="0.05"
                  value={blobOptions.randomness}
                  onChange={(e) => updateBlobOption('randomness', parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <button
                onClick={regenerateBlob}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
              >
                🎲 Generate New Blob
              </button>
            </div>

            {/* Blob Shape Display */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex justify-center">
              <BlobShapeCanvas
                blobPath={singleBlobPath}
                width={blobOptions.width || 400}
                height={blobOptions.height || 400}
              />
            </div>
          </div>

          {/* Halftone Application */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Apply Halftone Effect</h2>
            
            {/* Halftone Controls */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grid Size: {halftoneOptions.grid}px
                </label>
                <input
                  type="range"
                  min="5"
                  max="12"
                  value={halftoneOptions.grid}
                  onChange={(e) => updateHalftoneOption('grid', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Radius: {halftoneOptions.maxRadius}px
                </label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={halftoneOptions.maxRadius}
                  onChange={(e) => updateHalftoneOption('maxRadius', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dot Color
                </label>
                <input
                  type="color"
                  value={halftoneOptions.dotColor}
                  onChange={(e) => updateHalftoneOption('dotColor', e.target.value)}
                  className="w-full h-10 rounded border border-gray-300"
                />
              </div>
              
              <button
                onClick={() => setShowHalftone(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
              >
                ✨ Apply Halftone
              </button>
              
              {showHalftone && (
                <button
                  onClick={() => setShowHalftone(false)}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded transition-colors"
                >
                  👁️ Show Blob Only
                </button>
              )}
            </div>

            {/* Halftone Result Display */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 flex justify-center">
              {showHalftone ? (
                <BlobHalftoneCanvas
                  blobPath={singleBlobPath}
                  width={blobOptions.width || 400}
                  height={blobOptions.height || 400}
                  grid={halftoneOptions.grid}
                  maxRadius={halftoneOptions.maxRadius}
                  dotColor={halftoneOptions.dotColor}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <p className="text-lg mb-2">⬅️ Create your blob first</p>
                    <p className="text-sm">Then click "Apply Halftone" to see the effect</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Multi-Layer Background Demo */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Multi-Layer Background Example</h2>
          <p className="text-gray-600 mb-6">
            This shows how multiple blob-halftone patterns can be layered with different blend modes.
          </p>
          
          <div className="h-96 border border-gray-200 rounded-lg overflow-hidden relative">
            <BlobHalftoneBackground 
              layerCount={4}
              autoRefresh={false}
              className="w-full h-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                <h3 className="font-semibold text-gray-900">Content Layer</h3>
                <p className="text-gray-600 text-sm">
                  This content sits on top of the generated background
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Example */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Usage Example</h2>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-green-400 text-sm">
{`// Step 1: Generate blob shape
import { generateRandomBlob } from '@/lib/blobGenerator';

const blobPath = generateRandomBlob({
  width: 400,
  height: 400,
  points: 8,
  randomness: 0.5
});

// Step 2: Apply halftone to blob
import BlobHalftoneCanvas from '@/components/BlobHalftoneCanvas';

<BlobHalftoneCanvas
  blobPath={blobPath}
  width={400}
  height={400}
  grid={8}
  maxRadius={6}
  dotColor="#000000"
/>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
} 