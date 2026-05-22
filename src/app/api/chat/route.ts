import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildSystemPrompt } from "@/lib/personality";
import { ChatMessage } from "@/types/normie";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { checkDailyLimit, consumeDailyMessage } from "@/lib/daily-limit";
import { fetchTraitsServer, fetchCanvasInfoServer, isNormieHolder } from "@/lib/normies-api-server";
import { verifySessionToken } from "@/lib/wallet-auth";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);

  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const { tokenId, history, message } = body as {
      tokenId: number;
      history: ChatMessage[];
      message: string;
    };

    if (tokenId == null || !message) {
      return NextResponse.json(
        { error: "tokenId and message are required" },
        { status: 400 }
      );
    }

    // Read verified wallet from session cookie — not from request body
    const sessionToken = req.cookies.get("normie-session")?.value;
    const verifiedWallet = sessionToken
      ? verifySessionToken(sessionToken)
      : null;

    // Check holder status only for verified wallets
    const holderWallet =
      verifiedWallet && (await isNormieHolder(verifiedWallet))
        ? verifiedWallet
        : undefined;

    // Check daily message limit — only verified holders get the 10-message tier
    const { allowed, remaining, limit } = await checkDailyLimit(ip, holderWallet);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "daily_limit",
          message: `You've used all ${limit} messages for today. Resets at midnight UTC.`,
          remaining: 0,
          limit,
        },
        { status: 429 }
      );
    }

    // Fetch traits server-side — never trust client input
    const [traits, isCustomized] = await Promise.all([
      fetchTraitsServer(tokenId),
      fetchCanvasInfoServer(tokenId),
    ]);

    const systemPrompt = buildSystemPrompt(traits, tokenId, isCustomized);

    // Validate and sanitize history
    const sanitizedHistory = (history || [])
      .filter(
        (msg): msg is ChatMessage =>
          typeof msg === "object" &&
          msg !== null &&
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.content === "string" &&
          msg.content.length > 0 &&
          msg.content.length <= 2000
      )
      .slice(-20);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...sanitizedHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user", content: message.slice(0, 2000) },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_tokens: 200,
      temperature: 0.85,
    });

    const reply = completion.choices[0]?.message?.content ?? "...";

    // Consume one daily message after successful response
    await consumeDailyMessage(ip, holderWallet);

    return NextResponse.json({
      reply,
      remaining: remaining - 1,
      limit,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
