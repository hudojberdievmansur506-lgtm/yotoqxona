import React, { useState } from 'react';
import { ViewState, Dormitory, Student } from './types';
import Dashboard from './components/Dashboard';
import RoomGrid from './components/RoomGrid';
import Assistant from './components/Assistant';
import { LayoutDashboard, Building2, Sparkles, GraduationCap, Menu } from 'lucide-react';

// Mock Data Helpers
const MOCK_NAMES = [
  'Aziz', 'Bekzod', 'Sardor', 'Malika', 'Dildora', 'Otabek', 'Jasur', 'Madina', 'Shahlo', 'Nodir', 
  'Jamshid', 'Sevara', 'Guli', 'Bobur', 'Dilshod', 'Lola', 'Farhod', 'Ravshan', 'Zarina', 'Umida',
  'Javohir', 'Shohruh', 'Nigora', 'Barno', 'Sherzod', 'Davron', 'Kamola', 'Laylo', 'Sanjar', 'Akmal',
  'Alisher', 'Botir', 'Dilnoza', 'Feruza', 'Gulnoza', 'Husan', 'Hasan', 'Iroda', 'Jalol', 'Komil'
];

const MOCK_SURNAMES = [
  'Karimov', 'Rahimov', 'Abdullayev', 'Yusupov', 'Umarov', 'Aliyev', 'Nazarov', 'Rustamov', 'Ismoilov', 
  'Qodirov', 'Ahmedov', 'Saidov', 'Sharipov', 'Zakirov', 'Tursunov', 'Boboyev', 'Mirzayev', 'Oripov', 
  'Sultonov', 'Xoliqov', 'Rasulov', 'Sobirov', 'Toshpo\'latov', 'Ergashev', 'Yo\'ldoshev',
  'Norboyev', 'Olimov', 'Pulatov', 'Qosimov', 'Rajabov', 'Safarov', 'Temirov', 'Usmonov', 'Valiyev'
];

const getRandomName = () => {
  const name = MOCK_NAMES[Math.floor(Math.random() * MOCK_NAMES.length)];
  const surname = MOCK_SURNAMES[Math.floor(Math.random() * MOCK_SURNAMES.length)];
  return `${surname} ${name}`;
};

