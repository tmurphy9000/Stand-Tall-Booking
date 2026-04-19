import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sparkles, Mic, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// AI assistant — conversation backend to be wired up via Supabase Edge Function.
// The UI is fully functional; swap `sendMessage` below to call your own endpoint.
export default function BarberAssistant({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput(prev => prev + (prev ? " " : "") + transcript);
        setIsListening(false);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const sendMessage = async (text) => {
    // TODO: replace with supabase.functions.invoke('barberAssistant', { body: { messages } })
    return "AI assistant backend not yet configured. Deploy a `barberAssistant` Supabase Edge Function to enable this feature.";
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    const reply = await sendMessage(userMsg.content);
    setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    setIsLoading(false);
  };

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) { alert("Voice input not supported in this browser"); return; }
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8B9A7E] to-[#6B7A5E] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">AI Assistant</DialogTitle>
                <p className="text-xs text-gray-500">Service recommendations, notes, and scheduling help</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-4 text-[#8B9A7E]" />
              <p className="text-sm font-medium mb-2">How can I assist you today?</p>
              <p className="text-xs text-gray-400">Ask me about service suggestions, appointment notes, or optimal scheduling</p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-[#8B9A7E]/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <Sparkles className="w-4 h-4 text-[#8B9A7E]" />
                </div>
              )}
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-2.5",
                msg.role === "user" ? "bg-[#8B9A7E] text-white" : "bg-gray-100 text-gray-900"
              )}>
                {msg.role === "user" ? (
                  <p className="text-sm">{msg.content}</p>
                ) : (
                  <ReactMarkdown className="text-sm prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    components={{
                      p: ({ children }) => <p className="my-1">{children}</p>,
                      ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                      ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                      li: ({ children }) => <li className="my-0.5">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    }}
                  >{msg.content}</ReactMarkdown>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-[#8B9A7E]/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-[#8B9A7E]" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-[#8B9A7E] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[#8B9A7E] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[#8B9A7E] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t px-6 py-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask about services, notes, or scheduling..."
                className="min-h-[44px] max-h-32 resize-none pr-12"
                disabled={isLoading}
              />
              <Button size="icon" variant="ghost"
                className={cn("absolute right-2 top-2 w-8 h-8", isListening && "text-red-500 animate-pulse")}
                onClick={toggleVoiceInput} disabled={isLoading}
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            <Button size="icon" className="bg-[#8B9A7E] hover:bg-[#6B7A5E] text-white w-11 h-11"
              onClick={handleSend} disabled={!input.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            {isListening ? "Listening… Speak now" : "Press Enter to send, click mic for voice input"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
