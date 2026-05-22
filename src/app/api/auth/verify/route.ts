import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";
import { consumeNonce, createSessionToken } from "@/lib/wallet-auth";

export async function POST(req: NextRequest) {
  try {
    const { address, nonce, signature } = (await req.json()) as {
      address: string;
      nonce: string;
      signature: string;
    };

    if (!address || !nonce || !signature) {
      return NextResponse.json(
        { error: "address, nonce, and signature are required" },
        { status: 400 }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Verify nonce is valid and unused
    if (!consumeNonce(nonce)) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 401 }
      );
    }

    // Verify the wallet signature
    const message = `Sign this message to verify your wallet for Normie Intelligence.\n\nNonce: ${nonce}`;
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Create session token and set as cookie
    const token = createSessionToken(address);
    const response = NextResponse.json({ verified: true });
    response.cookies.set("normie-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Wallet verification error:", error);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
