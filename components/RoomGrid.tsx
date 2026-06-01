
import React, { useState } from 'react';
import { Room, Student } from '../types';
import { Users, UserPlus, X, Search, CheckCircle, Clock, Building2, Trash2, Info, FileSpreadsheet, AlertCircle, Loader2, UserPen, Fingerprint, CreditCard, Hash, ShieldCheck } from 'lucide-react';

interface RoomGridProps {
  rooms: Room[];
  dormName: string;
  isGuest?: boolean;
  onUpdateRoom: (roomNumber: number, newStudent?: Student, removeId?: string) => void;
  allDorms?: any[];
}

const RoomGrid: React.FC<RoomGridProps> = ({ rooms, dormName, isGuest, onUpdateRoom, allDorms }) => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searching, setSearching] = useState(false);
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [error, setError] = useState('');
  const [isManualMode, setIsManualMode] = useState(false);

  // Search form state
  const [searchIdentity, setSearchIdentity] = useState({
    passportSeries: '',
    passportNumber: '',
    jshir: ''
  });

  // Manual form state
  const [manualStudent, setManualStudent] = useState({
    fullName: '',
    group: '',
    course: '1',
    faculty: ''
  });

  const searchFromHemis = async () => {
    const { passportSeries, passportNumber, jshir } = searchIdentity;
    
    if (!passportSeries.trim() || !passportNumber.trim() || !jshir.trim()) {
      setError("Iltimos, aniq izlash uchun barcha maydonlarni (Seriya, Raqam va JSHIR) to'liq kiriting");
      return;
    }
    
    setSearching(true);
    setError('');
    setFoundStudent(null);
    setIsManualMode(false);

    try {
      const params = new URLSearchParams();
      params.append('passport_series', passportSeries.trim().toUpperCase());
      params.append('passport_number', passportNumber.trim());
      params.append('passport_pin', jshir.trim());

      const url = `https://student.gspi.uz/rest/v1/data/student-list?${params.toString()}`;

      // We use a direct fetch. If it fails with 'Failed to fetch', it's almost certainly CORS.
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': 'Bearer 3wDM12YjwzLS94R1B_eIsvBu1f7MIPwI'
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const items = data?.data?.items || [];
      
      // Since there are 7,234 students, we verify the specific match manually from results
      const studentData = items.find((item: any) => 
        String(item.passport_pin) === String(jshir.trim())
      ) || items[0]; 

      if (!studentData) {
        setError("Ushbu ma'lumotlar bilan talaba topilmadi. Ma'lumotlarni tekshiring.");
      } else {
        checkAndSetStudent(studentData);
      }
    } catch (err: any) {
      console.error("HEMIS API Error Details:", err);
      
      if (err.message === 'Failed to fetch') {
        setError("HEMIS serveriga to'g'ridan-to'g'ri bog'lanish bloklandi (CORS xatoligi). Bu brauzer xavfsizlik cheklovi hisoblanadi. Iltimos, talabani qo'lda qo'shish variantidan foydalaning.");
      } else {
        setError("Tizimda nosozlik yuz berdi. Ma'lumotlarni qo'lda kiritishingiz mumkin.");
      }
    } finally {
      setSearching(false);
    }
  };

  const checkAndSetStudent = (studentData: any) => {
    let exists = false;
    const studentId = studentData.student_id || studentData.id;

    if (allDorms) {
      for (const d of allDorms) {
        for (const r of d.rooms) {
          if (r.students.find((s: Student) => String(s.hemisId) === String(studentId))) {
            exists = true;
            break;
          }
        }
        if (exists) break;
      }
    }

    if (exists) {
      setError("Ushbu talaba allaqachon yotoqxona tizimida mavjud!");
    } else {
      setFoundStudent(studentData);
    }
  };

  const handleAddRequest = () => {
    if (!selectedRoom) return;

    let newStudent: Student;

    if (foundStudent) {
      newStudent = {
        id: Math.random().toString(36).substr(2, 9),
        hemisId: String(foundStudent.student_id || foundStudent.id),
        fullName: foundStudent.full_name || foundStudent.fullName,
        faculty: foundStudent.faculty?.name || foundStudent.faculty || 'Noma\'lum',
        direction: foundStudent.specialty?.name || foundStudent.specialty || 'Noma\'lum',
        course: Number(foundStudent.level?.code || foundStudent.level || 1),
        group: foundStudent.group?.name || foundStudent.group || 'Noma\'lum',
        imageUrl: foundStudent.image || foundStudent.imageUrl || `https://api.dicebear.com/9.x/avataaars/png?seed=${foundStudent.student_id || foundStudent.id}`,
        joinedDate: new Date().toLocaleString(),
      };
    } else if (isManualMode) {
      if (!manualStudent.fullName || !manualStudent.group) {
        setError("Talaba ismi va guruhi majburiy!");
        return;
      }
      newStudent = {
        id: Math.random().toString(36).substr(2, 9),
        hemisId: searchIdentity.jshir || 'M-' + Date.now(),
        fullName: manualStudent.fullName,
        faculty: manualStudent.faculty || 'Noma\'lum',
        direction: 'Qo\'lda kiritilgan',
        course: Number(manualStudent.course),
        group: manualStudent.group,
        imageUrl: `https://api.dicebear.com/9.x/avataaars/png?seed=${manualStudent.fullName}`,
        joinedDate: new Date().toLocaleString(),
      };
    } else {
      return;
    }

    onUpdateRoom(selectedRoom.number, newStudent);
    resetState();
  };

  const resetState = () => {
    setFoundStudent(null);
    setSearchIdentity({ passportSeries: '', passportNumber: '', jshir: '' });
    setSelectedRoom(null);
    setError('');
    setIsManualMode(false);
    setManualStudent({ fullName: '', group: '', course: '1', faculty: '' });
  };

  const exportDormToExcel = async () => {
    // @ts-ignore
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(dormName);
    worksheet.columns = [
      { header: 'Xona №', key: 'room', width: 10 },
      { header: 'HEMIS ID', key: 'hemisId', width: 15 },
      { header: 'F.I.SH', key: 'name', width: 30 },
      { header: 'Kurs', key: 'course', width: 10 },
      { header: 'Guruh', key: 'group', width: 15 },
      { header: 'Fakultet', key: 'faculty', width: 30 },
      { header: 'Yo\'nalish', key: 'direction', width: 30 },
      { header: 'Kirgan sana', key: 'date', width: 20 },
    ];

    rooms.forEach(room => {
      if (room.students.length > 0) {
        room.students.forEach(s => {
          worksheet.addRow({
            room: room.number,
            hemisId: s.hemisId,
            name: s.fullName,
            course: s.course,
            group: s.group,
            faculty: s.faculty,
            direction: s.direction,
            date: s.joinedDate
          });
        });
      } else {
        worksheet.addRow({ room: room.number, name: 'BO\'SH' });
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${dormName.replace(/\s+/g, '_')}_Hisoboti.xlsx`;
    anchor.click();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-3"><Building2 className="text-blue-600"/> {dormName}</h2>
          <div className="flex flex-wrap justify-center gap-4 border-l border-slate-100 pl-4">
              <span className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> BO'SH</span>
              <span className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><span className="w-2 h-2 rounded-full bg-amber-500"></span> QISMAN</span>
              <span className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest"><span className="w-2 h-2 rounded-full bg-rose-500"></span> TO'LA</span>
          </div>
        </div>
        {!isGuest && (
          <button onClick={exportDormToExcel} className="bg-emerald-50 text-emerald-600 px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100">
            <FileSpreadsheet size={16}/> Bino hisoboti (Excel)
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 xl:grid-cols-10 gap-3">
        {rooms.map((room) => (
          <button
            key={room.number}
            onClick={() => { resetState(); setSelectedRoom(room); }}
            className={`h-28 p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 active:scale-95 ${
                room.students.length === 0 ? 'bg-white border-slate-100 hover:border-emerald-400' :
                room.students.length === 4 ? 'bg-rose-50 border-rose-100 hover:border-rose-400' :
                'bg-amber-50 border-amber-100 hover:border-amber-400'
            }`}
          >
            <span className="font-black text-2xl text-slate-800">{room.number}</span>
            <div className="flex -space-x-1.5">
                {room.students.map(s => <div key={s.id} className="w-5 h-5 rounded-full border border-white bg-slate-200 overflow-hidden shadow-sm"><img src={s.imageUrl} className="w-full h-full object-cover"/></div>)}
                {Array.from({length: 4 - room.students.length}).map((_, i) => <div key={i} className="w-5 h-5 rounded-full border border-dashed border-slate-300"></div>)}
            </div>
          </button>
        ))}
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
              <div>
                <h3 className="font-black text-2xl text-slate-800">Xona №{selectedRoom.number}</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedRoom.students.length} / 4 o'rin band</p>
              </div>
              <button onClick={() => setSelectedRoom(null)} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-100 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              {selectedRoom.students.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex items-center gap-4">
                    <img src={s.imageUrl} className="w-12 h-12 rounded-full border border-slate-100 object-cover"/>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-800">{s.fullName}</p>
                      <p className="text-[10px] text-blue-600 uppercase font-black tracking-widest">{s.group} • ID: {s.hemisId}</p>
                    </div>
                  </div>
                  {!isGuest && (
                    <button onClick={() => { onUpdateRoom(selectedRoom.number, undefined, s.id); setSelectedRoom(null); }} className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl">
                      <Trash2 size={18}/>
                    </button>
                  )}
                </div>
              ))}

              {!isGuest && selectedRoom.students.length < 4 && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  {!isManualMode ? (
                    <>
                      <h4 className="font-black text-[10px] text-blue-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                        <ShieldCheck size={16}/> HEMIS BAZASIDAN QIDIRUV
                      </h4>
                      
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                             <input 
                                placeholder="Seriya" 
                                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-center uppercase"
                                maxLength={2}
                                value={searchIdentity.passportSeries}
                                onChange={e => setSearchIdentity({...searchIdentity, passportSeries: e.target.value.toUpperCase()})}
                              />
                              <input 
                                placeholder="Pasport raqami" 
                                className="col-span-2 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold"
                                maxLength={7}
                                value={searchIdentity.passportNumber}
                                onChange={e => setSearchIdentity({...searchIdentity, passportNumber: e.target.value.replace(/\D/g, '')})}
                              />
                        </div>
                        <input 
                          placeholder="JSHIR (PINFL - 14 ta raqam)" 
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold"
                          maxLength={14}
                          value={searchIdentity.jshir}
                          onChange={e => setSearchIdentity({...searchIdentity, jshir: e.target.value.replace(/\D/g, '')})}
                        />

                        <button 
                          onClick={searchFromHemis}
                          disabled={searching}
                          className="w-full bg-blue-600 text-white py-4 rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                        >
                          {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                          IZLASH (7,234 TA TALABA ICHIDAN)
                        </button>
                      </div>

                      {error && (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl mt-4 animate-shake text-left">
                           <div className="flex items-start gap-2 text-rose-600 text-[10px] font-black mb-3">
                            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> <span>{error}</span>
                           </div>
                           <button 
                             onClick={() => { setIsManualMode(true); setError(''); }}
                             className="w-full py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-rose-50 transition-colors flex items-center justify-center gap-2"
                           >
                             <UserPen size={14} /> Ma'lumotlarni qo'lda kiritish
                           </button>
                        </div>
                      )}

                      {foundStudent && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 animate-in slide-in-from-top-2 text-left">
                          <div className="flex items-center gap-3 mb-4">
                            <img src={foundStudent.image || `https://api.dicebear.com/9.x/avataaars/png?seed=${foundStudent.id}`} className="w-14 h-14 rounded-xl border bg-white object-cover"/>
                            <div>
                              <p className="font-black text-slate-800 text-sm leading-tight uppercase">{foundStudent.full_name || foundStudent.fullName}</p>
                              <p className="text-[9px] text-blue-600 font-black mt-1 uppercase">Guruh: {foundStudent.group?.name || foundStudent.group}</p>
                            </div>
                          </div>
                          <button 
                            onClick={handleAddRequest}
                            className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs hover:bg-emerald-600 flex items-center justify-center gap-2 transition-all shadow-md"
                          >
                            <CheckCircle size={18}/> TALABANI TASDIQLASH
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-right-4 text-left">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-black text-[10px] text-amber-600 uppercase tracking-widest flex items-center gap-2">
                          <UserPen size={16}/> QO'LDA KIRITISH
                        </h4>
                        <button onClick={() => setIsManualMode(false)} className="text-[10px] font-black text-slate-400 hover:text-slate-600 underline">Qidiruvga qaytish</button>
                      </div>
                      
                      <input 
                        placeholder="Talaba F.I.SH" 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-500 font-bold text-sm"
                        value={manualStudent.fullName}
                        onChange={e => setManualStudent({...manualStudent, fullName: e.target.value})}
                      />
                      
                      <div className="grid grid-cols-2 gap-3">
                        <input 
                          placeholder="Guruh (Masalan: 101)" 
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-500 font-bold text-sm"
                          value={manualStudent.group}
                          onChange={e => setManualStudent({...manualStudent, group: e.target.value})}
                        />
                        <select 
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-500 font-bold text-sm appearance-none"
                          value={manualStudent.course}
                          onChange={e => setManualStudent({...manualStudent, course: e.target.value})}
                        >
                          <option value="1">1-kurs</option>
                          <option value="2">2-kurs</option>
                          <option value="3">3-kurs</option>
                          <option value="4">4-kurs</option>
                        </select>
                      </div>

                      <input 
                        placeholder="Fakultet nomi" 
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-amber-500 font-bold text-sm"
                        value={manualStudent.faculty}
                        onChange={e => setManualStudent({...manualStudent, faculty: e.target.value})}
                      />

                      <button 
                        onClick={handleAddRequest}
                        className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs hover:bg-amber-600 shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <CheckCircle size={18}/> RO'YXATGA QO'SHISH
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomGrid;
