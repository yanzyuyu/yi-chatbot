import React, { useState } from 'react';
import { Copy, Check, Download, Eye, Code } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CollapsibleCodeBlockProps {
  language: string;
  filename?: string;
  code: string;
}

export function CollapsibleCodeBlock({ language, filename, code }: CollapsibleCodeBlockProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadFile = () => {
    const extension = language === 'javascript' ? 'js' : language === 'typescript' ? 'ts' : language || 'txt';
    const name = filename || `code-${Date.now()}.${extension}`;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isPreviewable = ['html', 'svg', 'xml'].includes((language || '').toLowerCase());

  return (
    <div className="my-4 w-full overflow-hidden rounded-md bg-[#1e1e1e] border border-[#3c3c3c] shadow-lg font-mono">
      {/* VS Code Style Header/Tab */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] text-[#cccccc] border-b border-[#1e1e1e]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2 opacity-50">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></div>
          </div>
          <span className="text-[11px] font-sans text-[#969696] tracking-wide uppercase">
            {filename || language || 'untitled'}
          </span>
        </div>
        
        <div className="flex items-center gap-4 opacity-80 hover:opacity-100 transition-opacity">
          {isPreviewable && (
            <button 
              onClick={() => setViewMode(viewMode === 'code' ? 'preview' : 'code')}
              className="flex items-center gap-1.5 text-[11px] hover:text-white transition-colors"
            >
              {viewMode === 'code' ? <Eye className="w-3.5 h-3.5" /> : <Code className="w-3.5 h-3.5" />}
              <span>{viewMode === 'code' ? 'Preview' : 'Editor'}</span>
            </button>
          )}

          <button 
            onClick={downloadFile}
            className="flex items-center gap-1.5 text-[11px] hover:text-white transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>

          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 text-[11px] hover:text-white transition-colors"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#4ec9b0]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* VS Code Editor Area */}
      <div className="relative w-full overflow-hidden">
        {viewMode === 'code' ? (
          <div className="max-w-full overflow-x-auto no-scrollbar bg-[#1e1e1e]">
            <SyntaxHighlighter
              language={(language || 'text').toLowerCase()}
              style={vscDarkPlus}
              showLineNumbers={window.innerWidth > 480}
              lineNumberStyle={{ 
                minWidth: '2.5em', 
                paddingRight: '1em', 
                color: '#858585', 
                textAlign: 'right', 
                fontSize: '11px', 
                userSelect: 'none',
                borderRight: '1px solid #3c3c3c',
                marginRight: '0.5em'
              }}
              customStyle={{
                margin: 0,
                padding: '0.75rem 0',
                fontSize: window.innerWidth < 640 ? '12px' : '13px',
                lineHeight: '1.5',
                backgroundColor: 'transparent',
                maxHeight: '600px',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        ) : (
          <div className="w-full bg-white overflow-auto">
            {language === 'svg' ? (
              <div className="p-8 flex items-center justify-center bg-stone-50 min-h-[300px]" dangerouslySetInnerHTML={{ __html: code }} />
            ) : (
              <iframe
                title="Preview"
                srcDoc={code}
                className="w-full min-h-[400px] h-full border-none bg-white"
                sandbox="allow-scripts"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
