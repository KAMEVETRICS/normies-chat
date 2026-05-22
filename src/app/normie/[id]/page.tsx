"use client";

import { useEffect, useReducer, use, useRef } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { NormieTraits } from "@/types/normie";
import { fetchTraits, fetchCanvasInfo } from "@/lib/normies-api";
import PixelAvatar from "@/components/PixelAvatar";
import TraitBadge from "@/components/TraitBadge";
import ChatWindow from "@/components/ChatWindow";
import WalletConnect from "@/components/WalletConnect";
import ThemeToggle from "@/components/ThemeToggle";
import { useWalletAuth } from "@/hooks/useWalletAuth";

type State = {
  traits: NormieTraits | null;
  isCustomized: boolean;
  status: "loading" | "error" | "ready";
  errorMsg: string | null;
};

type Action =
  | { type: "loading" }
  | { type: "success"; traits: NormieTraits; isCustomized: boolean }
  | { type: "error"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loading":
      return { ...state, status: "loading", errorMsg: null };
    case "success":
      return { traits: action.traits, isCustomized: action.isCustomized, status: "ready", errorMsg: null };
    case "error":
      return { ...state, status: "error", errorMsg: action.message };
  }
}

export default function NormiePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const tokenId = parseInt(id);
  const { address } = useAccount();
  useWalletAuth();

  const isInvalidId = isNaN(tokenId) || tokenId < 0 || tokenId > 9999;

  const [state, dispatch] = useReducer(reducer, {
    traits: null,
    isCustomized: false,
    status: isInvalidId ? "error" : "loading",
    errorMsg: isInvalidId ? "Invalid token ID. Must be 0-9999." : null,
  });
  const activeRequest = useRef(0);

  useEffect(() => {
    if (isInvalidId) return;

    const requestId = ++activeRequest.current;
    dispatch({ type: "loading" });

    Promise.all([
      fetchTraits(tokenId),
      fetchCanvasInfo(tokenId).catch(() => ({ customized: false })),
    ])
      .then(([traitData, canvasData]) => {
        if (requestId !== activeRequest.current) return;
        dispatch({
          type: "success",
          traits: traitData,
          isCustomized: canvasData.customized,
        });
      })
      .catch(() => {
        if (requestId !== activeRequest.current) return;
        dispatch({ type: "error", message: "Failed to load Normie data." });
      });

    return () => {
      activeRequest.current++;
    };
  }, [tokenId, isInvalidId]);

  if (state.status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex items-center gap-3 text-[var(--text-muted)] text-sm">
          <div className="w-5 h-5 border-2 border-[var(--text-muted)] border-t-[var(--accent-glow)] rounded-full animate-spin" />
          Loading Normie #{tokenId}...
        </div>
      </div>
    );
  }

  if (state.status === "error" || !state.traits) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <p className="text-[var(--seal-bg)] text-sm mb-4">{state.errorMsg || "Something went wrong."}</p>
          <Link href="/" className="text-[var(--accent-glow)] hover:opacity-80 text-sm transition-opacity">
            ← Back home
          </Link>
        </div>
      </div>
    );
  }

  const traitEntries = Object.entries(state.traits) as [string, string][];

  return (
    <div className="min-h-screen scroll-grid bg-[var(--bg-primary)]">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center w-full px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-nav)] transition-colors duration-300">
        <ThemeToggle />
        <Link href="/" className="font-headline font-black text-2xl text-[var(--text-primary)]">
          Normie Intelligence
        </Link>
        <WalletConnect />
      </header>

      {/* Main content */}
      <div className="fixed top-[65px] bottom-0 left-0 right-0 px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 h-full max-w-6xl mx-auto">
          {/* Left panel — Normie info (scrollable, sticky on desktop) */}
          <div className="overflow-y-auto flex flex-col gap-4 shrink-0 py-4 purple-scroll">
            {/* Avatar card */}
            <div className="parchment-card p-4 flex flex-col items-center">
              <PixelAvatar id={tokenId} size={160} />
              <h1 className="font-headline text-xl font-bold mt-3 text-center text-[var(--text-primary)]">
                Normie #{tokenId}
              </h1>

              {address && (
                <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400">Connected</span>
                </span>
              )}

              {state.isCustomized && (
                <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--accent-glow)]">
                  ✦ Canvas Modified
                </span>
              )}
            </div>

            {/* Traits */}
            <div className="parchment-card p-4">
              <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] mb-3">
                Traits
              </h2>
              <div className="flex flex-wrap gap-2">
                {traitEntries.map(([category, value]) => (
                  <TraitBadge key={category} category={category} value={value} />
                ))}
              </div>
            </div>
          </div>

          {/* Right panel — Chat (fills remaining height) */}
          <div className="min-h-0 h-full">
            <ChatWindow
              tokenId={tokenId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
