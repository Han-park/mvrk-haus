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
      <footer className="pb-30 bg-black">
        <div className="container mx-auto px-4 text-center font-roboto-mono text-sm">
          <p className="text-gray-400">Public website coming soon.</p>
          <p className="text-gray-600">by MVRK CRAFT from MVRK HAUS.</p>
          <p className="text-gray-600 mt-6">mvrkcrafts@gmail.com</p>
        </div>
      </footer>
    </div>
  );
}
