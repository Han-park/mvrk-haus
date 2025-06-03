"use client";

import React, { useState, useEffect } from "react";
import BlobHalftoneCanvas from "./BlobHalftoneCanvas";
import { generateRandomBlob, generateRandomBlobPresets, BlobOptions } from "@/lib/blobGenerator";

type MixBlendMode = "multiply" | "screen" | "overlay" | "soft-light" | "color-dodge" | "normal";

interface BlobLayer {
  id: string;
  blobPath: string;
  options: BlobOptions;
  halftoneConfig: {
    grid: number;
    maxRadius: number;
    dotColor: string;
  };
  style: {
    position: "absolute";
    top: string;
    left: string;
    opacity: number;
    mixBlendMode: MixBlendMode;
    transform: string;
    zIndex: number;
  };
}

interface BlobHalftoneBackgroundProps {
  layerCount?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

export default function BlobHalftoneBackground({
  layerCount = 5,
  autoRefresh = false,
  refreshInterval = 5000,
  className = "",
}: BlobHalftoneBackgroundProps) {
  const [layers, setLayers] = useState<BlobLayer[]>([]);

  const generateLayers = () => {
    const presets = generateRandomBlobPresets();
    const colors = ["#000000"]; // Black only
    const blendModes = ["multiply"]; // Multiply only

    const newLayers: BlobLayer[] = [];

    for (let i = 0; i < layerCount; i++) {
      const preset = presets[i % presets.length];
      const randomizedPreset = {
        ...preset,
        width: preset.width! + (Math.random() - 0.5) * 150,
        height: preset.height! + (Math.random() - 0.5) * 150,
        randomness: 0.5 + Math.random() * 0.45,
      };

      const blobPath = generateRandomBlob(randomizedPreset);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const blendMode = blendModes[Math.floor(Math.random() * blendModes.length)];

      const layer: BlobLayer = {
        id: `blob-${i}-${Date.now()}`,
        blobPath,
        options: randomizedPreset,
        halftoneConfig: {
          grid: 5 + Math.random() * 7,
          maxRadius: 3 + Math.random() * 5,
          dotColor: color,
        },
        style: {
          position: "absolute",
          top: `${Math.random() * 80 - 10}%`,
          left: `${Math.random() * 80 - 10}%`,
          opacity: 0.3 + Math.random() * 0.4,
          mixBlendMode: blendMode as MixBlendMode,
          transform: `rotate(${(Math.random() - 0.5) * 60}deg) scale(${0.6 + Math.random() * 0.5})`,
          zIndex: 1,
        },
      };

      newLayers.push(layer);
    }

    setLayers(newLayers);
  };

  useEffect(() => {
    generateLayers();
  }, [layerCount]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(generateLayers, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Background gradient */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100"
        style={{ zIndex: -1 }}
      />
      
      {/* Blob layers */}
      {layers.map((layer) => (
        <div
          key={layer.id}
          style={{
            ...layer.style,
            zIndex: 1,
          }}
        >
          <BlobHalftoneCanvas
            blobPath={layer.blobPath}
            width={layer.options.width || 400}
            height={layer.options.height || 400}
            grid={layer.halftoneConfig.grid}
            maxRadius={layer.halftoneConfig.maxRadius}
            dotColor={layer.halftoneConfig.dotColor}
            backgroundColor="transparent"
          />
        </div>
      ))}
      
      {/* Manual refresh button */}
      <button
        onClick={generateLayers}
        className="absolute top-4 right-4 bg-white/80 hover:bg-white text-gray-800 px-4 py-2 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl z-10"
        style={{ zIndex: 10 }}
      >
        🎲 New Pattern
      </button>
    </div>
  );
} 