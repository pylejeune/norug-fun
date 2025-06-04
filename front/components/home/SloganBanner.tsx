import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

type Word = {
  text: string;
  className?: string;
};

const SLOGAN_WORDS: Word[] = [
  { text: "10" },
  { text: "tokens" },
  { text: "rise." },
  { text: "The" },
  { text: "rest" },
  { text: "burn.", className: "text-red-600 dark:text-red-500" },
  { text: "Choose" },
  { text: "your" },
  { text: "side." },
];

export function SloganBanner({ className }: Props) {
  return (
    <div className={cn("text-center", className)}>
      <TypewriterEffect
        words={SLOGAN_WORDS}
        className="text-xl"
        cursorClassName="bg-white"
      />
    </div>
  );
}
