"use client";

import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Model } from './Model';

export function Scene() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-auto h-full flex items-center justify-center">
        <div className="text-white text-xl">Loading 3D scene...</div>
      </div>
    );
  }

  return (
    <div className="w-auto h-full">
      <Canvas
        camera={{ position: [3, 9, 7], fov: 32 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.9} />
        <spotLight position={[-50, -40, 50]} angle={0.50} penumbra={2} />
        <pointLight position={[0, -90, -45]} />
        <Model />
        <OrbitControls enableZoom={false} />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
} 