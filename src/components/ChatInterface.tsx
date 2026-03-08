import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, Paperclip, X, Image as ImageIcon, ChevronDown, ChevronRight, BrainCircuit, Globe, Link2, Save, RefreshCw, Copy as CopyIcon, Share2, Sparkles, Check, Brain, Code2, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage, FileData } from '../services/geminiService';
import { CollapsibleCodeBlock } from './CollapsibleCodeBlock';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string, file?: FileData | null) => void;
  onRegenerate?: () => void;
  onModelSwitch?: (modelId: string) => void;
  currentModelId?: string;
  isLoading: boolean;
  isThinkingMode: boolean;
  onThinkingModeChange: (enabled: boolean) => void;
}

export function ChatInterface({ messages, onSendMessage, onRegenerate, onModelSwitch, currentModelId, isLoading, isThinkingMode, onThinkingModeChange }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<FileData | null>(null);
  const [openReasoning, setOpenReasoning] = useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeModelMenu, setActiveModelMenu] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const models = [
    { id: "openai/gpt-oss-20b", name: "Compound", icon: <Brain className="w-3.5 h-3.5" /> },
    { id: "moonshotai/kimi-k2-instruct-0905", name: "Kimi K2", icon: <Code2 className="w-3.5 h-3.5" /> },
    { id: "meta-llama/llama-4-scout-17b-16e-instruct", name: "Llama Image", icon: <Zap className="w-3.5 h-3.5" /> }
  ];

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      setIsNearBottom(scrollHeight - scrollTop - clientHeight < 150);
    }
  };

  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isNearBottom]);

  const toggleReasoning = (index: number) => {
    setOpenReasoning(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(cleanOutput(text));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleShare = (text: string) => {
    const shareText = `Check out this AI response:\n\n${cleanOutput(text)}`;
    if (navigator.share) {
      navigator.share({ title: 'AI Response', text: shareText }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Text copied to clipboard!');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const match = result.match(/^data:(.+);base64,(.+)$/);
      if (match) setAttachedFile({ mimeType: match[1], base64: match[2], name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || attachedFile) && !isLoading) {
      onSendMessage(input.trim() || "Analyze this", attachedFile);
      setInput('');
      setAttachedFile(null);
      setIsNearBottom(true);
    }
  };

  const MarkdownComponents: any = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const codeStr = String(children).replace(/\n$/, '');
      if (!inline && language) {
        let filename = undefined;
        if (codeStr.startsWith('// File: ')) {
          filename = codeStr.split('\n')[0].replace('// File: ', '');
        }
        return <CollapsibleCodeBlock language={language} filename={filename} code={codeStr} />;
      }
      return <code className="bg-[#2f2f2f] px-1.5 py-0.5 rounded text-sm font-mono border border-white/5" {...props}>{children}</code>;
    },
  };

  const cleanOutput = (text: string) => {
    return text
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/<browser_search>[\s\S]*?<\/browser_search>/g, "")
      .replace(/<web_search>[\s\S]*?<\/web_search>/g, "")
      .replace(/<browser_automation>[\s\S]*?<\/browser_automation>/g, "")
      .replace(/<write_file\s+path="([^"]+)">([\s\S]*?)<\/write_file>/g, "")
      .replace(/<save_memory>([\s\S]*?)<\/save_memory>/g, "")
      .replace(/<execute>([\s\S]*?)<\/execute>/g, "")
      .trim();
  };

  const renderMessageContent = (msg: ChatMessage, index: number) => {
    const text = msg.text;
    let thinkContent = "";
    const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) thinkContent = thinkMatch[1].trim();

    const fileActions: { path: string, content: string }[] = [];
    const writeRegex = /<write_file\s+path="([^"]+)">([\s\S]*?)<\/write_file>/g;
    let wMatch;
    while ((wMatch = writeRegex.exec(text)) !== null) {
      fileActions.push({ path: wMatch[1], content: wMatch[2].trim() });
    }

    const cleanedText = cleanOutput(text);
    const searchResults = msg.executedTools
      ?.filter(t => t.tool_name === 'browser_search' || t.tool_name === 'web_search')
      ?.flatMap(t => t.search_results || []) || [];

    const isLastModelMessage = msg.role === 'model' && index === messages.length - 1;

    return (
      <div className={`flex flex-col w-full max-w-3xl mx-auto px-2 sm:px-4 py-4 sm:py-6 group`}>
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="shrink-0 mt-1 text-selection-none">
            {msg.role === 'user' ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#5436DA] to-[#8E55EA] flex items-center justify-center text-[10px] sm:text-xs font-bold text-white select-none">U</div>
            ) : (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#19C37D] flex items-center justify-center text-white shadow-sm select-none">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 select-text">
            <div className="font-bold text-sm mb-1 text-[#ececec] select-none">
              {msg.role === 'user' ? 'You' : 'AI Assistant'}
            </div>
            
            {msg.imageUrl && (
              <div className="mb-4 rounded-xl overflow-hidden border border-white/10 max-w-full sm:max-w-md shadow-lg group/img relative">
                <img src={msg.imageUrl} alt="Uploaded" className="w-full h-auto max-h-[300px] sm:max-h-[500px] object-cover rounded-lg" />
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 select-none">
                {searchResults.slice(0, 2).map((result: any, rIdx: number) => (
                  <a key={rIdx} href={result.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 bg-[#2f2f2f] border border-white/5 rounded-full text-[10px] text-[#b4b4b4] hover:bg-[#3e3e3e] transition-all">
                    <Globe className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{result.title || "Reference"}</span>
                  </a>
                ))}
              </div>
            )}

            {(msg.reasoning || thinkContent) && (
              <div className="mb-4 bg-[#2f2f2f] border border-white/5 rounded-xl overflow-hidden select-none">
                <button onClick={() => toggleReasoning(index)} className="w-full flex items-center gap-2 px-4 py-2.5 text-[#b4b4b4] hover:text-[#ececec] transition-all text-xs font-medium uppercase tracking-wider">
                  <BrainCircuit className="w-4 h-4" />
                  {openReasoning[index] ? 'Hide reasoning' : 'Show reasoning'}
                </button>
                {openReasoning[index] && (
                  <div className="px-4 pb-4 text-sm text-[#b4b4b4] leading-relaxed italic border-t border-white/5 pt-3 break-words select-text">
                    {msg.reasoning || thinkContent}
                  </div>
                )}
              </div>
            )}

            <div className="text-[15px] leading-relaxed text-[#ececec] break-words prose prose-invert prose-p:my-0 prose-pre:my-2 prose-sm max-w-none">
              {msg.role === 'model' ? (
                <ReactMarkdown components={MarkdownComponents}>{cleanedText}</ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{cleanedText}</p>
              )}
            </div>

            {fileActions.map((file, i) => (
              <CollapsibleCodeBlock key={`file-${i}`} language={file.path.split('.').pop() || 'text'} filename={file.path} code={file.content} />
            ))}

            {msg.role === 'model' && (cleanedText || fileActions.length > 0) && (
              <div className="flex items-center gap-1 mt-4 select-none">
                <button onClick={() => handleCopy(text, index)} className="p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors text-[#b4b4b4] hover:text-[#ececec] outline-none" data-tooltip="Copy">
                  {copiedIndex === index ? <Check className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}
                </button>
                {isLastModelMessage && onRegenerate && (
                  <button onClick={onRegenerate} className="p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors text-[#b4b4b4] hover:text-[#ececec] outline-none" data-tooltip="Regenerate">
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}
                {isLastModelMessage && onModelSwitch && (
                  <div className="relative">
                    <button onClick={() => setActiveModelMenu(activeModelMenu === index ? null : index)} className={`p-2 rounded-lg transition-all flex items-center gap-1.5 ${activeModelMenu === index ? 'bg-[#2f2f2f] text-[#ececec]' : 'text-[#b4b4b4] hover:bg-[#2f2f2f] hover:text-[#ececec]'}`} data-tooltip="Switch model">
                      <Sparkles className="w-4 h-4 text-blue-400" /><ChevronDown className={`w-3 h-3 transition-transform ${activeModelMenu === index ? 'rotate-180' : ''}`} />
                    </button>
                    {activeModelMenu === index && (
                      <>
                        <div className="fixed inset-0 z-40 bg-black/20 md:bg-transparent" onClick={() => setActiveModelMenu(null)}></div>
                        <div className="absolute bottom-full left-0 mb-2 w-max min-w-[140px] bg-[#2f2f2f] border border-[#424242] rounded-xl shadow-2xl z-50 p-1 animate-in fade-in slide-in-from-bottom-2">
                          {models.filter(m => m.id !== currentModelId).map(m => (
                            <button key={m.id} onClick={() => { onModelSwitch?.(m.id); setActiveModelMenu(null); }} className="w-full text-left px-3 py-2.5 text-[13px] hover:bg-[#3e3e3e] rounded-lg transition-colors text-[#ececec] flex items-center gap-3 whitespace-nowrap group/btn">
                              <div className="text-[#b4b4b4] group-hover/btn:text-blue-400 transition-colors shrink-0">{m.icon}</div>
                              <span className="font-medium pr-2 whitespace-nowrap">{m.name}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button onClick={() => handleShare(text)} className="p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors text-[#b4b4b4] hover:text-[#ececec] outline-none" data-tooltip="Share"><Share2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full relative">
      <div ref={chatContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-4 px-4">
            <h1 className="text-2xl md:text-4xl font-bold text-white text-center select-none">How can I help you today?</h1>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {messages.map((msg, index) => (
              <div key={index} className={msg.role === 'user' ? 'bg-transparent' : 'bg-[#212121]/30'}>
                {renderMessageContent(msg, index)}
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} className="h-48 md:h-56" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-10 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pointer-events-none">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative pointer-events-auto select-none">
          {attachedFile && (
            <div className="absolute bottom-full left-0 mb-4 p-2 bg-[#2f2f2f] border border-white/10 rounded-xl flex items-center gap-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              <ImageIcon className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-[#ececec] truncate max-w-[150px]">{attachedFile.name}</span>
              <button type="button" onClick={() => setAttachedFile(null)} className="p-1 hover:bg-[#3e3e3e] rounded-lg text-[#b4b4b4] hover:text-white transition-colors"><X className="w-3 h-3" /></button>
            </div>
          )}
          
          <div className="relative flex items-end gap-2 bg-[#2f2f2f] border border-white/10 rounded-[26px] p-2 pr-3 shadow-xl focus-within:border-white/20 transition-all">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            
            <div className="flex items-center gap-0.5 shrink-0 pl-1">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-[#b4b4b4] hover:text-white transition-colors" data-tooltip="Attach image"><Paperclip className="w-5 h-5" /></button>
            </div>
            
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); } }}
              placeholder="Message AI Assistant..." 
              className="flex-1 bg-transparent border-none focus:outline-none text-[#ececec] placeholder-[#b4b4b4] text-[15px] py-2 px-1 max-h-40 resize-none min-h-[40px] select-text" 
              rows={1}
              disabled={isLoading}
            />
            
            <button type="submit" disabled={(!input.trim() && !attachedFile) || isLoading} className="p-2 bg-white text-black rounded-full hover:bg-[#d7d7d7] disabled:bg-[#424242] disabled:text-[#212121] transition-all shrink-0 shadow-sm">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-[#b4b4b4] text-center opacity-50">AI may produce inaccurate information.</p>
        </form>
      </div>
    </div>
  );
}
