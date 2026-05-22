import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildSystemPrompt } from "@/lib/personality";
import { isRateLimited, getClientIp } from "@/lib/rate-limit";
import { fetchTraitsServer, fetchCanvasInfoServer } from "@/lib/normies-api-server";

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
    const { tokenId } = body as { tokenId: number };

    if (tokenId == null) {
      return NextResponse.json(
        { error: "tokenId is required" },
        { status: 400 }
      );
    }

    // Fetch traits server-side — never trust client input
    const [traits, isCustomized] = await Promise.all([
      fetchTraitsServer(tokenId),
      fetchCanvasInfoServer(tokenId),
    ]);

    const systemPrompt = buildSystemPrompt(traits, tokenId, isCustomized);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Say something. Introduce yourself. Make it short — one or two sentences max. Set the tone for who you are.",
        },
      ],
      max_tokens: 150,
      temperature: 0.9,
    });

    const opening = completion.choices[0]?.message?.content ?? "...";

    return NextResponse.json({ opening });
  } catch (error) {
    console.error("Personality generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate personality" },
      { status: 500 }
    );
  }
}
