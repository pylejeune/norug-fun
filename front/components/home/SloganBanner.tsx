"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import Marquee from "react-fast-marquee";

type Props = {
  className?: string;
};

export function SloganBanner({ className }: Props) {
  const isMobile = useIsMobile();

  const textData = {
    before: "10 tokens rise. The rest ",
    highlight: "burn",
    after: ". Choose your side.",
  };

  return (
    <div className={cn("w-full py-0 px-0", className)}>
      <div className="container mx-auto px-4 overflow-hidden h-10 flex items-center justify-center marquee-container">
        <div className="w-full overflow-hidden">
          <Marquee
            gradient={false}
            speed={isMobile ? 30 : 50}
            pauseOnHover={true}
            style={{
              overflow: "hidden",
              width: "1200px",
              maxWidth: "100%",
            }}
            className=""
          >
            <span
              className={
                isMobile
                  ? "text-lg font-medium whitespace-nowrap text-white"
                  : "text-4xl font-medium whitespace-nowrap text-white"
              }
            >
              {textData.before}
              <span className="text-red-600 font-bold">
                {textData.highlight}
              </span>
              {textData.after}
            </span>
          </Marquee>
        </div>
      </div>
    </div>
  );
}
