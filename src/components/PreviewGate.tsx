"use client";

import WalletConnect from "./WalletConnect";

interface PreviewGateProps {
  onKeepWatching: () => void;
}

export default function PreviewGate({ onKeepWatching }: PreviewGateProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-primary)]/90 backdrop-blur-sm">
      <div className="text-center px-8 py-10 max-w-sm">
        <p className="font-headline italic text-lg text-[var(--accent-glow)] mb-4">
          [ The Normie falls silent. ]
        </p>
        <p className="text-[var(--text-secondary)] text-sm mb-6 leading-relaxed">
          You&apos;re talking to someone else&apos;s Normie.
          <br />
          Connect your wallet to see if you own one — or just keep watching.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <WalletConnect variant="seal" />
          <button
            onClick={onKeepWatching}
            className="px-6 py-3 border border-[var(--border-strong)] text-[var(--text-primary)] font-bold text-xs uppercase tracking-[0.1em] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
          >
            Keep Watching
          </button>
        </div>
      </div>
    </div>
  );
}
