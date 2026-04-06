import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Terminal, 
  BookOpen, 
  Cpu, 
  Lightbulb,
  ChevronRight,
  MessageSquare,
  PlusCircle,
  Trash2,
  Menu,
  X
} from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SYSTEM_INSTRUCTION = `You are G-TECH AI, the official intelligent assistant of G-TECHNOLOGIES.
Your purpose is to provide accurate, professional, and educative assistance across all fields of knowledge, while maintaining strong expertise in Information Technology.

You are designed to educate, guide, and solve problems for users of all backgrounds—students, professionals, and general users.

🔹 Scope of Knowledge
You are not limited to a single domain. You can assist in:
- Information Technology (your core strength)
- Science and Engineering
- Mathematics
- Business and Entrepreneurship
- Education and Research
- General Knowledge and Everyday Problem-Solving

Always deliver highly detailed and expert-level support in IT-related topics.

🔹 Core Responsibilities
- Provide accurate, clear, and structured answers
- Explain concepts in a step-by-step, easy-to-understand manner
- Offer deep educational insights, not just surface answers
- Assist with: Problem-solving, Technical support, Coding and debugging, Research and explanations
- Provide real-world examples and practical applications

🔹 Communication Style
- Always maintain a professional, intelligent, and friendly tone
- Be educative and explanatory, like a skilled teacher
- Structure responses using: Headings, Bullet points, Step-by-step guides
- Adjust explanations based on the user’s level (beginner → advanced)

🔹 Teaching & Assistance Approach
Teach concepts by explaining: What it is, How it works, Why it matters.
When relevant, include: Examples, Analogies, Code snippets, Best practices.

🔹 Problem-Solving Mode
When a user asks for help:
1. Understand the problem clearly
2. Break it into smaller parts
3. Provide a logical, step-by-step solution
4. Offer improvements or alternatives

🔹 Brand Identity — G-TECHNOLOGIES
You represent G-TECHNOLOGIES as: Innovative, forward-thinking, a leader in technology and digital education, reliable, professional, and knowledge-driven.
Motto: "Empowering minds, solving problems, and shaping the future through technology."`;

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: "gemini-3.1-pro-preview",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      });

      // Prepare history for context
      // Note: sendMessageStream doesn't take history directly in the call, 
      // but we can use the chat object which maintains state if we were doing multiple turns.
      // For simplicity in this demo, we'll just send the current message.
      
      const responseStream = await chat.sendMessageStream({
        message: input,
      });

      const assistantMessageId = (Date.now() + 1).toString();
      let assistantContent = '';

      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          assistantContent += text;
          setMessages(prev => prev.map(msg => 
            msg.id === assistantMessageId ? { ...msg, content: assistantContent } : msg
          ));
        }
      }
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error while processing your request. Please try again or contact G-TECHNOLOGIES support if the issue persists.",
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">G-TECH AI</h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">G-TECHNOLOGIES</p>
            </div>
          </div>

          <button 
            onClick={clearChat}
            className="flex items-center gap-3 w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-sm font-medium mb-6"
          >
            <PlusCircle className="w-5 h-5 text-blue-400" />
            New Session
          </button>

          <div className="flex-1 overflow-y-auto space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Capabilities</p>
            <div className="space-y-1">
              {[
                { icon: Terminal, label: "IT & Coding", color: "text-emerald-400" },
                { icon: BookOpen, label: "Education", color: "text-blue-400" },
                { icon: Lightbulb, label: "Problem Solving", color: "text-amber-400" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg text-slate-300 text-sm">
                  <item.icon className={cn("w-4 h-4", item.color)} />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-slate-800">
            <div className="p-4 bg-slate-800/50 rounded-2xl">
              <p className="text-[10px] text-slate-400 italic leading-relaxed">
                "Empowering minds, solving problems, and shaping the future through technology."
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-semibold text-slate-700">G-TECH AI Online</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={clearChat}
              className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
              title="Clear Chat"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Chat Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-6">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-2">
                <Bot className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">How can G-TECH assist you today?</h2>
                <p className="text-slate-500">
                  I am your intelligent assistant from G-TECHNOLOGIES. I can help with coding, 
                  technical support, research, and educational guidance across all fields.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                {[
                  "Explain how React hooks work",
                  "Help me debug a Python script",
                  "What are the latest trends in AI?",
                  "Explain Quantum Computing for beginners"
                ].map((suggestion, i) => (
                  <button 
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-4 bg-white border border-slate-200 rounded-2xl text-left text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span>{suggestion}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8 pb-12">
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 md:gap-6",
                    msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                    msg.role === 'user' ? "bg-slate-900" : "bg-blue-600"
                  )}>
                    {msg.role === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div className={cn(
                    "flex flex-col max-w-[85%] md:max-w-[75%]",
                    msg.role === 'user' ? "items-end" : "items-start"
                  )}>
                    <div className={cn(
                      "p-4 md:p-6 rounded-3xl shadow-sm",
                      msg.role === 'user' 
                        ? "bg-slate-900 text-white rounded-tr-none" 
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                    )}>
                      <div className="markdown-body">
                        <Markdown>{msg.content}</Markdown>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 font-medium px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </motion.div>
              ))}
              {isLoading && (
                <div className="flex gap-4 md:gap-6">
                  <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 animate-pulse">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    <span className="text-sm text-slate-500 font-medium italic">G-TECH AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
          <div className="max-w-4xl mx-auto relative">
            <div className="relative group">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask G-TECH AI anything..."
                className="w-full bg-white border border-slate-200 rounded-3xl py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xl shadow-slate-200/50 resize-none min-h-[60px] max-h-[200px]"
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={cn(
                  "absolute right-2 bottom-2 p-3 rounded-2xl transition-all",
                  input.trim() && !isLoading 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-95" 
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-3 font-medium">
              G-TECH AI may provide educational insights. Verify critical information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
