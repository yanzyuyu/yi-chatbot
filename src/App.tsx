import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, MessageSquare, Menu, X, ChevronDown, Code2, Brain, Zap, RefreshCw, Sparkles, Image as ImageIcon, Loader2, Bot, Github } from 'lucide-react';
import { ChatInterface } from './components/ChatInterface';
import { ChatMessage, generateCodeStream, FileData } from './services/geminiService';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const getSystemInstruction = (memoryFacts: string[], modelId: string) => {
  const memoryContext = memoryFacts.length > 0 ? `\nPREFERENSI PEMBAHASAAN: ${memoryFacts.slice(-3).join(', ')}` : "";
  const langRule = "WAJIB JAWAB DALAM BAHASA INDONESIA yang santai namun profesional.";

  if (modelId === "moonshotai/kimi-k2-instruct-0905") {
    return `Kamu adalah KIMI SUPER AGENT, pakar koding tingkat dunia. ${langRule}
TUGAS UTAMA:
1. Menghasilkan kode production-ready, efisien, dan aman.
2. Troubleshooting tingkat lanjut dan analisis error mendalam.
3. Selalu gunakan tag <write_file path="path/to/file">content</write_file> dan <execute>command</execute> jika diperlukan. ${memoryContext}`;
  }

  if (modelId === "openai/gpt-oss-20b" || modelId.includes("qwen")) {
    return `Kamu AI Research Assistant akurat. ${langRule}
TUGAS: Cari data terbaru lewat browser_search dan lakukan analisis DEEP REASONING sebelum menjawab. ${memoryContext}`;
  }

  return `Kamu AI Assistant Vision. ${langRule}
TUGAS: Analisis gambar/visual secara teknis. ${memoryContext}`;
};

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: number;
  modelId: string;
}

type PageType = 'chatbot' | 'vision' | 'coding';

const SplashScreen = () => (
  <div className="h-screen w-full bg-[#212121] flex flex-col items-center justify-center space-y-6 animate-in fade-in duration-700">
    <div className="relative">
      <div className="absolute inset-0 bg-[#19C37D]/20 blur-[40px] rounded-full animate-pulse" />
      <div className="relative w-20 h-20 bg-[#171717] border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl">
        <Bot className="w-10 h-10 text-[#19C37D]" />
      </div>
    </div>
    <div className="flex flex-col items-center space-y-2">
      <h2 className="text-xl font-bold text-white tracking-tight">Yanzy Intelligence</h2>
      <div className="flex items-center gap-2 text-[#666]">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Initializing Neural Link</span>
      </div>
    </div>
  </div>
);

