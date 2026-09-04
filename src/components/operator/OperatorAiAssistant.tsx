import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ShieldAlert, 
  CloudSun, 
  Users, 
  Building2, 
  Car, 
  RefreshCw,
  Copy,
  Check,
  Compass
} from 'lucide-react';
import { Trip } from '../../types/tourflow';
import { TourFlowApi } from '../../services/api';

interface OperatorAiAssistantProps {
  trips: Trip[];
  onSelectTrip: (tripId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actions?: string[];
}

export const OperatorAiAssistant: React.FC<OperatorAiAssistantProps> = ({ trips, onSelectTrip }) => {
  const [inputQuery, setInputQuery] = useState('');
  const [selectedContextTrip, setSelectedContextTrip] = useState<string>('1024');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-0',
      sender: 'assistant',
      text: `Hello Rajesh. I am the TourFlow AI Operations Assistant. I have live direct access to your canonical PostgreSQL database, real-time weather sensors, hotel allotments, and active chauffeur telemetry.

How can I assist your dispatch & operations team today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actions: [
        'Analyze Solang Valley wind shear for Tour #1024',
        'Check Himachal Pradesh highway status',
        'Review available hotel allotments in Manali',
        'Draft guest notification for itinerary change',
      ],
    },
  ]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await TourFlowApi.operatorAiAssistant(query, selectedContextTrip);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.reply || 'Operations response generated.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: res.suggested_actions || [],
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errReply: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'assistant',
        text: 'Unable to reach Gemini Operations service. Fallback operations telemetry remains synchronized with PostgreSQL.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>AI Operations Assistant</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
<<<<<<< HEAD
              GEMINI 3.7 FLASH OPS
=======
              GEMINI 2.5 FLASH PRO OPS
>>>>>>> 51230599472f7acad5e2b2cc983f64ca1a59cd08
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Command-line AI operator for automated disruption analysis, vendor SLA checks, route viability, and passenger advisories.
          </p>
        </div>

        {/* Context Selector */}
        <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 text-xs">
          <span className="text-slate-500 px-2 font-medium">Context Tour:</span>
          <select
            value={selectedContextTrip}
            onChange={(e) => setSelectedContextTrip(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-emerald-500"
          >
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} - {t.title.slice(0, 28)}...
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[640px] overflow-hidden shadow-xl">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isAi = msg.sender === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${isAi ? 'justify-start' : 'justify-end'}`}
              >
                {isAi && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-emerald-950/40">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`space-y-2 max-w-2xl ${isAi ? 'items-start' : 'items-end'}`}>
                  <div
                    className={`rounded-2xl p-4 text-xs leading-relaxed ${
                      isAi
                        ? 'bg-slate-950 border border-slate-800 text-slate-200'
                        : 'bg-emerald-600 text-white font-medium shadow-md'
                    }`}
                  >
                    <div className="whitespace-pre-line">{msg.text}</div>

                    {isAi && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                        <span>AI Operations Intel • {msg.timestamp}</span>
                        <button
                          onClick={() => handleCopy(msg.id, msg.text)}
                          className="hover:text-slate-300 flex items-center space-x-1"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Response</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Suggestion action pills from AI */}
                  {isAi && msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.actions.map((act, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(act)}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-emerald-400 border border-slate-800 transition-colors flex items-center space-x-1"
                        >
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>{act}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!isAi && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-slate-400 flex items-center space-x-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Consulting Gemini operations intelligence and PostgreSQL live state...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              id="input-operator-ai-query"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask operations question (e.g., 'Suggest backup for Solang paragliding', 'Check road blockages in Kullu')..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              id="btn-send-operator-ai"
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow flex items-center space-x-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask Ops AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
