"use client";

import Link from "next/link";
import PixelAvatar from "./PixelAvatar";

interface NormieCardProps {
  tokenId: number;
}

export default function NormieCard({ tokenId }: NormieCardProps) {
  return (
    <Link href={`/normie/${tokenId}`}>
      <div className="group cursor-pointer border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-glow)]/30 transition-all duration-200 p-4 flex flex-col items-center gap-3">
        <PixelAvatar id={tokenId} size={120} />
        <span className="font-mono text-xs text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
          #{tokenId}
        </span>
      </div>
    </Link>
  );
}
