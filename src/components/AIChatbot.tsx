import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, Loader2, HelpCircle } from "lucide-react";

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "model",
      content: "Hello! I am **EcoRoute AI**, your intelligent neighborhood sustainability coordinator and application guide. Ask me anything about how to report waste, coordinate cleanups, check duplicate flags, or general ecology & recycling topics!",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: chatHistory,
        }),
      });

      if (!res.ok) {
        throw new Error("Chat request failed.");
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "model", content: data.response }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          content: "Sorry, I ran into an issue connecting to the Gemini server. Please check your credentials or network and try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const presetQuestions = [
    "How does the automated duplicate detector work?",
    "Explain waste hazard categories (Critical vs Low)",
    "Can I report waste without a photo?",
    "Tips to reduce plastic footprints at home",
  ];

  // Helper to safely render simple markdown elements (bold, lists, paragraph linebreaks)
  const renderMessageContent = (content: string) => {
    return content.split("\n").map((line, idx) => {
      let formattedLine = line;
      // Bold replacements (**text**)
      const boldRegex = /\*\*(.*?)\*\*/g;
      formattedLine = formattedLine.replace(boldRegex, "<strong>$1</strong>");

      // Bullet points
      if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        return (
          <li
            key={idx}
            className="ml-4 list-disc mt-1 text-xs text-slate-700 leading-relaxed font-medium"
            dangerouslySetInnerHTML={{ __html: formattedLine.replace(/^[\s-*]+/, "") }}
          />
        );
      }

      return (
        <p
          key={idx}
          className="text-xs text-slate-700 leading-relaxed font-medium mb-1.5"
          dangerouslySetInnerHTML={{ __html: formattedLine }}
        />
      );
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      {/* Expanded Chat Box */}
      {isOpen && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 w-[350px] sm:w-[400px] h-[500px] flex flex-col mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-emerald-500 rounded-lg">
                <Sparkles className="h-4 w-4 text-white animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold">EcoRoute Intelligent Support</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[9px] text-slate-400 font-semibold">Gemini 3.5 Active</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2.5 max-w-[85%] ${
                  m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 h-7 w-7 flex items-center justify-center ${
                    m.role === "user"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-900 text-slate-200"
                  }`}
                >
                  {m.role === "user" ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
                </div>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs font-medium shadow-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-emerald-600 text-white rounded-tr-none"
                      : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                  }`}
                >
                  {m.role === "user" ? <p className="font-semibold">{m.content}</p> : renderMessageContent(m.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 max-w-[85%] mr-auto">
                <div className="p-1.5 bg-slate-900 text-slate-200 rounded-lg shrink-0 h-7 w-7 flex items-center justify-center">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div className="px-3.5 py-2.5 bg-white border border-slate-100 text-slate-400 rounded-2xl rounded-tl-none text-xs flex items-center gap-1.5 font-medium shadow-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />
                  <span>EcoRoute AI thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Pre-filled Suggestions Drawer */}
          {messages.length === 1 && (
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <HelpCircle className="h-3 w-3" /> Suggested queries:
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {presetQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="text-[10px] bg-white border border-slate-200 text-slate-600 font-semibold px-2 py-1 rounded-md hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/20 text-left transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Form Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || loading}
              className={`p-2.5 rounded-xl text-white transition-colors cursor-pointer ${
                inputValue.trim() && !loading
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Sparkles Launcher Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-4 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 hover:bg-slate-800 cursor-pointer ${
          isOpen ? "ring-4 ring-emerald-500/20" : ""
        }`}
        id="ai-chatbot-launcher"
      >
        <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
        <span className="text-xs font-extrabold tracking-wide pr-1">EcoRoute AI Chat</span>
      </button>
    </div>
  );
}
