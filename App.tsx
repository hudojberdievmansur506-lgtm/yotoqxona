import React, { useState, useEffect } from 'react';
import { ViewState, Dormitory, Student, UserRole, AdminRequest, ArchivedStudent } from './types';
import Dashboard from './components/Dashboard';
import RoomGrid from './components/RoomGrid';
import Assistant from './components/Assistant';
import { 
  LayoutDashboard, Building2, Sparkles, GraduationCap, 
  CheckCircle, LogOut, ShieldCheck, Bell, History, Inbox, XCircle, MessageSquare, Lock, Calendar, Clock, Mail, Trash2
} from 'lucide-react';

const STORAGE_KEY = 'gdpi_dorm_system_v2';

const ADMIN_CREDENTIALS: Record<string, string> = {
  'SUPER_ADMIN': 'admin777',
  'DORM1_ADMIN': 'ttj1_pass',
  'DORM2_ADMIN': 'ttj2_pass'
};

const getRequestCreatedAtTime = (req: AdminRequest): number => {
  if (req.createdAtTimestamp !== undefined && req.createdAtTimestamp !== null) {
    return req.createdAtTimestamp;
  }
  const parsed = Date.parse(req.createdAt);
  return isNaN(parsed) ? 0 : parsed;
};

const getRequestResolvedAtTime = (req: AdminRequest): number => {
  if (req.resolvedAtTimestamp !== undefined && req.resolvedAtTimestamp !== null) {
    return req.resolvedAtTimestamp;
  }
  if (req.resolvedAt) {
    const parsed = Date.parse(req.resolvedAt);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const getArchiveExitTime = (student: ArchivedStudent): number => {
  if (student.exitDateTimestamp !== undefined && student.exitDateTimestamp !== null) {
    return student.exitDateTimestamp;
  }
  const parsed = Date.parse(student.exitDate);
  return isNaN(parsed) ? 0 : parsed;
};

const API_BASE_URL = "https://king-dork-opulently.ngrok-free.dev/api";

const safeFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  try {
    const res = await fetch(url, options);
    if (res.ok) return res;
    if (url.startsWith(API_BASE_URL)) {
      const fallbackUrl = url.replace(API_BASE_URL, '/api');
      console.warn(`Direct fetch to ${url} returned status ${res.status}. Trying secure local custom proxy fallback to ${fallbackUrl}...`);
      const fallbackRes = await fetch(fallbackUrl, options);
      return fallbackRes;
    }
    return res;
  } catch (err) {
    console.warn(`Direct fetch to ${url} failed. Trying secure local custom proxy fallback...`, err);
    if (url.startsWith(API_BASE_URL)) {
      const fallbackUrl = url.replace(API_BASE_URL, '/api');
      return await fetch(fallbackUrl, options);
    }
    throw err;
  }
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserRole | null>(null);
  const [view, setView] = useState<ViewState>(ViewState.LOGIN);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [dorms, setDorms] = useState<Dormitory[]>([]);
  const [requests, setRequests] = useState<AdminRequest[]>([]);
  const [archive, setArchive] = useState<ArchivedStudent[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.dorms) {
        parsed.dorms.forEach((d: any) => {
          if (d.rooms) {
            d.rooms.forEach((rm: any) => {
              if (rm.students) {
                rm.students.forEach((s: any) => {
                  if (s && (s.course === null || s.course === undefined || isNaN(Number(s.course)))) {
                    s.course = 1;
                  } else if (s) {
                    s.course = Number(s.course);
                  }
                });
              }
            });
          }
        });
      }
      if (parsed.requests) {
        parsed.requests.forEach((req: any) => {
          if (req?.student) {
            if (req.student.course === null || req.student.course === undefined || isNaN(Number(req.student.course))) {
              req.student.course = 1;
            } else {
              req.student.course = Number(req.student.course);
            }
          }
        });
      }
      if (parsed.archive) {
        parsed.archive.forEach((s: any) => {
          if (s && (s.course === null || s.course === undefined || isNaN(Number(s.course)))) {
            s.course = 1;
          } else if (s) {
            s.course = Number(s.course);
          }
        });
      }
      setDorms(parsed.dorms);
      setRequests(parsed.requests || []);
      setArchive(parsed.archive || []);
    } else {
      setDorms([
        { id: 1, name: "1-Talabalar turar joyi", totalRooms: 100, rooms: Array.from({length: 100}, (_, i) => ({ number: i + 1, capacity: 4, students: [] })) },
        { id: 2, name: "2-Talabalar turar joyi", totalRooms: 100, rooms: Array.from({length: 100}, (_, i) => ({ number: i + 1, capacity: 4, students: [] })) }
      ]);
    }

    // Persistently sync and load real-time applications from the external applications API
    const loadApps = async () => {
      try {
        const res = await safeFetch(`${API_BASE_URL}/applications`);
        if (!res.ok) {
          throw new Error(`Failed to load applications with status ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success && data.applications) {
          const dbRequests: AdminRequest[] = data.applications.map((app: any) => ({
            id: app.id,
            type: app.type as 'ADD' | 'REMOVE',
            dormId: app.dorm_id,
            roomNumber: app.room_number,
            student: {
              id: app.id,
              hemisId: app.student_id_number,
              fullName: app.full_name,
              course: parseInt(String(app.course).replace(/\D/g, '')) || 1,
              group: app.group_name,
              faculty: app.faculty,
              direction: app.specialty,
              imageUrl: app.image,
              joinedDate: new Date(app.created_at).toLocaleString()
            },
            status: app.status as 'PENDING' | 'APPROVED' | 'REJECTED',
            createdAt: new Date(app.created_at).toLocaleString(),
            createdAtTimestamp: new Date(app.created_at).getTime(),
            resolvedAt: app.resolved_at ? new Date(app.resolved_at).toLocaleString() : undefined,
            resolvedAtTimestamp: app.resolved_at ? new Date(app.resolved_at).getTime() : undefined,
            isReadByAdmin: false
          }));

          setRequests(prev => {
            const merged = [...prev];
            dbRequests.forEach(dbReq => {
              const idx = merged.findIndex(r => r.id === dbReq.id);
              if (idx !== -1) {
                merged[idx] = { 
                  ...merged[idx], 
                  status: dbReq.status, 
                  resolvedAt: dbReq.resolvedAt,
                  resolvedAtTimestamp: dbReq.resolvedAtTimestamp,
                  createdAtTimestamp: dbReq.createdAtTimestamp
                };
              } else {
                merged.unshift(dbReq);
              }
            });
            return merged;
          });
        }
      } catch (err) {
        console.log('Persistence loader failure:', err);
      }
    };
    loadApps();
  }, []);

  useEffect(() => {
    if (dorms.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dorms, requests, archive }));
    }
  }, [dorms, requests, archive]);

  // Admin sahifaga kirganda habarlarni o'qilgan deb belgilash
  useEffect(() => {
    if (view === ViewState.MY_REQUESTS && (currentUser === 'DORM1_ADMIN' || currentUser === 'DORM2_ADMIN')) {
      const dormId = currentUser === 'DORM1_ADMIN' ? 1 : 2;
      setRequests(prev => prev.map(req => 
        (req.dormId === dormId && req.status !== 'PENDING' && !req.isReadByAdmin) 
          ? { ...req, isReadByAdmin: true } 
          : req
      ));
    }
  }, [view, currentUser]);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!selectedRole) return;
    
    if (selectedRole === 'GUEST') {
      setCurrentUser('GUEST');
      setView(ViewState.DASHBOARD);
      return;
    }
    
    if (password === ADMIN_CREDENTIALS[selectedRole]) {
      setCurrentUser(selectedRole);
      if (selectedRole === 'DORM1_ADMIN') setView(ViewState.DORM1);
      else if (selectedRole === 'DORM2_ADMIN') setView(ViewState.DORM2);
      else setView(ViewState.DASHBOARD);
      setPassword('');
    } else {
      setLoginError('Xato parol kiritildi!');
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setView(ViewState.LOGIN);
    setSelectedRole(null);
    setPassword('');
  };

  const getRoleLabel = (role: UserRole) => {
    switch(role) {
      case 'SUPER_ADMIN': return 'SUPER ADMIN';
      case 'DORM1_ADMIN': return 'TTJ1 ADMIN';
      case 'DORM2_ADMIN': return 'TTJ2 ADMIN';
      case 'GUEST': return 'GUEST';
      default: return role;
    }
  };

  const SidebarItem = ({ viewState, icon: Icon, label, badgeCount }: { viewState: ViewState, icon: any, label: string, badgeCount?: number }) => (
    <button 
      onClick={() => setView(viewState)} 
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 ${view === viewState ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'}`}
    >
      <div className="flex items-center space-x-3">
        <Icon size={20} strokeWidth={view === viewState ? 2.5 : 2} />
        <span className={`text-sm ${view === viewState ? 'font-bold' : 'font-medium'}`}>{label}</span>
      </div>
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className={`min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full text-[10px] font-black ${view === viewState ? 'bg-white text-blue-600' : 'bg-rose-500 text-white animate-pulse'}`}>
          {badgeCount}
        </span>
      )}
    </button>
  );

  const getNotificationsCount = () => {
    if (currentUser === 'SUPER_ADMIN') return requests.filter(r => r.status === 'PENDING').length;
    if (currentUser === 'DORM1_ADMIN') return requests.filter(r => r.dormId === 1 && r.status !== 'PENDING' && !r.isReadByAdmin).length;
    if (currentUser === 'DORM2_ADMIN') return requests.filter(r => r.dormId === 2 && r.status !== 'PENDING' && !r.isReadByAdmin).length;
    return 0;
  };

  const myRequests = requests.filter(r => (currentUser === 'DORM1_ADMIN' && r.dormId === 1) || (currentUser === 'DORM2_ADMIN' && r.dormId === 2));
  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const resolvedRequests = requests.filter(r => r.status !== 'PENDING');

  const sortedMyRequests = [...myRequests].sort((a, b) => getRequestCreatedAtTime(b) - getRequestCreatedAtTime(a));
  const sortedPendingRequests = [...pendingRequests].sort((a, b) => getRequestCreatedAtTime(b) - getRequestCreatedAtTime(a));
  const sortedResolvedRequests = [...resolvedRequests].sort((a, b) => {
    const timeA = getRequestResolvedAtTime(a) || getRequestCreatedAtTime(a);
    const timeB = getRequestResolvedAtTime(b) || getRequestCreatedAtTime(b);
    return timeB - timeA;
  });
  const sortedArchive = [...archive].sort((a, b) => getArchiveExitTime(b) - getArchiveExitTime(a));

  if (view === ViewState.LOGIN) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-200 text-center">
          <div className="p-10 bg-blue-600">
            <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 text-white">
              <GraduationCap size={40} />
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter">GDPI TTJ</h1>
            <p className="text-blue-100 text-xs font-bold mt-1 opacity-80 uppercase tracking-widest">Boshqaruv tizimi</p>
          </div>
          
          <form onSubmit={handleLogin} className="p-10 space-y-6 text-left">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Rolingizni tanlang</label>
              <div className="grid grid-cols-2 gap-3">
                {(['SUPER_ADMIN', 'DORM1_ADMIN', 'DORM2_ADMIN', 'GUEST'] as UserRole[]).map(role => (
                  <button 
                    key={role} 
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`p-3 rounded-xl border-2 text-[10px] font-black transition-all ${selectedRole === role ? 'border-blue-600 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                  >
                    {getRoleLabel(role)}
                  </button>
                ))}
              </div>
            </div>

            {selectedRole && selectedRole !== 'GUEST' && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Kirish Paroli</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all font-bold"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
            )}

            {loginError && <p className="text-rose-500 text-[10px] font-black text-center uppercase tracking-widest animate-shake">{loginError}</p>}

            <button 
              type="submit" 
              disabled={!selectedRole || (selectedRole !== 'GUEST' && !password)}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
            >
              TIZIMGA KIRISH
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-xl z-20">
        <div className="p-8 flex items-center space-x-3 text-blue-600">
          <GraduationCap size={32} strokeWidth={2.5}/>
          <h1 className="font-black text-xl tracking-tighter text-slate-800">GDPI <span className="text-[10px] block text-slate-400 font-bold uppercase tracking-widest">Dormitory</span></h1>
        </div>
        <nav className="flex-1 px-4 py-2 space-y-1">
          {(currentUser === 'SUPER_ADMIN' || currentUser === 'GUEST') && <SidebarItem viewState={ViewState.DASHBOARD} icon={LayoutDashboard} label="Statistika" />}
          {(currentUser === 'SUPER_ADMIN' || currentUser === 'GUEST' || currentUser === 'DORM1_ADMIN') && <SidebarItem viewState={ViewState.DORM1} icon={Building2} label="1-TTJ Binosi" />}
          {(currentUser === 'SUPER_ADMIN' || currentUser === 'GUEST' || currentUser === 'DORM2_ADMIN') && <SidebarItem viewState={ViewState.DORM2} icon={Building2} label="2-TTJ Binosi" />}
          
          {currentUser === 'SUPER_ADMIN' && (
            <>
              <div className="my-4 border-t border-slate-100"></div>
              <SidebarItem viewState={ViewState.REQUESTS} icon={Inbox} label="So'rovlar" badgeCount={getNotificationsCount()} />
              <SidebarItem viewState={ViewState.ARCHIVE} icon={History} label="Arxiv" />
            </>
          )}

          {(currentUser === 'DORM1_ADMIN' || currentUser === 'DORM2_ADMIN') && (
            <>
              <div className="my-4 border-t border-slate-100"></div>
              <SidebarItem viewState={ViewState.MY_REQUESTS} icon={MessageSquare} label="Habarlar" badgeCount={getNotificationsCount()} />
            </>
          )}

          <div className="my-4 border-t border-slate-100"></div>
          {/* AI tahlil barcha rollar, jumladan GUEST uchun ham ochiq bo'ldi */}
          <SidebarItem viewState={ViewState.AI_ASSISTANT} icon={Sparkles} label="AI Yordamchi" />
        </nav>
        <div className="p-4">
          <div className="p-4 rounded-2xl mb-4 bg-slate-50 border border-slate-100">
            <p className="text-[10px] text-slate-400 font-black uppercase mb-1">Rol:</p>
            <p className="text-sm font-bold flex items-center gap-2 text-slate-700 uppercase tracking-tight"><ShieldCheck size={16} className="text-blue-600" /> {currentUser ? getRoleLabel(currentUser) : ''}</p>
          </div>
          <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all active:scale-95"><LogOut size={18} /> Chiqish</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-5 flex justify-between items-center z-10">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
            {view === ViewState.DORM1 ? 'DORM1' : view === ViewState.DORM2 ? 'DORM2' : view.replace('_', ' ')}
          </h2>
          <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black tracking-widest border border-blue-100 uppercase">Live Monitoring</div>
        </header>

        <main className="flex-1 overflow-auto p-8">
          {view === ViewState.DASHBOARD && <Dashboard dorms={dorms} isAdmin={currentUser !== 'GUEST'} />}
          {view === ViewState.DORM1 && <RoomGrid rooms={dorms[0].rooms} dormName={dorms[0].name} isGuest={currentUser === 'GUEST'} allDorms={dorms} onUpdateRoom={(num, student, removeId) => {
                const type = removeId ? 'REMOVE' : 'ADD';
                const newRequest: AdminRequest = { id: Math.random().toString(36).substr(2, 9), type, dormId: 1, roomNumber: num, student: student || dorms[0].rooms.find(r => r.number === num)?.students.find(s => s.id === removeId)!, status: 'PENDING', createdAt: new Date().toLocaleString(), createdAtTimestamp: Date.now(), isReadByAdmin: false };
                setRequests(prev => [newRequest, ...prev]);
                notify("So'rov yuborildi!");
          }} />}
          {view === ViewState.DORM2 && <RoomGrid rooms={dorms[1].rooms} dormName={dorms[1].name} isGuest={currentUser === 'GUEST'} allDorms={dorms} onUpdateRoom={(num, student, removeId) => {
                const type = removeId ? 'REMOVE' : 'ADD';
                const newRequest: AdminRequest = { id: Math.random().toString(36).substr(2, 9), type, dormId: 2, roomNumber: num, student: student || dorms[1].rooms.find(r => r.number === num)?.students.find(s => s.id === removeId)!, status: 'PENDING', createdAt: new Date().toLocaleString(), createdAtTimestamp: Date.now(), isReadByAdmin: false };
                setRequests(prev => [newRequest, ...prev]);
                notify("So'rov yuborildi!");
          }} />}
          
          {view === ViewState.MY_REQUESTS && (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Mening Habarlarim</h3>
              </div>
              {sortedMyRequests.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center">
                  <Mail size={48} className="mx-auto text-slate-200 mb-4" />
                  <p className="text-slate-400 font-medium">Hozircha habarlar yo'q</p>
                </div>
              ) : (
                sortedMyRequests.map(req => (
                  <div key={req.id} className={`bg-white p-6 rounded-3xl shadow-sm border transition-all hover:shadow-md ${req.status === 'APPROVED' ? 'border-emerald-100' : req.status === 'REJECTED' ? 'border-rose-100' : 'border-slate-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : req.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>
                          <MessageSquare size={24} />
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-lg uppercase tracking-tight">{req.student.fullName}</p>
                          <p className="text-[11px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                            {req.roomNumber}-Xona • {req.type === 'ADD' ? 'KIRISH ARIZASI' : 'CHIQISH ARIZASI'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${
                          req.status === 'APPROVED' ? 'bg-emerald-500 text-white border-emerald-400' : 
                          req.status === 'REJECTED' ? 'bg-rose-500 text-white border-rose-400' : 
                          'bg-amber-400 text-white border-amber-300'
                        }`}>
                          {req.status === 'APPROVED' ? 'TASDIQLANDI' : req.status === 'REJECTED' ? 'RAD ETILDI' : 'KUTILMOQDA'}
                        </span>
                        {req.resolvedAt && (
                          <div className="flex items-center gap-3 text-slate-400 font-bold text-[9px] uppercase tracking-wider">
                            <span className="flex items-center gap-1"><Calendar size={12} /> {req.resolvedAt.split(',')[0]}</span>
                            <span className="flex items-center gap-1"><Clock size={12} /> {req.resolvedAt.split(',')[1]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {view === ViewState.REQUESTS && (
            <div className="max-w-4xl mx-auto space-y-12">
               <section className="space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 flex justify-between items-center">
                    <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight"><Inbox size={20} className="text-blue-600"/> Kutilayotgan arizalar ({sortedPendingRequests.length})</h3>
                  </div>
                  {sortedPendingRequests.map(req => (
                    <div key={req.id} className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <img src={req.student.imageUrl} className="w-14 h-14 rounded-2xl object-cover border border-slate-200"/>
                          <div className="text-left">
                            <h4 className="font-black text-slate-800">{req.student.fullName}</h4>
                            <p className="text-[10px] text-blue-600 font-black uppercase">{req.dormId}-TTJ • {req.roomNumber}-XONA • {req.type === 'ADD' ? 'KIRISH' : 'CHIQISH'}</p>
                            <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase">Yuborildi: {req.createdAt}</p>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button onClick={async () => {
                              // Reject application
                              try {
                                const response = await safeFetch(`${API_BASE_URL}/applications/${req.id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'REJECTED' })
                                });
                                if (!response.ok) {
                                  throw new Error("Failed to update status");
                                }
                              } catch (err) {
                                console.error("Status PUT rejected failed:", err);
                              }
                              setRequests(prev => prev.map(r => r.id === req.id ? {...r, status: 'REJECTED', resolvedAt: new Date().toLocaleString(), resolvedAtTimestamp: Date.now(), isReadByAdmin: false} : r));
                              notify("Rad etildi!");
                          }} className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-600 rounded-2xl hover:bg-red-600 hover:text-white transition-all"><XCircle size={24}/></button>
                          
                          <button onClick={async () => {
                              // Approve application
                              try {
                                const response = await safeFetch(`${API_BASE_URL}/applications/${req.id}/status`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ status: 'APPROVED' })
                                });
                                if (!response.ok) {
                                  throw new Error("Failed to update status");
                                }
                              } catch (err) {
                                console.error("Status PUT approved failed:", err);
                              }
                              setDorms(ds => ds.map(d => d.id === req.dormId ? {...d, rooms: d.rooms.map(rm => rm.number === req.roomNumber ? {...rm, students: req.type === 'ADD' ? [...rm.students, req.student] : rm.students.filter(s => s.id !== req.student.id)} : rm)} : d));
                              setRequests(prev => prev.map(r => r.id === req.id ? {...r, status: 'APPROVED', resolvedAt: new Date().toLocaleString(), resolvedAtTimestamp: Date.now(), isReadByAdmin: false} : r));
                              if (req.type === 'REMOVE') {
                                setArchive(prev => [{...req.student, exitDate: new Date().toLocaleString(), exitDateTimestamp: Date.now(), dormName: dorms.find(d => d.id === req.dormId)?.name || ''}, ...prev]);
                              }
                              notify("Bajarildi!");
                          }} className="w-12 h-12 flex items-center justify-center bg-blue-600 text-white rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all"><CheckCircle size={24}/></button>
                        </div>
                    </div>
                  ))}
               </section>

               <section className="space-y-6">
                  <div className="bg-slate-100/50 p-6 rounded-3xl border border-slate-200 flex justify-between items-center">
                    <h3 className="font-black text-slate-500 flex items-center gap-2 uppercase tracking-tight"><History size={20}/> Tarix</h3>
                  </div>
                  <div className="space-y-3">
                    {sortedResolvedRequests.map(req => (
                      <div key={req.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between hover:shadow-md transition-shadow">
                          <div className="text-left">
                            <p className="font-black text-slate-800 uppercase tracking-tight">{req.student.fullName}</p>
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">
                              {req.dormId}-TTJ • {req.roomNumber}-XONA • {req.type === 'ADD' ? 'Kirish' : 'Chiqish'}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${req.status === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {req.status === 'APPROVED' ? 'TASDIQLANGAN' : 'RAD ETILGAN'}
                              </span>
                              <div className="flex items-center gap-1.5 text-slate-400">
                                 <Calendar size={10} />
                                 <p className="text-[9px] font-bold">{req.resolvedAt?.split(',')[0]}</p>
                                 <Clock size={10} className="ml-1" />
                                 <p className="text-[9px] font-bold">{req.resolvedAt?.split(',')[1]}</p>
                              </div>
                            </div>
                            <button 
                              onClick={async () => {
                                if (confirm("Ushbu arizani tarixdan o'chirmoqchimisiz?")) {
                                  try {
                                    const response = await safeFetch(`${API_BASE_URL}/applications/${req.id}`, {
                                      method: 'DELETE'
                                    });
                                    if (response.ok || response.status === 204) {
                                      setRequests(prev => prev.filter(r => r.id !== req.id));
                                      notify("Ariza tarixdan o'chirildi!");
                                    } else {
                                      throw new Error("Failed to delete application");
                                    }
                                  } catch (err) {
                                    console.error("Error deleting application:", err);
                                    notify("Xatolik yuz berdi!");
                                  }
                                }
                              }} 
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                              title="Tarixdan o'chirish"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                      </div>
                    ))}
                  </div>
               </section>
            </div>
          )}

          {view === ViewState.ARCHIVE && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    <History size={24} className="text-blue-600" /> ARXIV BAZASI
                  </h3>
                  <div className="px-4 py-2 bg-slate-50 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100">
                    Jami: {sortedArchive.length} talaba
                  </div>
                </div>

                <div className="overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-y border-slate-100">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Talaba</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Fakultet / Yo'nalish</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Bino</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Kirish/Chiqish Sanasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedArchive.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium font-bold">Arxiv hozircha bo'sh</td>
                        </tr>
                      ) : (
                        sortedArchive.map((s, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-sm border border-blue-100">
                                  {s.fullName.charAt(0)}
                                </div>
                                <p className="font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{s.fullName}</p>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-800 uppercase leading-tight">{s.faculty}</span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{s.direction}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <Building2 size={14} className="text-slate-300" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase">{s.dormName.replace('Talabalar turar joyi', 'TTJ')}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100">
                                  <span className="text-[8px] font-black">IN:</span>
                                  <span className="text-[9px] font-bold">{s.joinedDate}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md border border-rose-100">
                                  <span className="text-[8px] font-black">OUT:</span>
                                  <span className="text-[9px] font-bold">{s.exitDate}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {view === ViewState.AI_ASSISTANT && <Assistant dorms={dorms} />}
        </main>
      </div>

      {showToast && (
        <div className="fixed bottom-10 right-10 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-10 flex items-center gap-2">
          <CheckCircle size={18} className="text-emerald-400" />
          <span className="font-bold text-sm uppercase tracking-tight">{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default App;