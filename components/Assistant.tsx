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
    { role: 'model', text: 'Assalomu alaykum! Men GDPI yotoqxonasi virtual yordamchisiman. Yotoqxonalar, bo\'sh joylar yoki joylashish tartibi haqida so\'rashingiz mumkin.' }
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
      // Calculate real-time stats for the prompt context
      let totalStudents = 0;
      let totalCapacity = 0;
      let totalEmptyRooms = 0;
      
      dorms.forEach(d => {
        totalCapacity += d.totalRooms * 4;
        d.rooms.forEach(r => {
            totalStudents += r.students.length;
            if(r.students.length === 0) totalEmptyRooms++;
        });
      });
      const freeSpots = totalCapacity - totalStudents;

      const systemPrompt = `
        Sen Guliston davlat pedagogika instituti (GDPI) yotoqxonasining aqlli yordamchisisan.
        
        Joriy statistika (Real vaqt rejimida):
        - Jami yotoqxona: 2 ta (1-TTJ va 2-TTJ).
        - Har birida: 100 ta xona.
        - Xona sig'imi: 4 kishi.
        - Umumiy sig'im: ${totalCapacity} talaba.
        - Hozirgi talabalar soni: ${totalStudents}.
        - Bo'sh o'rinlar: ${freeSpots}.
        - Bo'm-bo'sh xonalar soni: ${totalEmptyRooms}.
        
        Vazifang:
        - Foydalanuvchi savollariga faqat o'zbek tilida, do'stona va professional javob berish.
        - Agar joylashish uchun hujjatlar haqida so'rasa: "Dekanatga ariza, pasport nusxasi va 2 ta rasm topshirish kerak" deb ayt.
        - Agar to'lov haqida so'rasa: "To'lov kontrakt bo'limi orqali amalga oshiriladi" deb javob ber.
        - Statistikani so'rasa, yuqoridagi raqamlardan foydalan.
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
            systemInstruction: systemPrompt,
        }
      });

      const text = response.text || "Uzr, ma'lumot olishda xatolik yuz berdi.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error: any) {
      console.error("AI Error:", error);
      let errorResponse = "Kechirasiz, tizimda vaqtinchalik nosozlik. Internet aloqasini tekshiring.";
      
      // Check specifically for Quota Exceeded or Rate Limit in various error properties
      if (
        error?.status === 429 || 
        error?.response?.status === 429 ||
        error?.error?.code === 429 ||
        error?.message?.includes('429') || 
        error?.message?.includes('quota') ||
        error?.message?.includes('RESOURCE_EXHAUSTED')
      ) {
          errorResponse = "⚠️ **Limit Tugadi (Quota Exceeded).**\n\nHozirda foydalanuvchilar ko'pligi sababli Google Gemini serveri band. Iltimos, 1-2 daqiqadan so'ng qayta yozing.";
      }

      setMessages(prev => [...prev, { role: 'model', text: errorResponse }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mt-4">
      <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
        <div className="flex items-center">
            <Bot className="mr-3" />
            <div>
                <h2 className="font-semibold text-lg">Virtual Yordamchi</h2>
                <p className="text-xs text-blue-100 opacity-80">Gemini 2.5 Flash tomonidan quvvatlanadi</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3.5 rounded-2xl flex items-start gap-3 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
            }`}>
              <div className={`mt-0.5 p-1 rounded-full ${msg.role === 'user' ? 'bg-blue-500' : 'bg-gray-100'}`}>
                {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-blue-600" />}
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm flex items-center gap-2">
              <Loader2 className="animate-spin text-blue-600" size={18} />
              <span className="text-sm text-gray-400 font-medium">Javob yozilmoqda...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-3 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Savolingizni bu yerga yozing..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700 placeholder-gray-400"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-95"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
            AI xato qilishi mumkin, muhim ma'lumotlarni tekshiring.
        </p>
      </div>
    </div>
  );
};

export default Assistant;