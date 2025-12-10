import React, { useState } from 'react';
import { Room, Student } from '../types';
import { Users, UserPlus, X, Upload, Image as ImageIcon, CheckCircle, AlertTriangle } from 'lucide-react';

interface RoomGridProps {
  rooms: Room[];
  dormName: string;
  onUpdateRoom: (roomNumber: number, newStudent?: Student, removeId?: string) => void;
}

const FACULTIES_DATA: Record<string, string[]> = {
  'Gumanitar fanlar va jismoniy madaniyat': ['Tasviriy san\'at', 'Musiqa ta\'limi', 'Milliy g\'oya', 'Tarix', 'Jismoniy madaniyat'],
  'Pedagogika': ['Pedagogika', 'Maktabgacha ta\'lim', 'Boshlang\'ich ta\'lim'],
  'Aniq va tabiiy fanlar': ['Matematika va Informatika', 'Fizika va astronomiya', 'Kimyo', 'Biologiya', 'Geografiya va iqtisodiy bilim asoslari', 'Texnologik ta\'lim', 'Matematika', 'Amaliy matematika'],
  'Tillarni o\'qitish fakulteti': ['O\'zbek tili va adabiyoti', 'Ona tili va adabiyoti( qozoq tili)', 'Ona tili va adabiyoti (rus tili)', 'Xorijiy til va adabiyoti(ingiliz tili)'],
};

