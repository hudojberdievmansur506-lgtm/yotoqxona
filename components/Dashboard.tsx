import React, { useState } from 'react';
import { Dormitory } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import StatCard from './StatCard';
import { Users, Home, BedDouble, AlertCircle, Search, FileSpreadsheet, Download } from 'lucide-react';

interface DashboardProps {
  dorms: Dormitory[];
  isAdmin?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ dorms, isAdmin }) => {
  const [activeTab, setActiveTab] = useState<'all' | number>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const targetDorms = activeTab === 'all' 
    ? dorms 
    : dorms.filter(d => d.id === activeTab);

  let totalCapacity = 0;
  let totalStudents = 0;
  let emptyRooms = 0;
  let fullRooms = 0;

  const courseStats: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };

  targetDorms.forEach(dorm => {
    totalCapacity += dorm.totalRooms * 4;
    dorm.rooms.forEach(room => {
      totalStudents += room.students.length;
      if (room.students.length === 0) emptyRooms++;
      if (room.students.length === 4) fullRooms++;

      room.students.forEach(student => {
        if (student.course >= 1 && student.course <= 4) {
             courseStats[student.course]++;
        }
      });
    });
  });

  const exportToExcel = async () => {
    // @ts-ignore
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Talabalar Ro\'yxati');

    worksheet.columns = [
      { header: 'F.I.SH', key: 'name', width: 30 },
      { header: 'Bino', key: 'dorm', width: 15 },
      { header: 'Xona', key: 'room', width: 10 },
      { header: 'Kurs', key: 'course', width: 10 },
      { header: 'Guruh', key: 'group', width: 15 },
      { header: 'Fakultet', key: 'faculty', width: 30 },
      { header: 'Yo\'nalish', key: 'direction', width: 30 },
      { header: 'Kirgan sana', key: 'date', width: 20 },
    ];

    dorms.forEach(dorm => {
      dorm.rooms.forEach(room => {
        room.students.forEach(s => {
          worksheet.addRow({
            name: s.fullName,
            dorm: dorm.name,
            room: room.number,
            course: s.course,
            group: s.group,
            faculty: s.faculty,
            direction: s.direction,
            date: s.joinedDate
          });
        });
      });
    });

    // Formatting header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `GDPI_Talabalar_Royxati_${new Date().toLocaleDateString()}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

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

  const COLORS = ['#3b82f6', '#10b981'];
  const COURSE_COLORS = ['#60a5fa', '#34d399', '#f472b6', '#a78bfa'];

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="relative w-full h-64 rounded-3xl overflow-hidden shadow-xl">
        <img 
          src="https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=2560&auto=format&fit=crop" 
          alt="GDPI Binosi" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex flex-col justify-end p-8">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                  Guliston Davlat Pedagogika Instituti
                </h1>
                <p className="text-blue-50 text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                  Yotoqxonalar Monitoring Platformasi
                </p>
              </div>
              {isAdmin && (
                <button 
                  onClick={exportToExcel}
                  className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-white hover:text-slate-900 transition-all active:scale-95"
                >
                  <FileSpreadsheet size={18}/> Excelga yuklash
                </button>
              )}
            </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">
            {activeTab === 'all' ? 'Umumiy Statistika' : targetDorms[0]?.name + ' Statistikasi'}
        </h2>
        
        <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex">
            <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
                Umumiy
            </button>
            {dorms.map(dorm => (
                <button
                    key={dorm.id}
                    onClick={() => setActiveTab(dorm.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        activeTab === dorm.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    {dorm.name.replace('Talabalar turar joyi', 'TTJ')}
                </button>
            ))}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Jami Talabalar" value={totalStudents} icon={<Users />} color="bg-blue-600" />
        <StatCard title="Bo'sh O'rinlar" value={availableSpots} icon={<BedDouble />} color="bg-emerald-600" />
        <StatCard title="Bo'sh Xonalar" value={emptyRooms} icon={<Home />} color="bg-violet-600" />
        <StatCard title="To'la Xonalar" value={fullRooms} icon={<AlertCircle />} color="bg-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-80">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Bandlik darajasi</h3>
            <div className="h-52 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={occupancyData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {occupancyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 h-80">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Kurslar kesimida</h3>
            <div className="h-52 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courseData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="talabalar" radius={[4, 4, 0, 0]}>
                            {courseData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COURSE_COLORS[index % COURSE_COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Search className="text-blue-600" /> Talaba Qidirish
            </h3>
            <div className="relative max-w-xl">
                <input 
                    type="text" 
                    placeholder="Talaba ism-familiyasini kiriting..." 
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            </div>
        </div>

        {searchTerm.length > 1 && (
            <div className="p-8 bg-slate-50/50">
                {searchResults.length === 0 ? (
                    <p className="text-center py-8 text-slate-400">Hech qanday natija topilmadi</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-500 transition-all group">
                                <div className="w-12 h-12 rounded-full bg-blue-50 overflow-hidden flex-shrink-0">
                                    <img src={item.student.imageUrl} alt={item.student.fullName} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 text-sm">{item.student.fullName}</h4>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                                        {item.dormName.replace('Talabalar turar joyi', 'TTJ')} • XONA №{item.roomNumber}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;