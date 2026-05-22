import { ChatMessage } from "@/types/normie";

interface ChatMessageProps {
  message: ChatMessage;
  normieId: number;
}

export default function ChatMessageBubble({ message, normieId }: ChatMessageProps) {
  const isNormie = message.role === "assistant";

  return (
    <div className={`flex ${isNormie ? "justify-start" : "justify-end"} mb-3`}>
      <div
        className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
          isNormie ? "chat-bubble-normie" : "chat-bubble-user"
        }`}
      >
        {isNormie && (
          <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--accent-glow)] mb-1">
            Normie #{normieId}
          </span>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
