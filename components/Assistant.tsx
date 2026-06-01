
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Send, Bot, Loader2, User } from 'lucide-react';
import { Dormitory } from '../types';

interface AssistantProps {
  dorms: Dormitory[];
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

const Assistant: React.FC<AssistantProps> = ({ dorms }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Assalomu alaykum! Men Guliston davlat pedagogika instituti yotoqxona tizimining virtual yordamchisiman. Jami 7,234 nafar talaba bazasi va 2 ta TTJ haqida savollaringizga javob bera olaman.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      let totalOccupied = 0;
      let totalCapacity = 200 * 4; // 2 dorms * 100 rooms * 4 capacity
      
      dorms.forEach(d => {
        d.rooms.forEach(r => {
            totalOccupied += r.students.length;
        });
      });
      const freeSpots = totalCapacity - totalOccupied;

      const systemPrompt = `
        Sen Guliston davlat pedagogika instituti (GDPI) yotoqxona tizimi yordamchisisan.
        
        Platforma Haqida:
        - Jami talabalar bazasi: 7,234 nafar.
        - Yotoqxonalar: 2 ta (TTJ-1 va TTJ-2).
        - Har bir TTJda: 100 ta xona bor.
        - Jami xonalar: 200 ta.
        - Xona sig'imi: 4 kishi.
        - Umumiy joylar soni: ${totalCapacity}.
        - Hozirda band joylar: ${totalOccupied}.
        - Bo'sh joylar: ${freeSpots}.
        
        Sening vazifang:
        - Talabalarga yotoqxonaga joylashish (Ariza, Pasport nusxasi, 2ta rasm) bo'yicha ma'lumot berish.
        - Savollarga professional, o'zbek tilida va do'stona javob qaytarish.
        - Statistikani so'rashsa, yuqoridagi real vaqt raqamlaridan foydalan.
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        config: { systemInstruction: systemPrompt }
      });

      const text = response.text || "Kechirasiz, ma'lumot olishda xatolik yuz berdi.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorResponse = "Tizimda nosozlik. Iltimos, birozdan so'ng qayta urinib ko'ring.";
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
          errorResponse = "⚠️ Limit tugadi. Iltimos, 1 daqiqadan so'ng qayta yozing.";
      }
      setMessages(prev => [...prev, { role: 'model', text: errorResponse }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden mt-4">
      <div className="bg-blue-600 p-5 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <Bot size={24} />
            </div>
            <div>
                <h2 className="font-black text-lg tracking-tight uppercase">GDPI AI Assistant</h2>
                <p className="text-[10px] font-bold text-blue-100 opacity-80 uppercase tracking-widest">Powered by Gemini 2.5</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
            }`}>
              <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center gap-3">
              <Loader2 className="animate-spin text-blue-600" size={18} />
              <span className="text-xs text-slate-400 font-black uppercase tracking-widest">Javob yozilmoqda...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-5 bg-white border-t border-slate-100">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Yotoqxona haqida savolingiz..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg active:scale-95"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Assistant;