// Helper to generate initial rooms with exactly the requested number of students
const generateRooms = (roomCount: number, dormPrefix: number, totalStudentsToGenerate: number) => {
  // 1. Initialize empty rooms
  const rooms = Array.from({ length: roomCount }, (_, i) => ({
    number: i + 1,
    capacity: 4,
    students: [] as Student[]
  }));

  const facultiesData: Record<string, string[]> = {
      'Pedagogika': ['Pedagogika', 'Maktabgacha ta\'lim', 'Boshlang\'ich ta\'lim'],
      'Aniq va tabiiy fanlar': ['Matematika va Informatika', 'Fizika va astronomiya', 'Kimyo', 'Biologiya', 'Geografiya va iqtisodiy bilim asoslari', 'Texnologik ta\'lim', 'Matematika', 'Amaliy matematika'],
      'Tillarni o\'qitish fakulteti': ['O\'zbek tili va adabiyoti', 'Ona tili va adabiyoti( qozoq tili)', 'Ona tili va adabiyoti (rus tili)', 'Xorijiy til va adabiyoti(ingiliz tili)'],
      'Gumanitar fanlar va jismoniy madaniyat': ['Tasviriy san\'at', 'Musiqa ta\'limi', 'Milliy g\'oya', 'Tarix', 'Jismoniy madaniyat']
  };
  
  const faculties = Object.keys(facultiesData);
  let studentsAdded = 0;
  
  // Create a list of available room indices to avoid infinite loops when rooms get full
  let availableRoomIndices = Array.from({ length: roomCount }, (_, i) => i);

  // 2. Distribute students using available indices
  while (studentsAdded < totalStudentsToGenerate && availableRoomIndices.length > 0) {
    // Pick a random room from the AVAILABLE list
    const randomListIndex = Math.floor(Math.random() * availableRoomIndices.length);
    const roomIndex = availableRoomIndices[randomListIndex];
    const room = rooms[roomIndex];

    const faculty = faculties[Math.floor(Math.random() * faculties.length)];
    const availableDirections = facultiesData[faculty];
    const direction = availableDirections[Math.floor(Math.random() * availableDirections.length)];
    const course = Math.floor(Math.random() * 4) + 1;

    const student: Student = {
      id: `d${dormPrefix}-s${studentsAdded + 1000}`, // Ensure unique IDs
      fullName: getRandomName(),
      course: course,
      group: `${course}0${Math.floor(Math.random() * 5) + 1}`,
      faculty: faculty,
      direction: direction,
      imageUrl: `https://api.dicebear.com/9.x/avataaars/png?seed=${dormPrefix}-${studentsAdded}-${Math.random()}`,
      joinedDate: '2023-09-01'
    };

    room.students.push(student);
    studentsAdded++;

    // If room is full, remove it from available indices so we don't pick it again
    if (room.students.length >= 4) {
        availableRoomIndices.splice(randomListIndex, 1);
    }
  }

  return rooms;
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // Initialize state with 2 dormitories.
  // Requested: 100 rooms per dorm.
  // Keeping 390 students per dorm (780 total) as per previous context.
  const [dorms, setDorms] = useState<Dormitory[]>([
    {
      id: 1,
      name: "1-Talabalar turar joyi",
      totalRooms: 100,
      rooms: generateRooms(100, 1, 390)
    },
    {
      id: 2,
      name: "2-Talabalar turar joyi",
      totalRooms: 100,
      rooms: generateRooms(100, 2, 390)
    }
  ]);

  const updateRoom = (dormId: number, roomNumber: number, newStudent?: Student, removeId?: string) => {
    setDorms(currentDorms => currentDorms.map(dorm => {
      if (dorm.id !== dormId) return dorm;
      
      return {
        ...dorm,
        rooms: dorm.rooms.map(room => {
          if (room.number !== roomNumber) return room;
          
          let updatedStudents = [...room.students];
          
          if (removeId) {
            updatedStudents = updatedStudents.filter(s => s.id !== removeId);
          } else if (newStudent) {
            if (updatedStudents.length < 4) {
              updatedStudents.push(newStudent);
            }
          }
          
          return { ...room, students: updatedStudents };
        })
      };
    }));
  };

  const SidebarItem = ({ viewState, icon: Icon, label }: { viewState: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => setView(viewState)}
      className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-300 group ${
        view === viewState 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 translate-x-1' 
          : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
      }`}
    >
      <Icon size={22} className={`${view === viewState ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} transition-colors`} />
      <span className="font-semibold">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900">
      {/* Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
        <div className="p-8 flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
            <GraduationCap className="text-white" size={26} />
          </div>
          <div>
             <h1 className="font-bold text-slate-800 text-xl leading-none tracking-tight">GDPI</h1>
             <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Yotoqxona</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Asosiy menyu</p>
          <SidebarItem viewState={ViewState.DASHBOARD} icon={LayoutDashboard} label="Boshqaruv Paneli" />
          <SidebarItem viewState={ViewState.DORM1} icon={Building2} label="1-TTJ Binosi" />
          <SidebarItem viewState={ViewState.DORM2} icon={Building2} label="2-TTJ Binosi" />
          
          <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mt-8 mb-2">Qo'shimcha</p>
          <SidebarItem viewState={ViewState.AI_ASSISTANT} icon={Sparkles} label="AI Yordamchi" />
        </nav>
        
        <div className="p-6 m-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex items-center space-x-3 text-sm text-slate-600 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="font-semibold">Tizim faol</span>
          </div>
          
          <div className="pt-4 border-t border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Dasturchi</p>
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    XM
                </div>
                <p className="text-sm font-bold text-slate-700">Xudayberdiyev Mansur</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
         {/* Decorative Background Blobs */}
         <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none z-0"></div>

        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 px-8 py-5 flex justify-between items-center shadow-sm">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">
                    {view === ViewState.DASHBOARD && 'Boshqaruv Paneli'}
                    {view === ViewState.DORM1 && '1-Talabalar turar joyi'}
                    {view === ViewState.DORM2 && '2-Talabalar turar joyi'}
                    {view === ViewState.AI_ASSISTANT && 'Virtual Yordamchi'}
                </h2>
                <p className="text-sm text-slate-500 font-medium mt-1">Guliston davlat pedagogika instituti</p>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    2025-2026 O'quv yili
                </div>
                <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                    <Menu size={24} />
                </button>
            </div>
        </header>

        <main className="flex-1 overflow-auto p-6 z-0 scroll-smooth">
          <div className="max-w-7xl mx-auto pb-10">
            {view === ViewState.DASHBOARD && <Dashboard dorms={dorms} />}
            {view === ViewState.DORM1 && (
              <RoomGrid 
                rooms={dorms[0].rooms} 
                dormName={dorms[0].name} 
                onUpdateRoom={(num, student, removeId) => updateRoom(1, num, student, removeId)} 
              />
            )}
            {view === ViewState.DORM2 && (
              <RoomGrid 
                rooms={dorms[1].rooms} 
                dormName={dorms[1].name} 
                onUpdateRoom={(num, student, removeId) => updateRoom(2, num, student, removeId)} 
              />
            )}
            {view === ViewState.AI_ASSISTANT && <Assistant dorms={dorms} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;