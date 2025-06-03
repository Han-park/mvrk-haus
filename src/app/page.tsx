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
          <p className="text-gray-600">
            by{" "}
            <a
              href="mailto:me@han-park.info?subject=메버릭 크래프트가 궁금해요.&body=메버릭 동료이신가요? 메버릭 크래프트에 대해 궁금한 점을 적어주세요. 메버릭 하우스 내/외부의 연결을 기술을 통해 강화하는 것이 저희의 미션이며, 무언가를 손으로 만드는 걸 좋아하는 사람들이 모여있는 집단이에요. - 종한 드림"
              className="text-gray-600 hover:text-gray-400"
            >
              MVRK CRAFT
            </a>{" "}
            from MVRK HAUS.
          </p>
        </div>
      </footer>
    </div>
  );
}
