import React, { useState } from 'react';
import { CSharpFile, GameSettings } from '../types';
import { Copy, Check, Download, FileCode, Search, Sparkles } from 'lucide-react';

interface CodeViewerProps {
  files: CSharpFile[];
  settings: GameSettings;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ files, settings }) => {
  const [activeFileId, setActiveFileId] = useState<string>(files[0].id);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];
  const generatedCode = activeFile.code(settings);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const lines = generatedCode.split('\n');

  return (
    <div className="flex flex-col h-full bg-[#1E1E1E] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      {/* File Tabs Navigation - IDE Style */}
      <div className="flex items-center justify-between border-b border-black/30 bg-[#252526] px-2 pt-1 overflow-x-auto gap-2">
        <div className="flex items-center overflow-x-auto scrollbar-none">
          {files.map((file) => {
            const isActive = activeFileId === file.id;
            return (
              <button
                key={file.id}
                onClick={() => setActiveFileId(file.id)}
                className={`px-4 py-2 text-xs font-mono flex items-center gap-2 whitespace-nowrap transition border-r border-black/20 ${
                  isActive
                    ? 'bg-[#1E1E1E] border-t-2 border-[#007ACC] text-white font-medium'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-[#569CD6]' : 'text-slate-500'}`} />
                <span>{file.filename}</span>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pr-2 pb-1 shrink-0">
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-[#2D2D2D] hover:bg-[#3E3E3E] text-slate-200 border border-white/10 rounded text-xs font-mono flex items-center gap-1.5 transition active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="px-2.5 py-1 bg-[#007ACC] hover:bg-[#0066B2] text-white font-mono rounded text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.cs</span>
          </button>
        </div>
      </div>

      {/* Description & Search Bar */}
      <div className="bg-[#252526]/60 border-b border-black/20 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-mono text-[11px]">
          <Sparkles className="w-3.5 h-3.5 text-[#569CD6] shrink-0" />
          <span>{activeFile.description}</span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#181818] border border-white/10 rounded pl-8 pr-3 py-1 text-xs text-slate-200 font-mono placeholder-slate-500 focus:outline-none focus:border-[#007ACC] w-40"
          />
        </div>
      </div>

      {/* Code Text Area with Sleek VS Code Syntax Highlighting */}
      <div className="flex-1 overflow-y-auto font-mono text-xs bg-[#1E1E1E] p-4 leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => {
              const isHighlighted = searchQuery.trim() !== '' && line.toLowerCase().includes(searchQuery.toLowerCase());
              const trimmed = line.trim();
              const isComment = trimmed.startsWith('//') || trimmed.startsWith('///');
              const isAttribute = trimmed.startsWith('[');
              const isKeyword = /^\s*(using|namespace|public|private|protected|class|enum|struct|interface|void|float|int|bool|string|override|virtual|static|return|new|if|else|switch|case|break)\b/.test(line);

              let textColorClass = 'text-[#D4D4D4]';
              if (isComment) textColorClass = 'text-[#6A9955] italic';
              else if (isAttribute) textColorClass = 'text-[#4EC9B0] font-semibold';
              else if (isKeyword) textColorClass = 'text-[#569CD6] font-medium';

              return (
                <tr key={idx} className={isHighlighted ? 'bg-[#264F78]' : 'hover:bg-white/[0.03]'}>
                  <td className="w-10 select-none pr-4 text-right text-slate-600 font-mono text-[11px] border-r border-white/5">
                    {idx + 1}
                  </td>
                  <td className="pl-4 whitespace-pre">
                    <span className={textColorClass}>{line}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* IDE Status Footer */}
      <div className="bg-[#007ACC] text-white px-3 py-1 flex items-center justify-between text-[11px] font-mono select-none">
        <div className="flex items-center gap-3">
          <span>URP: Active (60 FPS Target)</span>
          <span>•</span>
          <span>C# {activeFile.filename}</span>
        </div>
        <div className="flex items-center gap-3 opacity-90">
          <span>UTF-8</span>
          <span>Unity 2022.3 LTS</span>
        </div>
      </div>
    </div>
  );
};
