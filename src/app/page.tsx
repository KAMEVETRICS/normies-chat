"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WalletConnect from "@/components/WalletConnect";
import NormieGrid from "@/components/NormieGrid";
import ThemeToggle from "@/components/ThemeToggle";
import { useAccount } from "wagmi";

const HERO_IDS = [7, 21, 42, 0, 88, 100];

export default function Home() {
  const [tokenInput, setTokenInput] = useState("");
  const router = useRouter();
  const { address } = useAccount();

  const handleTryNormie = () => {
    const id = parseInt(tokenInput);
    if (!isNaN(id) && id >= 0 && id <= 9999) {
      router.push(`/normie/${id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleTryNormie();
  };

  return (
    <div className="min-h-screen scroll-grid relative">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-nav)] transition-colors duration-300">
        <ThemeToggle />
        <div className="font-headline font-black text-2xl text-[var(--text-primary)]">
          Normie Intelligence
        </div>
        <WalletConnect />
      </header>

      {/* Main */}
      <main className="pt-[100px] pb-24 px-6 md:px-8 min-h-screen flex flex-col items-center justify-center relative">
        <div className="relative z-10 flex flex-col items-center gap-8 max-w-3xl w-full mx-auto">
          {/* Headline */}
          <div className="text-center flex flex-col gap-3">
            <h1 className="font-headline text-[42px] sm:text-[48px] font-semibold leading-[1.1] tracking-tight flex flex-col items-center gap-1">
              <span>Your Normie Has a</span>
              <span className="glow-text font-black italic tracking-tighter">
                Personality
              </span>
            </h1>
            <p className="text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed text-base">
              Each of the 10,000 on-chain Normies has a unique AI persona
              generated from its traits. Connect your wallet or try any Normie.
            </p>
          </div>

          {/* Token ID Input */}
          <div className="w-full max-w-md parchment-card p-5 slide-up">
            <p className="font-bold text-xs uppercase tracking-[0.15em] text-[var(--text-muted)] mb-3 text-center">
              Enter a Token ID
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                max={9999}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0 – 9999"
                className="flex-1 px-4 py-3 bg-[var(--bg-primary)] border border-[var(--border-strong)] text-[var(--text-primary)] text-base font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-glow)] transition"
              />
              <button
                onClick={handleTryNormie}
                className="px-6 py-3 bg-[var(--seal-bg)] text-white font-bold text-xs uppercase tracking-[0.1em] hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
              >
                Try Normie →
              </button>
            </div>
          </div>

          {/* Small avatar row */}
          <div className="flex items-center justify-center gap-2 slide-up" style={{ animationDelay: "0.1s" }}>
            {HERO_IDS.map((id, i) => (
              <div
                key={id}
                className={`${
                  i === 3 ? "w-12 h-12 avatar-glow" : "w-10 h-10"
                } bg-[var(--surface-highest)] border border-[var(--border-color)] shrink-0 overflow-hidden`}
              >
                <img
                  src={`https://api.normies.art/normie/${id}/image.png`}
                  alt={`Normie #${id}`}
                  className="w-full h-full object-cover opacity-80"
                  style={{ imageRendering: "pixelated" }}
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {/* Wax Seal CTA */}
          <div className="slide-up" style={{ animationDelay: "0.2s" }}>
            <WalletConnect variant="seal" />
          </div>
        </div>
      </main>

      {/* Holder collection grid */}
      {address && (
        <section className="py-16 border-t border-[var(--border-color)]">
          <div className="max-w-6xl mx-auto px-6">
            <NormieGrid />
          </div>
        </section>
      )}
    </div>
  );
}
