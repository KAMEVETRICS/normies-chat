"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

interface WalletConnectProps {
  variant?: "default" | "seal";
}

export default function WalletConnect({ variant = "default" }: WalletConnectProps) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none" as const, userSelect: "none" as const },
            })}
          >
            {(() => {
              if (!connected) {
                if (variant === "seal") {
                  return (
                    <button
                      onClick={openConnectModal}
                      className="relative group flex flex-col items-center justify-center focus:outline-none cursor-pointer"
                    >
                      <div className="wax-seal">
                        <div className="wax-seal-ring">
                          <div className="absolute inset-0 border-[3px] border-dotted border-white/20 rounded-full seal-dotted-ring" />
                          <span
                            className="material-symbols-outlined text-white text-3xl opacity-90 drop-shadow-md"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            wallet
                          </span>
                        </div>
                      </div>
                      <span className="mt-6 font-bold text-xs uppercase tracking-[0.2em] text-[var(--text-primary)] group-hover:text-[var(--seal-bg)] transition-colors">
                        Connect Wallet
                      </span>
                    </button>
                  );
                }
                return (
                  <button
                    onClick={openConnectModal}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--seal-bg)] hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <span
                      className="material-symbols-outlined text-white text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      wallet
                    </span>
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className="px-4 py-2 border border-[var(--seal-bg)] text-[var(--seal-bg)] font-bold text-xs uppercase tracking-[0.1em] cursor-pointer"
                  >
                    Wrong Network
                  </button>
                );
              }

              return (
                <button
                  onClick={openAccountModal}
                  className="flex items-center gap-2 px-3 py-2 border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-colors text-sm cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="font-mono text-xs text-[var(--text-primary)]">
                    {account.displayName}
                  </span>
                </button>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
