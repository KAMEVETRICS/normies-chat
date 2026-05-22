import { NormieTraits, CanvasInfo } from "@/types/normie";

const BASE_URL = "https://api.normies.art";

export async function fetchTraits(id: number): Promise<NormieTraits> {
  const res = await fetch(`${BASE_URL}/normie/${id}/traits`);
  if (!res.ok) throw new Error(`Failed to fetch traits for Normie #${id}`);
  const data = await res.json();

  // API returns { raw: "0x...", attributes: [{trait_type, value}, ...] }
  const attrArray = data.attributes ?? (Array.isArray(data) ? data : []);
  const traits = {} as Record<string, string>;
  for (const item of attrArray) {
    traits[item.trait_type] = item.value;
  }
  return traits as unknown as NormieTraits;
}

export function getImageUrl(id: number): string {
  return `${BASE_URL}/normie/${id}/image.png`;
}

export async function fetchMetadata(id: number) {
  const res = await fetch(`${BASE_URL}/normie/${id}/metadata`);
  if (!res.ok) throw new Error(`Failed to fetch metadata for Normie #${id}`);
  return res.json();
}

export async function fetchCanvasInfo(id: number): Promise<CanvasInfo> {
  const res = await fetch(`${BASE_URL}/normie/${id}/canvas/info`);
  if (!res.ok) throw new Error(`Failed to fetch canvas info for Normie #${id}`);
  const data = await res.json();
  return {
    actionPoints: data.actionPoints ?? 0,
    level: data.level ?? 1,
    customized: data.customized ?? false,
  };
}

export async function fetchHolderTokens(address: string): Promise<number[]> {
  const res = await fetch(`${BASE_URL}/holders/${address}`);
  if (!res.ok) throw new Error(`Failed to fetch tokens for ${address}`);
  const data = await res.json();
  // API may return an array directly, or an object with tokens/tokenIds key
  const raw = Array.isArray(data) ? data : data.tokens ?? data.tokenIds ?? [];
  return Array.isArray(raw) ? raw.map(Number) : [];
}
