'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button'; // Assuming shadcn Button path
import { useParams } from 'next/navigation'; // Import useParams to get locale

// Basic structure with emphasis, Solana gradient subtitles, and localized CTAs
export default function HowItWorksPage() {
  const { locale } = useParams(); // Get the current locale

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col items-center mb-12 md:mb-16">
        <Image 
          src="/images/noruglogo.png" 
          alt="NoRug.fun Logo"
          width={100} 
          height={100} // Adjust size as needed
          className="mb-4"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">How NoRug.fun Works</h1>
        <p className="text-center text-muted-foreground">The trenches, with a helmet on.</p>
      </div>

      {/* Phase 1 */}
      <div className="mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8">Phase 1: The Founder Window</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="border p-6 rounded-lg shadow-sm flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-center md:text-left 
                           bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text">
              Be a Founder...
            </h3>
            <div className="flex-grow">
              <p className="mb-3">Propose a token creation and set (with a <strong>10% max</strong>):</p>
              <ul className="list-disc list-inside mb-3 space-y-1 text-muted-foreground">
                <li>The percentage of the supply airdropped to you.</li>
                <li>The lockup period for your share of the supply.</li>
              </ul>
              <p className="mb-3">Users can then <strong>support</strong> your proposal by <strong>investing SOL</strong> in it, similar to a presale.</p>
              <p className="font-medium">If it reaches the <strong>top 10 proposals</strong>: <strong>Congrats!</strong> Your token is <strong>created</strong>, and you receive your percentage of the supply.</p>
              <p className="text-sm text-muted-foreground mt-2">If it's not successful enough: The proposal is rejected.</p>
            </div>
            <div className="mt-6 text-center">
              <Link href={`/${locale}/create`} passHref>
                <Button 
                  variant="outline" 
                  className="cursor-pointer transition-all duration-300 hover:border-[#9945FF] hover:shadow-[0_0_10px_2px_rgba(153,69,255,0.5)]"
                >
                  Create your Proposal
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column */}
          <div className="border p-6 rounded-lg shadow-sm flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-center md:text-left 
                           bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text">
              ...or Be a Co-Founder.
            </h3>
            <div className="flex-grow">
              <p className="mb-3">Find a token creation proposal that appeals to you and <strong>support</strong> it by <strong>investing SOL</strong>.</p>
              <p className="mb-3 font-medium">If it reaches the <strong>top 10 proposals</strong>: <strong>Congrats!</strong>
               The token you supported is <strong>created</strong>, and you receive a <strong>share of the supply</strong> proportional to the SOL you invested.</p>
              <p className="mb-3 font-medium">If it's not successful enough: <strong>Congrats!</strong> You get your SOL <strong>back</strong>!</p>
              <p className="italic text-center md:text-left">That's what we call a <strong>WIN/WIN</strong> situation.</p>
            </div>
            <div className="mt-6 text-center">
              <Link href={`/${locale}`} passHref>
                <Button 
                  variant="outline" // Assuming this should also be outline for consistency? Or keep default?
                  className="cursor-pointer transition-all duration-300 hover:border-[#9945FF] hover:shadow-[0_0_10px_2px_rgba(153,69,255,0.5)]"
                >
                  Invest in Proposals
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 2 */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6">Phase 2: The Launch</h2>
        <div className="max-w-3xl mx-auto">
          <p className="mb-4 text-lg">NoRug.fun handles <strong>minting</strong>, <strong>token distribution</strong> (to the creator and investors), and creates the <strong>liquidity pool</strong> with the raised SOL through Meteora.</p>
          <p className="mb-4 text-muted-foreground">Investors in non-selected proposals can <strong>reclaim their funds</strong>.</p>
          <p>Everyone can then trade these tokens as usual.</p>
        </div>
      </div>

    </div>
  );
} 