"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "@/types/normie";
import { useChatStore } from "@/store/chat-store";
import ChatMessageBubble from "./ChatMessage";

interface ChatWindowProps {
  tokenId: number;
}

export default function ChatWindow({ tokenId }: ChatWindowProps) {
  const { chats, addMessage, refreshIfExpired } = useChatStore();

  const messages = chats[tokenId] || [];
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const openingGeneratedFor = useRef<number | null>(null);

  const isOutOfMessages = remaining !== null && remaining <= 0;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Clear stale sessions (5+ hours inactive)
  useEffect(() => {
    const wasExpired = refreshIfExpired(tokenId);
    if (wasExpired) {
      openingGeneratedFor.current = null;
    }
  }, [tokenId, refreshIfExpired]);

  useEffect(() => {
    if (messages.length > 0 || openingGeneratedFor.current === tokenId) return;
    openingGeneratedFor.current = tokenId;

    const generateOpening = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/personality", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenId }),
        });
        const data = await res.json();
        if (!res.ok) {
          addMessage(tokenId, {
            role: "assistant",
            content: data.error === "Rate limit exceeded. Try again later."
              ? "...*yawns*... too many visitors. Come back in a bit."
              : "...*pixels flicker*... something went wrong loading my personality.",
          });
        } else if (data.opening) {
          addMessage(tokenId, { role: "assistant", content: data.opening });
        }
      } catch (err) {
        console.error("Failed to generate opening:", err);
        addMessage(tokenId, {
          role: "assistant",
          content: "...*pixels flicker*... something went wrong loading my personality.",
        });
      }
      setIsLoading(false);
    };

    generateOpening();
  }, [tokenId, messages.length, addMessage]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isOutOfMessages) return;

    const userMessage: ChatMessage = { role: "user", content: input.trim() };
    addMessage(tokenId, userMessage);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tokenId,
          history: messages,
          message: userMessage.content,
        }),
      });
      const data = await res.json();

      // Update remaining count from server
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (typeof data.limit === "number") setDailyLimit(data.limit);

      if (!res.ok) {
        if (data.error === "daily_limit") {
          setRemaining(0);
          if (typeof data.limit === "number") setDailyLimit(data.limit);
          addMessage(tokenId, {
            role: "assistant",
            content: `...*closes book*... You've used all ${data.limit} messages for today. Come back after midnight UTC.`,
          });
        } else {
          addMessage(tokenId, {
            role: "assistant",
            content: data.error === "Rate limit exceeded. Try again later."
              ? "...*sighs*... too many messages. Give me a moment."
              : "...*static*... something went wrong.",
          });
        }
      } else if (data.reply) {
        addMessage(tokenId, { role: "assistant", content: data.reply });
      }
    } catch (err) {
      console.error("Chat error:", err);
      addMessage(tokenId, {
        role: "assistant",
        content: "...*static*... lost my train of thought.",
      });
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="relative flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0 purple-scroll">
        {messages.map((msg, i) => (
          <ChatMessageBubble key={i} message={msg} normieId={tokenId} />
        ))}

        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="chat-bubble-normie px-4 py-3">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--accent-glow)] mb-1">
                Normie #{tokenId}
              </span>
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Daily limit indicator */}
      {remaining !== null && (
        <div className="px-4 py-1.5 border-t border-[var(--border-color)] bg-[var(--bg-card)]">
          <p className={`text-[10px] uppercase tracking-[0.1em] font-bold text-center ${isOutOfMessages ? "text-[var(--seal-bg)]" : "text-[var(--text-muted)]"}`}>
            {isOutOfMessages
              ? "Daily limit reached · Resets at midnight UTC"
              : `${remaining} of ${dailyLimit} messages remaining today`}
          </p>
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-[var(--border-color)] p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isOutOfMessages ? "Daily limit reached" : "Say something..."}
            disabled={isLoading || isOutOfMessages}
            className="flex-1 px-4 py-3 bg-[var(--bg-input)] border-b border-[var(--border-strong)] text-[var(--text-primary)] text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-glow)] transition disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || isOutOfMessages}
            className="px-5 py-3 bg-[var(--seal-bg)] text-white font-bold text-xs uppercase tracking-[0.1em] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:opacity-90"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
