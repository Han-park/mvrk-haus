export interface BlobOptions {
  width?: number;
  height?: number;
  points?: number;
  randomness?: number;
  centerX?: number;
  centerY?: number;
}

export function generateRandomBlob(options: BlobOptions = {}): string {
  const {
    width = 400,
    height = 400,
    points = 8,
    randomness = 0.3,
    centerX = width / 2,
    centerY = height / 2,
  } = options;

  const angleStep = (Math.PI * 2) / points;
  const radiusX = width * 0.35;
  const radiusY = height * 0.35;
  
  // Generate random points around an ellipse
  const blobPoints: { x: number; y: number }[] = [];
  
  for (let i = 0; i < points; i++) {
    const angle = i * angleStep;
    const randomFactor = 1 + (Math.random() - 0.5) * randomness;
    
    const x = centerX + Math.cos(angle) * radiusX * randomFactor;
    const y = centerY + Math.sin(angle) * radiusY * randomFactor;
    
    blobPoints.push({ x, y });
  }
  
  // Helper function to get a point with wrapping
  const getPoint = (index: number) => blobPoints[(index + points) % points];
  
  // Create smooth curves using proper Catmull-Rom to Bezier conversion
  let path = `M ${blobPoints[0].x} ${blobPoints[0].y}`;
  
  for (let i = 0; i < points; i++) {
    const p0 = getPoint(i - 1); // Previous point
    const p1 = getPoint(i);     // Current point
    const p2 = getPoint(i + 1); // Next point
    const p3 = getPoint(i + 2); // Point after next
    
    // Calculate tangent vectors for smooth curves
    const tension = 0.5; // Controls how "tight" the curves are
    
    // Tangent at p1 (current point)
    const t1x = (p2.x - p0.x) * tension;
    const t1y = (p2.y - p0.y) * tension;
    
    // Tangent at p2 (next point)
    const t2x = (p3.x - p1.x) * tension;
    const t2y = (p3.y - p1.y) * tension;
    
    // Convert Catmull-Rom to Bezier control points
    const cp1x = p1.x + t1x / 3;
    const cp1y = p1.y + t1y / 3;
    const cp2x = p2.x - t2x / 3;
    const cp2y = p2.y - t2y / 3;
    
    path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  
  path += " Z";
  return path;
}

export function generateRandomBlobPresets(): BlobOptions[] {
  return [
    { width: 800, height: 600, points: 6, randomness: 0.5 },
    { width: 600, height: 800, points: 8, randomness: 0.4 },
    { width: 700, height: 500, points: 10, randomness: 0.7 },
    { width: 500, height: 700, points: 7, randomness: 0.45 },
    { width: 900, height: 400, points: 9, randomness: 0.35 },
  ];
} 