const RoomGrid: React.FC<RoomGridProps> = ({ rooms, dormName, onUpdateRoom }) => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentFaculty, setNewStudentFaculty] = useState('');
  const [newStudentDirection, setNewStudentDirection] = useState('');
  const [customDirection, setCustomDirection] = useState('');
  const [newStudentCourse, setNewStudentCourse] = useState(1);
  const [newStudentGroup, setNewStudentGroup] = useState('');
  const [newStudentImage, setNewStudentImage] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);

  const getRoomStyles = (count: number) => {
    if (count === 0) return {
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        badge: 'bg-emerald-200 text-emerald-800',
        badgeText: 'Bo\'sh',
        hover: 'hover:shadow-emerald-200 hover:border-emerald-500'
    };
    if (count < 4) return {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        badge: 'bg-amber-200 text-amber-800',
        badgeText: 'Band',
        hover: 'hover:shadow-amber-200 hover:border-amber-500'
    };
    return {
        bg: 'bg-rose-100',
        border: 'border-rose-300',
        badge: 'bg-rose-200 text-rose-900',
        badgeText: 'To\'la',
        hover: 'hover:shadow-rose-200 hover:border-rose-500'
    };
  };

  // Image compression utility
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          // Create canvas for resizing
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 150; // Resize to max 150px width for avatars
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            // Convert to JPEG with 0.7 quality to save space in localStorage
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
            setNewStudentImage(compressedDataUrl);
            setIsCompressing(false);
          }
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    if (selectedRoom.students.length >= 4) {
      alert("Xona to'la!");
      return;
    }

    // DUPLICATE CHECK (Qayta kiritishni oldini olish)
    const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');
    const targetName = normalizeName(newStudentName);

    const existingRoom = rooms.find(room => 
        room.students.some(student => normalizeName(student.fullName) === targetName)
    );

    if (existingRoom) {
        alert(`Bu talaba mavjud! "${newStudentName}" allaqachon ${existingRoom.number}-xonaga biriktirilgan.`);
        return;
    }

    const finalDirection = newStudentDirection === 'Boshqa' ? customDirection : newStudentDirection;
    if (!finalDirection.trim() || !newStudentGroup.trim()) {
        alert("Iltimos, barcha maydonlarni to'ldiring.");
        return;
    }

    const newStudent: Student = {
      id: Math.random().toString(36).substr(2, 9),
      fullName: newStudentName.trim(), // Save trimmed name
      faculty: newStudentFaculty,
      direction: finalDirection,
      course: newStudentCourse,
      group: newStudentGroup,
      imageUrl: newStudentImage || `https://api.dicebear.com/9.x/avataaars/png?seed=${Math.random()}`,
      joinedDate: new Date().toISOString().split('T')[0],
    };

    onUpdateRoom(selectedRoom.number, newStudent);
    
    // Reset form
    setNewStudentName('');
    setNewStudentFaculty('');
    setNewStudentDirection('');
    setCustomDirection('');
    setNewStudentImage('');
    setNewStudentCourse(1);
    setNewStudentGroup('');
    
    setSelectedRoom({
        ...selectedRoom,
        students: [...selectedRoom.students, newStudent]
    });
  };

  const handleRemoveStudent = (studentId: string) => {
    if (!selectedRoom) return;
    onUpdateRoom(selectedRoom.number, undefined, studentId);
    setSelectedRoom({
        ...selectedRoom,
        students: selectedRoom.students.filter(s => s.id !== studentId)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <span className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></span>
            {dormName}
          </h2>
          
          <div className="flex gap-4 text-sm font-medium">
            <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Bo'sh
            </div>
            <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Band
            </div>
            <div className="flex items-center gap-2 bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-300 text-rose-800">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> To'la
            </div>
          </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {rooms.map((room) => {
          const styles = getRoomStyles(room.students.length);
          return (
            <button
                key={room.number}
                onClick={() => setSelectedRoom(room)}
                className={`relative group p-4 rounded-xl border ${styles.border} ${styles.bg} transition-all duration-200 hover:shadow-lg ${styles.hover} flex flex-col items-center justify-between h-28`}
            >
                <div className="absolute top-0 right-0 p-1.5">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${styles.badge}`}>
                        {room.students.length}/4
                    </span>
                </div>
                <span className="font-bold text-2xl text-slate-700 mt-2">{room.number}</span>
                <div className="flex -space-x-2 pb-1 pl-1">
                    {room.students.map((student) => (
                        <div key={student.id} className="relative group/avatar hover:z-20 transition-all">
                             <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] text-slate-500 overflow-hidden shadow-sm">
                                {student.imageUrl ? (
                                    <img src={student.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <Users size={12} className="text-slate-400" />
                                )}
                             </div>
                             
                             {/* Tooltip on Hover */}
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/avatar:block z-50 w-max max-w-[150px] px-3 py-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                                 <p className="font-bold truncate">{student.fullName}</p>
                                 <div className="flex gap-1 mt-0.5 text-[9px] text-slate-300">
                                    <span>{student.course}-kurs</span>
                                    <span>•</span>
                                    <span>{student.group}</span>
                                 </div>
                                 <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-800"></div>
                             </div>
                        </div>
                    ))}
                    {Array.from({ length: 4 - room.students.length }).map((_, i) => (
                        <div key={`empty-${i}`} className="w-6 h-6 rounded-full border-2 border-dashed border-slate-300/50"></div>
                    ))}
                </div>
            </button>
          )
        })}
      </div>

      {/* Room Details Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                  <h3 className="text-xl font-bold text-slate-800">Xona №{selectedRoom.number}</h3>
                  <p className="text-sm text-slate-500">Talabalar ro'yxati va boshqaruv</p>
              </div>
              <button 
                onClick={() => setSelectedRoom(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-rose-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <h4 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                <span>Yashovchilar</span>
                <span className={`text-xs px-2 py-1 rounded-full ${selectedRoom.students.length === 4 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {selectedRoom.students.length} / 4 o'rin band
                </span>
              </h4>
              
              {selectedRoom.students.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 mb-6">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Users className="text-slate-400" size={24} />
                    </div>
                    <p className="text-slate-500 font-medium">Bu xona hozircha bo'sh.</p>
                </div>
              ) : (
                <ul className="space-y-3 mb-8">
                  {selectedRoom.students.map((student) => (
                    <li key={student.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                            <img src={student.imageUrl} alt={student.fullName} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{student.fullName}</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                             <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{student.course}-kurs</span>
                             <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{student.group}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleRemoveStudent(student.id)}
                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-all"
                        title="Chiqarish"
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {selectedRoom.students.length < 4 && (
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="font-bold mb-4 text-blue-600 flex items-center">
                    <UserPlus size={18} className="mr-2" />
                    Yangi talaba qo'shish
                  </h4>
                  <form onSubmit={handleAddStudent} className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="relative group cursor-pointer w-20 h-20 rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 flex items-center justify-center hover:bg-white hover:border-blue-400 transition-colors overflow-hidden flex-shrink-0">
                            {isCompressing ? (
                                <div className="text-xs text-blue-500 font-medium">Yuklanmoqda...</div>
                            ) : newStudentImage ? (
                                <img src={newStudentImage} alt="Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-1">
                                    <ImageIcon className="text-slate-400 mx-auto mb-1" size={20} />
                                    <span className="text-[10px] text-slate-400 leading-tight block">Rasm yuklash</span>
                                </div>
                            )}
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleImageChange}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">F.I.SH</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ism Familiya Sharif"
                                    value={newStudentName}
                                    onChange={(e) => setNewStudentName(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>
                             <div className="flex gap-3">
                                <div className="w-1/2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Kurs</label>
                                    <select
                                        value={newStudentCourse}
                                        onChange={(e) => setNewStudentCourse(Number(e.target.value))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    >
                                        {[1, 2, 3, 4].map(c => <option key={c} value={c}>{c}-kurs</option>)}
                                    </select>
                                </div>
                                <div className="w-1/2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Guruh</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="101"
                                        value={newStudentGroup}
                                        onChange={(e) => setNewStudentGroup(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                </div>
                             </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3">
                        <div>
                             <label className="block text-xs font-medium text-slate-500 mb-1">Fakultet</label>
                            <select
                                required
                                value={newStudentFaculty}
                                onChange={(e) => {
                                    setNewStudentFaculty(e.target.value);
                                    setNewStudentDirection('');
                                }}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                <option value="">Tanlang...</option>
                                {Object.keys(FACULTIES_DATA).map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>
                        
                        {newStudentFaculty && (
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Yo'nalish</label>
                                <select
                                    required
                                    value={newStudentDirection}
                                    onChange={(e) => setNewStudentDirection(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                >
                                    <option value="">Tanlang...</option>
                                    {FACULTIES_DATA[newStudentFaculty].map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                    <option value="Boshqa">Boshqa...</option>
                                </select>
                            </div>
                        )}
                        
                        {newStudentDirection === 'Boshqa' && (
                            <input
                                required
                                type="text"
                                placeholder="Yo'nalish nomini kiriting"
                                value={customDirection}
                                onChange={(e) => setCustomDirection(e.target.value)}
                                className="w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        )}
                    </div>
                    
                    <button 
                        type="submit"
                        disabled={isCompressing}
                        className={`w-full text-white py-2.5 rounded-xl transition-all shadow-lg font-semibold flex items-center justify-center gap-2 mt-2 ${
                            isCompressing ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                        }`}
                    >
                        <CheckCircle size={18} />
                        {isCompressing ? 'Rasm yuklanmoqda...' : 'Saqlash'}
                    </button>
                  </form>
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