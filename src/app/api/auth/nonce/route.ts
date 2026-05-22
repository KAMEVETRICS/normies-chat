import { NextRequest, NextResponse } from "next/server";
import { createNonce } from "@/lib/wallet-auth";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req.headers);

  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429 }
    );
  }

  const nonce = createNonce();
  if (!nonce) {
    return NextResponse.json(
      { error: "Server busy. Try again in a moment." },
      { status: 503 }
    );
  }

  return NextResponse.json({ nonce });
}
