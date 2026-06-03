
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

const API_BASE_URL = "http://172.23.0.118:3003/api";

const safeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const customHeaders = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(options?.headers || {})
  };
  const finalOptions = {
    ...options,
    headers: customHeaders
  };

  const res = await fetch(url, finalOptions);

  // Intercept response json parse to secure correct warning output for HTML/NGROK responses
  const originalJson = res.json.bind(res);
  res.json = async () => {
    const text = await res.text();
    const isHtml = text.trim().startsWith('<');
    if (isHtml) {
      console.error(`Xatolik: JSON kutilgan edi, lekin HTML formatidagi javob keldi (Status: ${res.status}). Javob:`, text);
      throw new Error(`Kutilmagan HTML javob keldi (Status: ${res.status})`);
    }
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error("JSON parselashda xatolik:", err, "Asl javob:", text);
      throw err;
    }
  };

  return res;
};

const RoomGrid: React.FC<RoomGridProps> = ({ rooms, dormName, isGuest, onUpdateRoom, allDorms }) => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searching, setSearching] = useState(false);
  const [foundStudent, setFoundStudent] = useState<any>(null);
  const [error, setError] = useState('');

  // Search form state
  const [studentIdInput, setStudentIdInput] = useState('');

  const searchFromApi = async () => {
    if (!studentIdInput.trim()) {
      setError("Iltimos, Talaba ID yoki JShShIR kiriting!");
      return;
    }
    
    setSearching(true);
    setError('');
    setFoundStudent(null);

    try {
      const response = await safeFetch(`${API_BASE_URL}/students/search/${studentIdInput.trim()}`);
      if (!response.ok) {
        throw new Error(`Search failed: status ${response.status}`);
      }
      const data = await response.json();

      if (data && data.success === true && data.student) {
        checkAndSetStudent(data.student);
      } else {
        setError("Talaba topilmadi");
      }
    } catch (err: any) {
      console.error("Student API Search Error Details:", err);
      setError("Talaba topilmadi");
    } finally {
      setSearching(false);
    }
  };

  const checkAndSetStudent = (studentData: any) => {
    let exists = false;
    const studentId = studentData.student_id_number;

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

  const handleAddRequest = async () => {
    if (!selectedRoom) return;

    if (selectedRoom.students.length >= 4) {
      setError("Bu xona to'lgan! Maksimal 4 ta talaba joylashishi mumkin.");
      return;
    }

    let newStudent: Student;

    if (foundStudent) {
      try {
        const dormId = dormName.includes("1") ? 1 : dormName.includes("2") ? 2 : 3;

        let res;
        const payload = {
          student_id_number: String(foundStudent.student_id_number),
          dorm_id: Number(dormId),
          room_number: Number(selectedRoom.number),
          bed_number: selectedRoom.students.length + 1,
          type: 'ADD',
          student: {
            full_name: foundStudent.full_name,
            faculty: foundStudent.faculty,
            specialty: foundStudent.specialty,
            course: String(foundStudent.course),
            group_name: foundStudent.group_name,
            image: foundStudent.image || ""
          }
        };
        try {
          res = await safeFetch(`${API_BASE_URL}/applications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            throw new Error(`POST failed on server: status ${res.status}`);
          }
        } catch (postErr: any) {
          console.error("POST applications failed:", postErr);
          throw new Error("Serverga bog'lanishda xatolik yuz berdi.");
        }

        let data;
        try {
          data = await res.json();
        } catch (jsonErr) {
          console.error("Failed to parse POST response as JSON:", jsonErr);
          throw new Error("Noma'lum server formati: serverdan noto'g'ri javob oldik.");
        }

        if (!data || !data.success) {
          setError(data?.message || "Arizani saqlashda xatolik yuz berdi.");
          return;
        }

        newStudent = {
          id: data.application.id,
          hemisId: String(foundStudent.student_id_number),
          fullName: foundStudent.full_name,
          faculty: foundStudent.faculty,
          direction: foundStudent.specialty,
          course: parseInt(String(foundStudent.course).replace(/\D/g, '')) || 1,
          group: foundStudent.group_name,
          imageUrl: foundStudent.image || `https://api.dicebear.com/9.x/avataaars/png?seed=${foundStudent.student_id_number}`,
          joinedDate: new Date().toLocaleString(),
        };

        onUpdateRoom(selectedRoom.number, newStudent);
        resetState();
      } catch (err) {
        console.error("Failed to post application:", err);
        setError("Arizani yuborishda xatolik yuz berdi.");
      }
    }
  };

  const resetState = () => {
    setFoundStudent(null);
    setStudentIdInput('');
    setSelectedRoom(null);
    setError('');
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
                  <h4 className="font-black text-[10px] text-blue-600 uppercase mb-4 tracking-widest flex items-center gap-2">
                    <ShieldCheck size={16}/> TALABALAR BAZASIDAN QIDIRUV
                  </h4>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <input 
                        placeholder="Talaba ID yoki JShShIR kiriting" 
                        className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold"
                        value={studentIdInput}
                        onChange={e => setStudentIdInput(e.target.value.replace(/\s/g, ''))}
                      />
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    </div>

                    <button 
                      onClick={searchFromApi}
                      disabled={searching}
                      className="w-full bg-blue-600 text-white py-4 rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                    >
                      {searching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      QIDIRISH
                    </button>
                  </div>

                  {error && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl mt-4 animate-shake text-left">
                       <div className="flex items-start gap-2 text-rose-600 text-[10px] font-black mb-0">
                         <AlertCircle size={14} className="mt-0.5 flex-shrink-0" /> <span>{error}</span>
                       </div>
                    </div>
                  )}

                  {foundStudent && (
                    <div className="mt-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 animate-in slide-in-from-top-2 text-left space-y-4">
                      <div className="flex items-start gap-4">
                        <img src={foundStudent.image || `https://api.dicebear.com/9.x/avataaars/png?seed=${foundStudent.student_id_number}`} className="w-16 h-16 rounded-2xl border bg-white object-cover shadow-sm"/>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-slate-900 text-base leading-tight uppercase truncate">{foundStudent.full_name}</p>
                          <p className="text-[10px] font-black text-blue-600 tracking-wider uppercase mt-1">ID: {foundStudent.student_id_number}</p>
                        </div>
                      </div>
                      
                      {/* Auto-filled details in a grid */}
                      <div className="bg-white p-4 rounded-xl border border-slate-100 grid grid-cols-2 gap-3 text-xs">
                        <div className="col-span-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider">Fakultet:</span>
                          <span className="font-bold text-slate-800">{foundStudent.faculty}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider">Yo'nalish / Mutaxassislik:</span>
                          <span className="font-bold text-slate-800">{foundStudent.specialty}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider">Kurs:</span>
                          <span className="font-extrabold text-slate-800">{foundStudent.course}-kurs</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block tracking-wider">Guruh:</span>
                          <span className="font-extrabold text-slate-800">{foundStudent.group_name}</span>
                        </div>
                      </div>

                      {/* Auto-filled Application Details */}
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-[11px] font-medium text-amber-800">
                         <p className="font-bold mb-1">📋 Ariza formasi to'ldirildi:</p>
                         <ul className="list-disc pl-4 space-y-0.5">
                           <li>Bino: {dormName}</li>
                           <li>Xona raqami: {selectedRoom.number}-xona</li>
                           <li>Ariza turi: Yotoqxonaga joylashtirish (KIRISH)</li>
                         </ul>
                      </div>

                      <button 
                        onClick={handleAddRequest}
                        className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs hover:bg-emerald-600 flex items-center justify-center gap-2 transition-all shadow-md uppercase tracking-wider"
                      >
                        <CheckCircle size={18}/> ARIZANI TOPSHIRISH
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
