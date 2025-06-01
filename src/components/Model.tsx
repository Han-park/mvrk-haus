"use client";

import { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial, Object3D, Material } from 'three';

type GLTFResult = {
  nodes: {
    [key: string]: Object3D;
  };
  materials: {
    [key: string]: Material;
  };
};

export function Model() {
  const modelRef = useRef<Object3D>(null);
  const { nodes } = useGLTF('/img/mvrk.glb') as unknown as GLTFResult;

  // Apply glass material to all meshes
  Object.values(nodes).forEach((node) => {
    if (node instanceof Mesh) {
      node.material = new MeshStandardMaterial({
        color: '#ffffff',
        metalness: 0.4,
        roughness: 0.9,
        transparent: true,
        opacity: 0.65,
        envMapIntensity: 1,
      });
    }
  });

  // Auto-rotate the model
  useFrame((state, delta) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group 
      ref={modelRef} 
      dispose={null}
      rotation={[0, Math.PI / 2, 0]} // Set initial Y rotation to 90 degrees
    >
      {Object.entries(nodes).map(([name, node]) => {
        if (node instanceof Mesh) {
          return <primitive key={name} object={node} />;
        }
        return null;
      })}
    </group>
  );
}

useGLTF.preload('/img/mvrk.glb'); 