"use client";

import { useEffect, useRef } from "react";
import { useAccount, useSignMessage } from "wagmi";

// Automatically verify wallet ownership when a wallet connects
// Signs a nonce, sends to /api/auth/verify, which sets a session cookie
export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const verifiedAddress = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      // Clear session if we were previously verified
      if (verifiedAddress.current) {
        verifiedAddress.current = null;
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      }
      return;
    }

    // Skip if already verified for this address
    if (verifiedAddress.current === address.toLowerCase()) return;

    const verify = async () => {
      try {
        // 1. Get a nonce from the server
        const nonceRes = await fetch("/api/auth/nonce");
        const { nonce } = await nonceRes.json();

        // 2. Sign the nonce with the wallet
        const message = `Sign this message to verify your wallet for Normie Intelligence.\n\nNonce: ${nonce}`;
        const signature = await signMessageAsync({ message });

        // 3. Send signature to server for verification
        const verifyRes = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, nonce, signature }),
        });

        if (verifyRes.ok) {
          verifiedAddress.current = address.toLowerCase();
        }
      } catch {
        // User rejected the signature or network error — stay on free tier
      }
    };

    verify();
  }, [address, isConnected, signMessageAsync]);
}
