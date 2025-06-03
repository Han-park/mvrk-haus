"use client";

import React, { useRef, useEffect } from "react";
import { parseSVG, makeAbsolute } from "svg-path-parser";

interface BlobHalftoneCanvasProps {
  blobPath: string; // SVG path string from blob.generator
  width: number;
  height: number;
  grid?: number; // spacing of halftone dots
  maxRadius?: number; // max size of dot
  dotColor?: string; // color of the halftone dots
  backgroundColor?: string; // background color
}

export default function BlobHalftoneCanvas({
  blobPath,
  width,
  height,
  grid = 10,
  maxRadius = 5,
  dotColor = "#000000",
  backgroundColor = "transparent",
}: BlobHalftoneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;

    // Clear and set background
    ctx.clearRect(0, 0, width, height);
    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    try {
      // STEP 1: Create and store the blob path
      const commands = makeAbsolute(parseSVG(blobPath));
      const path2D = new Path2D();

      commands.forEach((cmd) => {
        if (cmd.code === "M") {
          path2D.moveTo(cmd.x, cmd.y);
        } else if (cmd.code === "L") {
          path2D.lineTo(cmd.x, cmd.y);
        } else if (cmd.code === "C") {
          path2D.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
        } else if (cmd.code === "Q") {
          path2D.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
        } else if (cmd.code === "Z") {
          path2D.closePath();
        }
      });

      // STEP 2: Apply halftone dots
      ctx.fillStyle = dotColor;
      
      for (let y = 0; y < height; y += grid) {
        for (let x = 0; x < width; x += grid) {
          // Add small random offset for organic feel
          const dotX = x + (Math.random() - 0.5) * 2;
          const dotY = y + (Math.random() - 0.5) * 2;
          
          // Check if this point is inside the blob using Path2D
          if (ctx.isPointInPath(path2D, dotX, dotY)) {
            // Calculate random dot size
            const brightness = Math.random();
            const radius = (1 - brightness) * maxRadius;
            
            // Draw the dot
            if (radius > 0.5) {
              ctx.beginPath();
              ctx.arc(dotX, dotY, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    } catch (error) {
      console.error("Error parsing SVG path:", error);
    }
  }, [blobPath, width, height, grid, maxRadius, dotColor, backgroundColor]);

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
} 