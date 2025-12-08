import React, { useState } from 'react';
import { Dormitory } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import StatCard from './StatCard';
import { Users, Home, BedDouble, AlertCircle, Download, Search, MapPin, Filter, Loader2, Sparkles, X, Bot, FileText, AlertTriangle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface DashboardProps {
  dorms: Dormitory[];
}

const Dashboard: React.FC<DashboardProps> = ({ dorms }) => {
  const [activeTab, setActiveTab] = useState<'all' | number>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');
  const [isError, setIsError] = useState(false);

  // Filter dorms based on selection
  const targetDorms = activeTab === 'all' 
    ? dorms 
    : dorms.filter(d => d.id === activeTab);

  // Aggregate data based on filtered dorms
  let totalCapacity = 0;
  let totalStudents = 0;
  let emptyRooms = 0;
  let fullRooms = 0;

  const courseStats: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const facultyStats: Record<string, number> = {};

  targetDorms.forEach(dorm => {
    totalCapacity += dorm.totalRooms * 4;
    dorm.rooms.forEach(room => {
      totalStudents += room.students.length;
      if (room.students.length === 0) emptyRooms++;
      if (room.students.length === 4) fullRooms++;

      room.students.forEach(student => {
        // Course Stats
        if (student.course >= 1 && student.course <= 4) {
             courseStats[student.course]++;
        }

        // Faculty Stats
        const facultyName = student.faculty;
        if (facultyStats[facultyName]) {
            facultyStats[facultyName]++;
        } else {
            facultyStats[facultyName] = 1;
        }
      });
    });
  });

  // Search Logic
  const searchResults = searchTerm.length > 1 ? dorms.flatMap(dorm => 
    dorm.rooms.flatMap(room => 
        room.students
            .filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(s => ({
                student: s,
                roomNumber: room.number,
                dormName: dorm.name,
                dormId: dorm.id
            }))
    )
  ) : [];

  const availableSpots = totalCapacity - totalStudents;

  const occupancyData = [
    { name: 'Band joylar', value: totalStudents },
    { name: "Bo'sh joylar", value: availableSpots },
  ];

  const courseData = [
      { name: '1-kurs', talabalar: courseStats[1] },
      { name: '2-kurs', talabalar: courseStats[2] },
      { name: '3-kurs', talabalar: courseStats[3] },
      { name: '4-kurs', talabalar: courseStats[4] },
  ];

  const facultyData = Object.keys(facultyStats).map(key => ({
      name: key,
      talabalar: facultyStats[key]
  }));

  const COLORS = ['#3b82f6', '#10b981'];
  const COURSE_COLORS = ['#60a5fa', '#34d399', '#f472b6', '#a78bfa'];

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      // @ts-ignore
      const ExcelJS = (window as any).ExcelJS;
      if (!ExcelJS) {
          alert("Excel kutubxonasi hali yuklanmadi. Iltimos, sahifani yangilab qayta urinib ko'ring.");
          setIsExporting(false);
          return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Talabalar Ro'yxati");

      // Setup Columns
      worksheet.columns = [
        { header: 'Rasm', key: 'image', width: 10 },
        { header: 'TTJ', key: 'dorm', width: 25 },
        { header: 'Xona', key: 'room', width: 10 },
        { header: 'F.I.SH', key: 'name', width: 35 },
        { header: 'Kurs', key: 'course', width: 10 },
        { header: 'Guruh', key: 'group', width: 15 },
        { header: 'Fakultet', key: 'faculty', width: 30 },
        { header: "Yo'nalish", key: 'direction', width: 30 },
        { header: "Qo'shilgan sana", key: 'date', width: 15 },
      ];

      // Header Style
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF475569' } // Slate-600
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 30;

      let currentRowIndex = 2;

      for (const dorm of targetDorms) {
        for (const room of dorm.rooms) {
          for (const student of room.students) {
            const row = worksheet.getRow(currentRowIndex);
            row.height = 60; // Enough height for 50px image + padding

            // Data
            row.getCell('dorm').value = dorm.name;
            row.getCell('room').value = room.number;
            row.getCell('name').value = student.fullName;
            row.getCell('course').value = student.course;
            row.getCell('group').value = student.group;
            row.getCell('faculty').value = student.faculty;
            row.getCell('direction').value = student.direction;
            row.getCell('date').value = student.joinedDate;

            // Alignment and Borders
            row.eachCell((cell) => {
               cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
               cell.border = {
                 top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                 left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                 bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
                 right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
               };
            });
            // Center specific columns
            row.getCell('room').alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell('course').alignment = { vertical: 'middle', horizontal: 'center' };
            row.getCell('group').alignment = { vertical: 'middle', horizontal: 'center' };

            // Image Processing
            if (student.imageUrl) {
                try {
                    let base64Data = '';
                    let extension = 'png';

                    if (student.imageUrl.startsWith('data:image')) {
                        base64Data = student.imageUrl.split(',')[1];
                        if (student.imageUrl.includes('jpeg') || student.imageUrl.includes('jpg')) extension = 'jpeg';
                    } else {
                        // Fetch remote image
                        try {
                            const response = await fetch(student.imageUrl);
                            const blob = await response.blob();
                            const reader = new FileReader();
                            base64Data = await new Promise<string>((resolve) => {
                                reader.onloadend = () => {
                                    const res = reader.result as string;
                                    resolve(res.split(',')[1]);
                                };
                                reader.readAsDataURL(blob);
                            });
                            if (student.imageUrl.toLowerCase().includes('.jpg') || student.imageUrl.toLowerCase().includes('.jpeg')) extension = 'jpeg';
                        } catch (err) {
                            console.warn("Rasm yuklab olinmadi:", student.imageUrl);
                        }
                    }

                    if (base64Data) {
                        const imageId = workbook.addImage({
                            base64: base64Data,
                            extension: extension as 'png' | 'jpeg',
                        });

                        worksheet.addImage(imageId, {
                            tl: { col: 0.15, row: currentRowIndex - 1 + 0.1 }, // Slightly centered
                            ext: { width: 50, height: 50 },
                            editAs: 'oneCell'
                        });
                    }
                } catch (err) {
                    console.error("Error adding image to excel", err);
                }
            }

            currentRowIndex++;
          }
        }
      }

      // Generate Buffer and Download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Yotoqxona_Baza_${new Date().toISOString().slice(0,10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
        console.error("Excel generation failed:", error);
        alert("Excel fayl yaratishda xatolik yuz berdi. Konsolni tekshiring.");
    } finally {
        setIsExporting(false);
    }
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setIsError(false);
    setAnalysisResult('');
    
    try {
      const stats = {
        scope: activeTab === 'all' ? 'Umumiy (Barcha Yotoqxonalar)' : targetDorms[0].name,
        totalCapacity: totalCapacity,
        occupied: totalStudents,
        vacant: availableSpots,
        occupancyRate: Math.round((totalStudents / totalCapacity) * 100) + '%',
        rooms: {
            total: targetDorms.reduce((acc, d) => acc + d.totalRooms, 0),
            empty: emptyRooms,
            full: fullRooms,
            partial: targetDorms.reduce((acc, d) => acc + d.totalRooms, 0) - emptyRooms - fullRooms
        },
        demographics: {
            byCourse: courseStats,
            byFaculty: facultyStats
        }
      };

      const prompt = `
        Sen universitet yotoqxonalari bo'yicha professional ma'lumotlar tahlilchisisan. 
        Quyidagi statistik ma'lumotlarni tahlil qilib, Guliston davlat pedagogika instituti rahbariyati uchun qisqa, londa va foydali hisobot tayyorlab ber.

        MA'LUMOTLAR:
        ${JSON.stringify(stats, null, 2)}

        TALABLAR:
        1. Hisobot O'zbek tilida bo'lsin.
        2. Formatlash uchun faqat oddiy matn va kerak bo'lsa sarlavhalardan foydalan.
        3. Quyidagi tuzilmani saqla:
           - 📊 Umumiy Holat: Bandlik darajasi va qisqacha xulosa.
           - 🎓 Talabalar Tarkibi: Kurslar va fakultetlar bo'yicha asosiy tendensiyalar (qaysi kurs/fakultet ustunlik qilmoqda).
           - ⚠️ E'tibor Talab Jihatlar: Masalan, bo'sh o'rinlar juda ko'pmi yoki ma'lum bir fakultet talabalari juda zich joylashganmi?
           - 💡 Takliflar: Samaradorlikni oshirish uchun 2-3 ta aniq taklif.

        Javobing do'stona, ammo rasmiy uslubda bo'lsin.
      `;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      setAnalysisResult(response.text || "Tahlil natijasi bo'sh bo'ldi.");
      setShowAnalysisModal(true);
    } catch (error: any) {
        console.error("AI Analysis failed", error);
        setIsError(true);
        
        let errorMessage = "Tahlil jarayonida xatolik yuz berdi. Qayta urinib ko'ring.";
        
        // Handle Rate Limit / Quota Exceeded errors specifically
        const isQuotaExceeded = 
            error?.status === 429 || 
            error?.response?.status === 429 ||
            error?.error?.code === 429 ||
            error?.message?.includes('429') || 
            error?.message?.includes('quota') || 
            error?.message?.includes('RESOURCE_EXHAUSTED');

        if (isQuotaExceeded) {
            errorMessage = "⚠️ AI xizmatidan foydalanish limiti vaqtinchalik tugadi (Quota Exceeded). \n\nIltimos, 1-2 daqiqadan so'ng qayta urinib ko'ring. Bepul versiyada so'rovlar soni cheklangan.";
        } else if (error?.message?.includes('API key')) {
            errorMessage = "⚠️ API kaliti bilan muammo yuzaga keldi. Sozlamalarni tekshiring.";
        }
        
        setAnalysisResult(errorMessage);
        setShowAnalysisModal(true);
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       {/* Hero Section with Image */}
       <div className="relative w-full h-72 rounded-3xl overflow-hidden shadow-xl group">
        <img 
          src="https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=2560&auto=format&fit=crop" 
          alt="GDPI Binosi" 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent flex flex-col justify-end p-8 sm:p-12">
          <div className="relative z-10 translate-y-0 transition-transform duration-500">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-md">
              Guliston Davlat Pedagogika Instituti
            </h1>
            <p className="text-blue-50 text-lg font-medium flex items-center gap-3 backdrop-blur-sm bg-white/10 w-fit px-4 py-2 rounded-xl border border-white/20">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Yotoqxonalar Monitoring Platformasi
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
            <h2 className="text-2xl font-bold text-slate-800">
                {activeTab === 'all' ? 'Umumiy Statistika' : targetDorms[0]?.name + ' Statistikasi'}
            </h2>
            <p className="text-slate-500 mt-1">Yotoqxona faoliyati bo'yicha asosiy ko'rsatkichlar</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-white p-1.5 rounded-xl border border-slate-200 inline-flex shadow-sm">
                <button
                    onClick={() => setActiveTab('all')}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        activeTab === 'all' 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                    Umumiy
                </button>
                {dorms.map(dorm => (
                    <button
                        key={dorm.id}
                        onClick={() => setActiveTab(dorm.id)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                            activeTab === dorm.id 
                            ? 'bg-slate-900 text-white shadow-md' 
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        {dorm.name.replace('Talabalar turar joyi', 'TTJ')}
                    </button>
                ))}
            </div>

            <button
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className={`flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl transition-all shadow-md font-semibold ${
                    isAnalyzing 
                    ? 'bg-violet-100 text-violet-400 cursor-not-allowed' 
                    : 'bg-violet-600 hover:bg-violet-700 text-white shadow-violet-200 active:scale-95'
                }`}
            >
                {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                <span>{isAnalyzing ? 'Tahlil qilinmoqda...' : 'AI Tahlil'}</span>
            </button>

            <button
                onClick={handleDownloadExcel}
                disabled={isExporting}
                className={`flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl transition-all shadow-md font-semibold ${
                    isExporting 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 active:scale-95'
                }`}
            >
                {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                <span>{isExporting ? 'Yuklanmoqda...' : 'Excel Yuklash'}</span>
            </button>
        </div>
      </div>
      
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
            title="Jami Talabalar" 
            value={totalStudents} 
            icon={<Users />} 
            color="bg-gradient-to-br from-blue-500 to-blue-600" 
        />
        <StatCard 
            title="Bo'sh O'rinlar" 
            value={availableSpots} 
            icon={<BedDouble />} 
            color="bg-gradient-to-br from-emerald-500 to-emerald-600" 
        />
        <StatCard 
            title="Bo'sh Xonalar" 
            value={emptyRooms} 
            icon={<Home />} 
            color="bg-gradient-to-br from-violet-500 to-violet-600" 
        />
        <StatCard 
            title="To'la Xonalar" 
            value={fullRooms} 
            icon={<AlertCircle />} 
            color="bg-gradient-to-br from-rose-500 to-rose-600" 
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Occupancy Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-96 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                Bandlik darajasi
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={occupancyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {occupancyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="drop-shadow-sm" />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>

        {/* Course Chart */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-96 hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-violet-500 rounded-full"></span>
                Kurslar kesimida
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={courseData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <Tooltip 
                        cursor={{fill: '#f1f5f9', radius: 4}}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="talabalar" radius={[6, 6, 0, 0]} barSize={40}>
                        {courseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COURSE_COLORS[index % COURSE_COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 - Faculties */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-[450px] hover:shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                Fakultetlar kesimida
            </h3>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={facultyData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 80 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b'}} interval={0} angle={-20} textAnchor="end" height={80} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                    <Tooltip 
                        cursor={{fill: '#f1f5f9', radius: 4}} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="talabalar" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={50} className="drop-shadow-sm" />
                </BarChart>
            </ResponsiveContainer>
      </div>

      {/* SEARCH SECTION - BOTTOM */}
      <div className="bg-white rounded-2xl shadow-lg shadow-slate-200 border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-800">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Search size={24} /> 
                </div>
                Talaba Qidirish
            </h3>
            
            <div className="relative max-w-2xl">
                <input 
                    type="text" 
                    placeholder="Talaba ism-familiyasini kiriting..." 
                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all text-lg shadow-sm placeholder-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400" size={24} />
            </div>
        </div>

        {searchTerm.length > 1 && (
            <div className="p-8 bg-slate-50/50">
                {searchResults.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="text-slate-400" size={32} />
                        </div>
                        <h4 className="text-lg font-medium text-slate-700">Hech qanday natija topilmadi</h4>
                        <p className="text-slate-500">Boshqa ism yozib ko'ring</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {searchResults.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100 transition-all group">
                                <div className="w-16 h-16 rounded-full bg-blue-50 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm group-hover:scale-105 transition-transform">
                                    <img src={item.student.imageUrl} alt={item.student.fullName} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{item.student.fullName}</h4>
                                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold mt-2">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100 flex items-center gap-1">
                                            <Home size={10} />
                                            {item.dormName.replace('Talabalar turar joyi', 'TTJ')}
                                        </span>
                                        <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md border border-indigo-100 flex items-center gap-1">
                                            <MapPin size={10} />
                                            Xona №{item.roomNumber}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2 font-medium">
                                        {item.student.course}-kurs • {item.student.group}-guruh
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>

      {/* AI Analysis Modal */}
      {showAnalysisModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className={`bg-white rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col max-h-[85vh] overflow-hidden border ${isError ? 'border-red-200' : 'border-slate-200'}`}>
                <div className={`p-6 flex justify-between items-center text-white ${isError ? 'bg-red-500' : 'bg-gradient-to-r from-violet-600 to-indigo-600'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            {isError ? <AlertTriangle className="text-white" size={24} /> : <Bot className="text-white" size={24} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">{isError ? 'Xatolik' : 'AI Tahlil Hisoboti'}</h3>
                            <p className="text-violet-100 text-sm opacity-90">{isError ? 'Tizimda nosozlik yuz berdi' : 'GDPI Yotoqxonalari bo\'yicha sun\'iy intelekt xulosasi'}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowAnalysisModal(false)}
                        className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>
                
                <div className="p-8 overflow-y-auto custom-scrollbar bg-slate-50">
                    <div className={`bg-white p-6 rounded-xl border shadow-sm ${isError ? 'border-red-100 bg-red-50' : 'border-slate-100'}`}>
                        <div className={`whitespace-pre-wrap leading-relaxed font-medium ${isError ? 'text-red-700' : 'text-slate-700'}`}>
                            {analysisResult}
                        </div>
                    </div>
                    
                    {!isError && (
                        <div className="mt-6 flex gap-4 text-xs text-slate-400 justify-center">
                            <div className="flex items-center gap-1">
                                <Sparkles size={12} /> Gemini 2.5 tomonidan yaratildi
                            </div>
                            <div className="flex items-center gap-1">
                                <FileText size={12} /> {new Date().toLocaleDateString()}
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
                    <button 
                        onClick={() => setShowAnalysisModal(false)}
                        className="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 font-semibold transition-all shadow-md"
                    >
                        Yopish
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;