export default function App() {
  const [activePage, setActivePage] = useState<PageType>('chatbot');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(true);
  const [memoryFacts, setMemoryFacts] = useState<string[]>([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-20b");
  const selectedModelRef = useRef(selectedModel);
  
  useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);

  const chatbotModels = [
    { id: "openai/gpt-oss-20b", name: "Compound", description: "Reasoning & Search", icon: <Brain className="w-4 h-4" /> },
    { id: "qwen/qwen3-32b", name: "Quon Expert", description: "Smart Search", icon: <Sparkles className="w-4 h-4" /> }
  ];

  const visionModels = [{ id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama Image", icon: <Zap className="w-4 h-4" /> }];
  const codingModels = [{ id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2", icon: <Code2 className="w-4 h-4" /> }];
  const allModels = [...chatbotModels, ...visionModels, ...codingModels];

  useEffect(() => {
    if (activePage === 'vision') setSelectedModel(visionModels[0].id);
    else if (activePage === 'coding') setSelectedModel(codingModels[0].id);
    else if (activePage === 'chatbot' && !chatbotModels.some(m => m.id === selectedModel)) setSelectedModel(chatbotModels[0].id);
  }, [activePage]);

  useEffect(() => {
    const init = async () => {
      try {
        const [chatsRes, memoryRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/chats`),
          fetch(`${API_BASE_URL}/api/memory`)
        ]);
        const chatData = await chatsRes.json();
        const memoryData = await memoryRes.json();
        if (Array.isArray(chatData)) {
          setSessions(chatData.map((s: any) => ({ ...s, modelId: s.modelId || "openai/gpt-oss-20b" })));
        }
        if (memoryData.facts) setMemoryFacts(memoryData.facts);
      } catch (err) {
        console.error("Initialization failed:", err);
      } finally {
        setTimeout(() => setIsInitialLoading(false), 1500);
      }
    };
    const isDesktop = window.innerWidth >= 1024;
    if (isDesktop) setIsSidebarOpen(true);
    init();
  }, []);

  useEffect(() => {
    if (sessions.length > 0 && !isInitialLoading) {
      fetch(`${API_BASE_URL}/api/chats`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chats: sessions }) });
    }
  }, [sessions]);

  useEffect(() => {
    const suitable = sessions.find(s => s.modelId === selectedModel);
    if (suitable) setCurrentSessionId(suitable.id);
    else setCurrentSessionId(null);
  }, [selectedModel, activePage]);

  if (isInitialLoading) return <SplashScreen />;

  const filteredSessions = sessions.filter(s => s.modelId === selectedModel);
  const currentSession = sessions.find(s => s.id === currentSessionId);
  const messages = currentSession?.messages || [];

  const createNewSession = () => {
    const newSession: ChatSession = { id: Date.now().toString(), title: 'New Chat', messages: [], updatedAt: Date.now(), modelId: selectedModel };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) setCurrentSessionId(null);
  };

  const handleSendMessage = async (text: string, fileData?: FileData | null, overrideModel?: string) => {
    const modelToUse = overrideModel || selectedModelRef.current;
    let targetId = currentSessionId;
    if (!targetId || (sessions.find(s => s.id === targetId)?.modelId !== modelToUse)) {
      const newS: ChatSession = { id: Date.now().toString(), title: text.slice(0, 30) + '...', messages: [], updatedAt: Date.now(), modelId: modelToUse };
      setSessions(prev => [newS, ...prev]);
      setCurrentSessionId(newS.id);
      targetId = newS.id;
    }
    setIsLoading(true);
    try {
      let imageUrl = undefined;
      if (fileData) {
        const uploadRes = await fetch(`${API_BASE_URL}/api/upload`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base64: fileData.base64 }) });
        const uploadData = await uploadRes.json();
        if (uploadData.url) imageUrl = uploadData.url;
      }
      const newMessage: ChatMessage = { role: 'user', text, imageUrl };
      const currentMsgs = sessions.find(s => s.id === targetId)?.messages || [];
      const newMessages = [...currentMsgs, newMessage];
      setSessions(prev => prev.map(s => s.id === targetId ? { ...s, messages: [...newMessages, { role: 'model', text: '' }], updatedAt: Date.now() } : s));
      const stream = generateCodeStream(newMessages, getSystemInstruction(memoryFacts, modelToUse), imageUrl, isThinkingMode, modelToUse);
      let fullResponse = '';
      let fullReasoning = '';
      let toolCalls: any[] = [];
      let executedTools: any[] = [];
      for await (const chunk of stream) {
        if (chunk.text) fullResponse += chunk.text;
        if (chunk.reasoning) fullReasoning += chunk.reasoning;
        if (chunk.toolCalls) toolCalls = [...toolCalls, ...chunk.toolCalls];
        if (chunk.executedTools) executedTools = chunk.executedTools;
        setSessions(prev => prev.map(s => {
          if (s.id === targetId) {
            const updatedMsgs = [...s.messages];
            updatedMsgs[updatedMsgs.length - 1] = { ...updatedMsgs[updatedMsgs.length - 1], text: fullResponse, reasoning: fullReasoning, toolCalls, executedTools };
            return { ...s, messages: updatedMsgs, updatedAt: Date.now() };
          }
          return s;
        }));
      }
      const memoryRegex = /<save_memory>([\s\S]*?)<\/save_memory>/g;
      let match;
      const newFacts = [...memoryFacts];
      let hasNew = false;
      while ((match = memoryRegex.exec(fullResponse)) !== null) {
        if (match[1].trim()) { newFacts.push(match[1].trim()); hasNew = true; }
      }
      if (hasNew) {
        setMemoryFacts(newFacts);
        fetch(`${API_BASE_URL}/api/memory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facts: newFacts }) });
      }
    } catch (error: any) { console.error('Error:', error); } finally { setIsLoading(false); }
  };

  const handleRegenerate = () => {
    if (messages.length < 2 || isLoading) return;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: s.messages.slice(0, -1) } : s));
    handleSendMessage(lastUser.text, null);
  };

  const handleModelSwitch = (modelId: string) => {
    if (messages.length < 2 || isLoading) return;
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    setSelectedModel(modelId);
    handleSendMessage(lastUser.text, null, modelId);
  };

  const currentModel = allModels.find(m => m.id === selectedModel);

  return (
    <div className="h-screen w-full flex bg-[#212121] text-[#ececec] overflow-hidden relative">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-200" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 lg:relative lg:z-auto ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0'} transition-all duration-300 bg-[#171717] flex flex-col shrink-0 border-r border-[#2f2f2f] overflow-hidden`}>
        <div className="p-3 flex items-center justify-between gap-2 border-b border-[#2f2f2f]/50">
          <button onClick={createNewSession} className="flex-1 flex items-center gap-3 px-3 py-2.5 hover:bg-[#2f2f2f] rounded-lg transition-colors group">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm"><Plus className="w-3.5 h-3.5 text-black" /></div>
            <span className="text-sm font-medium">New Chat</span>
          </button>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors text-[#b4b4b4] hover:text-white lg:hidden">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1 no-scrollbar">
          <div className="px-3 pb-2 text-[10px] font-bold text-[#666] uppercase tracking-wider select-none">{currentModel?.name} History</div>
          {filteredSessions.map(session => (
            <div key={session.id} onClick={() => { setCurrentSessionId(session.id); if (window.innerWidth < 1024) setIsSidebarOpen(false); }} className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${currentSessionId === session.id ? 'bg-[#2f2f2f] text-white' : 'text-[#b4b4b4] hover:bg-[#2f2f2f] hover:text-[#ececec]'}`}>
              <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
              <div className="flex-1 min-w-0"><p className="text-sm truncate">{session.title}</p></div>
              <button onClick={(e) => deleteSession(session.id, e)} className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-2 hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-all rounded-lg shrink-0 flex items-center justify-center" title="Delete chat">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {filteredSessions.length === 0 && <div className="px-3 py-10 text-center text-xs text-[#555] italic">No chats found</div>}
        </div>

        <div className="p-2 space-y-1 bg-[#1e1e1e] border-t border-[#2f2f2f]">
          <button onClick={() => setActivePage('chatbot')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activePage === 'chatbot' ? 'bg-[#2f2f2f] text-white shadow-sm' : 'text-[#888] hover:bg-[#2f2f2f] hover:text-[#aaa]'}`}>
            <MessageSquare className="w-4.5 h-4.5" /><span className="text-[13px] font-medium">Chatbot Expert</span>
          </button>
          <button onClick={() => setActivePage('vision')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activePage === 'vision' ? 'bg-[#2f2f2f] text-white shadow-sm' : 'text-[#888] hover:bg-[#2f2f2f] hover:text-[#aaa]'}`}>
            <ImageIcon className="w-4.5 h-4.5" /><span className="text-[13px] font-medium">Vision Analysis</span>
          </button>
          <button onClick={() => setActivePage('coding')} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activePage === 'coding' ? 'bg-[#2f2f2f] text-white shadow-sm' : 'text-[#888] hover:bg-[#2f2f2f] hover:text-[#aaa]'}`}>
            <Code2 className="w-4.5 h-4.5" /><span className="text-[13px] font-medium">Super Coding Agent</span>
          </button>
        </div>

        <div className="p-3 border-t border-[#2f2f2f] bg-[#1a1a1a]">
          <a href="https://github.com/yanzyuyu" target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#2f2f2f] rounded-lg transition-all text-[#666] hover:text-white group">
            <Github className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Developed by</span>
              <span className="text-sm font-medium">yanzyuyu</span>
            </div>
          </a>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <header className="h-14 px-2 md:px-4 flex items-center justify-between shrink-0 bg-[#212121]/80 backdrop-blur-sm sticky top-0 z-30 border-b border-white/5 md:border-none">
          <div className="flex items-center gap-1 md:gap-2 min-w-0">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors shrink-0"><Menu className="w-5 h-5 text-[#b4b4b4]" /></button>
            )}
            <div className="relative">
              <button onClick={() => setIsModelMenuOpen(!isModelMenuOpen)} className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 hover:bg-[#2f2f2f] rounded-xl transition-colors text-[#b4b4b4] hover:text-[#ececec] ${activePage !== 'chatbot' ? 'cursor-default' : ''}`}>
                <div className="text-blue-400 shrink-0">{currentModel?.icon}</div>
                <span className="text-sm font-semibold whitespace-nowrap">{currentModel?.name}</span>
                {activePage === 'chatbot' && <ChevronDown className={`w-3.5 h-3.5 transition-transform shrink-0 ${isModelMenuOpen ? 'rotate-180' : ''}`} />}
              </button>
              {isModelMenuOpen && activePage === 'chatbot' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsModelMenuOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-max min-w-[160px] bg-[#2f2f2f] border border-[#424242] rounded-xl shadow-2xl z-50 p-1 animate-in fade-in slide-in-from-top-2">
                    {chatbotModels.map(m => (
                      <button key={m.id} onClick={() => { setSelectedModel(m.id); setIsModelMenuOpen(false); }} className={`w-full text-left px-3 py-2 text-[13px] hover:bg-[#3e3e3e] rounded-lg transition-colors text-[#ececec] flex items-center gap-3 whitespace-nowrap group/btn ${selectedModel === m.id ? 'bg-[#3e3e3e]' : ''}`}>
                        <div className={`transition-colors shrink-0 ${selectedModel === m.id ? 'text-blue-400' : 'text-[#b4b4b4] group-hover/btn:text-blue-400'}`}>{m.icon}</div>
                        <span className={`font-medium pr-2 whitespace-nowrap ${selectedModel === m.id ? 'text-white' : ''}`}>{m.name}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => window.location.reload()} className="p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors text-[#b4b4b4]"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative flex flex-col">
          <ChatInterface 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            onRegenerate={handleRegenerate}
            onModelSwitch={handleModelSwitch}
            currentModelId={selectedModel}
            isLoading={isLoading} 
            isThinkingMode={isThinkingMode} 
            onThinkingModeChange={setIsThinkingMode} 
          />
        </main>
      </div>
    </div>
  );
}
