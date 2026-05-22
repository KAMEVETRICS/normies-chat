// Server-side trait fetching — never trust client-supplied traits
import { NormieTraits } from "@/types/normie";

const BASE_URL = "https://api.normies.art";

export async function fetchTraitsServer(tokenId: number): Promise<NormieTraits> {
  if (!Number.isInteger(tokenId) || tokenId < 0 || tokenId > 9999) {
    throw new Error("Invalid tokenId");
  }

  const res = await fetch(`${BASE_URL}/normie/${tokenId}/traits`, {
    next: { revalidate: 300 }, // cache for 5 minutes
  });
  if (!res.ok) throw new Error(`Failed to fetch traits for Normie #${tokenId}`);
  const data = await res.json();

  const attrArray = data.attributes ?? (Array.isArray(data) ? data : []);
  const traits = {} as Record<string, string>;
  for (const item of attrArray) {
    traits[item.trait_type] = item.value;
  }
  return traits as unknown as NormieTraits;
}

export async function fetchCanvasInfoServer(tokenId: number): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/normie/${tokenId}/canvas/info`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;
    const data = await res.json();
    return data.customized ?? false;
  } catch {
    return false;
  }
}

// Check if a wallet holds at least one Normie (cached for 5 minutes)
export async function isNormieHolder(walletAddress: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/holders/${walletAddress}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const tokens = Array.isArray(data) ? data : data.tokens ?? data.tokenIds ?? [];
    return Array.isArray(tokens) && tokens.length > 0;
  } catch {
    return false;
  }
}
