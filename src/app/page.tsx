import Image from "next/image";
import { Scene } from "@/components/Scene";

export default function Home() {
  return (
    <div className="bg-black">
      {/* 3D Model Section */}
      <section className="py-2">
        <div className="container w-full mx-auto h-[80vh]">
          <Scene />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 pb-24 bg-black">
        <div className="container mx-auto px-4 text-center font-roboto-mono text-sm">
          <p className="text-gray-400">Website coming soon.</p>
          <p className="text-gray-600">by MVRK CRAFT from MVRK HAUS.</p>
        </div>
      </footer>
    </div>
  );
}
