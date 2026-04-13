import React, { useState, useEffect, useMemo } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  query, 
  where, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  writeBatch,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { Client, MonthlyStatus, StatusValue, MONTHS, Period } from './types';
import { getDocFromServer, doc as firestoreDoc } from 'firebase/firestore';
import { 
  LayoutDashboard, 
  UserPlus, 
  LogOut, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Circle, 
  ChevronDown, 
  Filter,
  ExternalLink,
  Calendar,
  Menu,
  Mail,
  LineChart,
  Lock,
  ArrowRightCircle,
  AlertTriangle,
  Pencil,
  Trash2,
  X,
  Printer,
  FolderOpen,
  Building2,
  FileText,
  Globe,
  User as UserIcon,
  ClipboardCheck,
  Share,
  Reply,
  CircleDot,
  Plus,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Error handling helper
const handleFirestoreError = (error: any, operation: string, path: string) => {
  const errInfo = {
    error: error.message,
    operation,
    path,
    auth: auth.currentUser?.email
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'register'>('dashboard');
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyStatus[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-indexed
  
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isFilesModalOpen, setIsFilesModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [allYearData, setAllYearData] = useState<MonthlyStatus[]>([]);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDangerous?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Clients Listener
  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'clients'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
      setClients(clientsData);
    }, (error) => handleFirestoreError(error, 'LIST', 'clients'));
    
    return () => unsubscribe();
  }, [user]);

  // Monthly Data Listener
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'monthly_status'), 
      where('year', '==', currentYear),
      where('month', '==', currentMonth)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyStatus));
      setMonthlyData(data);
    }, (error) => handleFirestoreError(error, 'LIST', 'monthly_status'));
    
    return () => unsubscribe();
  }, [user, currentYear, currentMonth]);

  // All Year Data Listener for Reports
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'monthly_status'), 
      where('year', '==', currentYear)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MonthlyStatus));
      setAllYearData(data);
    }, (error) => handleFirestoreError(error, 'LIST_YEAR', 'monthly_status'));
    
    return () => unsubscribe();
  }, [user, currentYear]);

  // Periods Listener
  useEffect(() => {
    if (!user) return;
    
    const unsubscribe = onSnapshot(collection(db, 'periods'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Period));
      setPeriods(data);
    }, (error) => handleFirestoreError(error, 'LIST', 'periods'));
    
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      // Map username to an internal email format for Firebase Auth if it's not already an email
      const username = loginForm.username.trim().toLowerCase();
      const email = username.includes('@') ? username : `${username}@csk.local`;
      
      console.log('Tentando autenticação para:', email);
      await signInWithEmailAndPassword(auth, email, loginForm.password);
    } catch (error: any) {
      console.error('Login error:', error);
      const errorCode = error.code || 'unknown';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError(`Usuário ou senha incorretos. (Erro: ${errorCode})`);
      } else if (error.code === 'auth/invalid-email') {
        setLoginError(`Formato de usuário inválido. (Erro: ${errorCode})`);
      } else {
        setLoginError(`Erro ao realizar login: ${error.message} (Erro: ${errorCode})`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = () => signOut(auth);

  const isPeriodClosed = () => {
    const periodId = `${currentYear}_${currentMonth}`;
    return periods.find(p => p.id === periodId)?.closed || false;
  };

  const toggleStatus = async (clientId: string, field: keyof MonthlyStatus, currentValue: StatusValue) => {
    if (!user || isPeriodClosed()) return;
    
    const statusId = `${clientId}_${currentYear}_${currentMonth}`;
    let nextValue: StatusValue;
    
    if (field === 'debitos') {
      nextValue = currentValue === 'attention' ? 'pending' : 'attention';
    } else {
      nextValue = currentValue === 'yes' ? 'no' : currentValue === 'no' ? 'pending' : 'yes';
    }
    
    const docRef = doc(db, 'monthly_status', statusId);
    const existing = monthlyData.find(d => d.id === statusId);
    
    try {
      if (existing) {
        await updateDoc(docRef, { [field]: nextValue });
      } else {
        await setDoc(docRef, {
          clientId,
          year: currentYear,
          month: currentMonth,
          movi: 'pending',
          servPrest: 'pending',
          servTomad: 'pending',
          pisCofins: 'pending',
          irpjCsll: 'pending',
          iss: 'pending',
          debitos: 'pending',
          [field]: nextValue
        });
      }
    } catch (error) {
      handleFirestoreError(error, 'WRITE', `monthly_status/${statusId}`);
    }
  };

  const deleteClientPermanently = (client: Client) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Empresa Permanentemente',
      message: `ATENÇÃO: Esta ação é TOTAL e IRREVERSÍVEL.\n\nA empresa "${client.name}" e TODO o histórico de todos os meses serão apagados para sempre.\n\nUse esta opção apenas se cadastrou a empresa por erro. Se a empresa apenas encerrou o contrato, use a exclusão mensal.\n\nDeseja continuar?`,
      isDangerous: true,
      onConfirm: async () => {
        try {
          const batch = writeBatch(db);
          const statusQuery = query(collection(db, 'monthly_status'), where('clientId', '==', client.id));
          const statusSnapshot = await getDocs(statusQuery);
          statusSnapshot.docs.forEach(doc => batch.delete(doc.ref));
          batch.delete(doc(db, 'clients', client.id));
          await batch.commit();
          
          if (editingClient?.id === client.id) {
            setEditingClient(null);
            setView('dashboard');
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, 'DELETE_CLIENT_FULL', `clients/${client.id}`);
        }
      }
    });
  };

  const deleteFromCurrentMonth = (client: Client) => {
    setConfirmModal({
      isOpen: true,
      title: 'Excluir do Período Atual',
      message: `Deseja excluir a empresa "${client.name}" apenas do mês de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(currentYear, currentMonth))}?\n\nIsso NÃO apagará o histórico dos meses anteriores. A empresa também deixará de aparecer nos meses futuros até que seja reativada.`,
      isDangerous: true,
      onConfirm: async () => {
        try {
          const statusId = `${client.id}_${currentYear}_${currentMonth}`;
          await setDoc(doc(db, 'monthly_status', statusId), {
            clientId: client.id,
            year: currentYear,
            month: currentMonth,
            hidden: true
          }, { merge: true });
          
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          handleFirestoreError(error, 'DELETE_MONTHLY', `monthly_status/${client.id}_${currentYear}_${currentMonth}`);
        }
      }
    });
  };

  const closeMonthAndCarryOver = async () => {
    const periodId = `${currentYear}_${currentMonth}`;
    
    try {
      // Mark period as closed
      await setDoc(doc(db, 'periods', periodId), { closed: true });

      const nextMonth = (currentMonth + 1) % 12;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;

      // 1. Get current month's status fresh to check for hidden clients
      const currentMonthQuery = query(
        collection(db, 'monthly_status'),
        where('year', '==', currentYear),
        where('month', '==', currentMonth)
      );
      const currentMonthSnapshot = await getDocs(currentMonthQuery);
      const hiddenClientIds = new Set(
        currentMonthSnapshot.docs
          .filter(doc => doc.data().hidden === true)
          .map(doc => doc.data().clientId)
      );

      // 2. Get all status for next month to check existence
      const nextMonthQuery = query(
        collection(db, 'monthly_status'),
        where('year', '==', nextYear),
        where('month', '==', nextMonth)
      );
      const nextMonthSnapshot = await getDocs(nextMonthQuery);
      const existingNextStatusIds = new Set(nextMonthSnapshot.docs.map(doc => doc.id));

      // 3. Replicate clients to next month
      for (const client of clients) {
        // Skip if client is inactive OR hidden in the current month
        if (client.active === false || hiddenClientIds.has(client.id)) continue;

        const startVal = client.startYear * 12 + client.startMonth;
        const nextVal = nextYear * 12 + nextMonth;
        
        if (nextVal >= startVal) {
          const newStatusId = `${client.id}_${nextYear}_${nextMonth}`;
          
          // Only create if it doesn't exist in the next month
          if (!existingNextStatusIds.has(newStatusId)) {
            await setDoc(doc(db, 'monthly_status', newStatusId), {
              clientId: client.id,
              year: nextYear,
              month: nextMonth,
              movi: 'pending',
              servPrest: 'pending',
              servTomad: 'pending',
              pisCofins: 'pending',
              irpjCsll: 'pending',
              iss: 'pending',
              debitos: 'pending'
            });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, 'CLOSE_MONTH', 'periods');
    }
  };

  const reopenMonth = async () => {
    const periodId = `${currentYear}_${currentMonth}`;
    
    try {
      await setDoc(doc(db, 'periods', periodId), { closed: false });
    } catch (error) {
      handleFirestoreError(error, 'REOPEN_MONTH', 'periods');
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const foundStatus = monthlyData.find(d => d.clientId === c.id);
      
      // If client is hidden for this month, filter it out
      if (foundStatus?.hidden === true) return false;

      // If client is inactive and has no record for this month, hide it
      if (c.active === false && !foundStatus) return false;

      const startVal = c.startYear * 12 + c.startMonth;
      const currentVal = currentYear * 12 + currentMonth;
      if (currentVal < startVal) return false;

      const currentStatus = {
        movi: foundStatus?.movi || 'pending',
        servPrest: foundStatus?.servPrest || 'pending',
        servTomad: foundStatus?.servTomad || 'pending',
        pisCofins: foundStatus?.pisCofins || 'pending',
        irpjCsll: foundStatus?.irpjCsll || 'pending',
        iss: foundStatus?.iss || 'pending',
        debitos: foundStatus?.debitos || 'pending'
      };

      const matches = (field: string, value: string) => {
        if (!filters[field] || filters[field].length === 0) return true;
        return filters[field].includes(value);
      };

      return (
        matches('name', c.name) &&
        matches('cnpj', c.cnpj) &&
        matches('ccm', c.ccm || 'N/A') &&
        matches('city', c.city) &&
        matches('accessType', c.accessType || 'N/A') &&
        matches('login', c.login || 'N/A') &&
        matches('password', c.password || 'N/A') &&
        matches('movi', currentStatus.movi) &&
        matches('servPrest', currentStatus.servPrest) &&
        matches('servTomad', currentStatus.servTomad) &&
        matches('pisCofins', currentStatus.pisCofins) &&
        matches('irpjCsll', currentStatus.irpjCsll) &&
        matches('iss', currentStatus.iss) &&
        matches('debitos', currentStatus.debitos)
      );
    });
  }, [clients, filters, currentYear, currentMonth, monthlyData]);

  const getUniqueValues = (field: string) => {
    if (['movi', 'servPrest', 'servTomad', 'pisCofins', 'irpjCsll', 'iss', 'debitos'].includes(field)) {
      if (field === 'debitos') return ['pending', 'attention'];
      return ['yes', 'no', 'pending'];
    }
    const values = clients.map(c => (c as any)[field] || 'N/A');
    return Array.from(new Set(values)).sort();
  };

  const toggleFilterValue = (field: string, value: string) => {
    setFilters(prev => {
      if (value === '') {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      const current = prev[field] || [];
      const next = current.includes(value) 
        ? current.filter(v => v !== value) 
        : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  if (loading) return <div className="min-h-screen bg-[#0f1115] flex items-center justify-center text-white">Carregando...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 w-full max-w-[400px]"
        >
          <div className="bg-gradient-to-br from-[#1a1c23] to-[#0f1115] p-10 rounded-[40px] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
            <div className="flex flex-col items-center mb-10">
              <motion.div 
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mb-6 shadow-[0_10px_20px_rgba(37,99,235,0.3)]"
              >
                <Lock className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Gestão de Tributos</h1>
              <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-medium">Acesso Restrito</p>
            </div>
            
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Usuário</label>
                <div className="relative">
                  <input 
                    required
                    type="text"
                    value={loginForm.username}
                    onChange={e => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Nome de usuário"
                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 px-5 text-sm text-white placeholder:text-gray-700 focus:border-blue-500/50 focus:bg-black/40 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative">
                  <input 
                    required
                    type="password"
                    value={loginForm.password}
                    onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full bg-black/20 border border-white/5 rounded-2xl py-4 px-5 text-sm text-white placeholder:text-gray-700 focus:border-blue-500/50 focus:bg-black/40 outline-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]"
                  />
                </div>
              </div>

              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-red-500/80 text-[11px] font-bold flex items-center gap-3"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {loginError}
                </motion.div>
              )}

              <div className="pt-4 flex justify-center">
                <button 
                  type="submit"
                  disabled={isLoggingIn}
                  className="relative group overflow-hidden px-10 py-3.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white rounded-full text-xs font-bold tracking-widest uppercase transition-all shadow-[0_10px_20px_rgba(37,99,235,0.2)] hover:shadow-[0_15px_30px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300" />
                  <span className="relative flex items-center gap-2">
                    {isLoggingIn ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Entrar
                        <ArrowRightCircle className="w-4 h-4" />
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>
          </div>
          
          <p className="mt-8 text-center text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em]">
            © {new Date().getFullYear()} CSK Corporativo
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1115] text-gray-200 font-sans selection:bg-blue-500/30">
      {/* Sidebar / Top Nav */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-[#1a1c23] border-b border-white/5 flex items-center justify-between px-6 z-50 shadow-lg">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6 text-white" />
            </button>
            <div className="flex items-center gap-4 ml-4">
              <button 
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center group relative"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#252833] to-[#0f1115] flex items-center justify-center z-10 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_4px_10px_rgba(0,0,0,0.3)] transition-all group-hover:scale-110 group-hover:-translate-y-1">
                  <LineChart className="w-5 h-5 text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110" />
                </div>
                <div className="bg-gradient-to-b from-[#1a1c23] to-[#0f1115] h-8 flex items-center pl-8 pr-5 rounded-full -ml-6 border border-white/5 text-[10px] font-black tracking-widest text-white uppercase shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] group-hover:from-blue-600 group-hover:to-blue-800 transition-all">
                  Relatório
                </div>
              </button>

              <button 
                onClick={() => setIsEmailModalOpen(true)}
                className="flex items-center group relative"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#252833] to-[#0f1115] flex items-center justify-center z-10 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_4px_10px_rgba(0,0,0,0.3)] transition-all group-hover:scale-110 group-hover:-translate-y-1">
                  <Mail className="w-5 h-5 text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110" />
                </div>
                <div className="bg-gradient-to-b from-[#1a1c23] to-[#0f1115] h-8 flex items-center pl-8 pr-5 rounded-full -ml-6 border border-white/5 text-[10px] font-black tracking-widest text-white uppercase shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] group-hover:from-blue-600 group-hover:to-blue-800 transition-all">
                  E-mail
                </div>
              </button>

              <button 
                onClick={() => setIsFilesModalOpen(true)}
                className="flex items-center group relative"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-b from-[#252833] to-[#0f1115] flex items-center justify-center z-10 shadow-[inset_0_2px_6px_rgba(0,0,0,0.8),0_4px_10px_rgba(0,0,0,0.3)] transition-all group-hover:scale-110 group-hover:-translate-y-1">
                  <FolderOpen className="w-5 h-5 text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-110" />
                </div>
                <div className="bg-gradient-to-b from-[#1a1c23] to-[#0f1115] h-8 flex items-center pl-8 pr-5 rounded-full -ml-6 border border-white/5 text-[10px] font-black tracking-widest text-white uppercase shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)] group-hover:from-blue-600 group-hover:to-blue-800 transition-all">
                  Arquivos
                </div>
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-[#0f1115] p-1 ml-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]" style={{ width: '224.5px', borderRadius: '30px' }}>
            <button 
              onClick={() => setView('dashboard')}
              className={`flex items-center justify-center gap-2 transition-all text-xs font-bold group ${view === 'dashboard' ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_4px_8px_rgba(0,0,0,0.4)]' : 'hover:bg-white/5 text-gray-400'}`}
              style={{ width: '100.7344px', height: '29px', borderRadius: '36px' }}
            >
              <LayoutDashboard className="w-4 h-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-125 group-hover:-translate-y-0.5" />
              <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Painel</span>
            </button>
            <button 
              onClick={() => setView('register')}
              className={`flex items-center justify-center gap-2 transition-all text-xs font-bold group ${view === 'register' ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_4px_8px_rgba(0,0,0,0.4)]' : 'hover:bg-white/5 text-gray-400'}`}
              style={{ width: '117.766px', height: '29px', borderRadius: '27px' }}
            >
              <UserPlus className="w-4 h-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-transform group-hover:scale-125 group-hover:-translate-y-0.5" />
              <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Cadastro</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-b from-[#1a1c23] to-[#0f1115] rounded-full border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
            {(() => {
              const part = user.displayName || user.email?.split('@')[0] || '';
              const firstName = part.split('.')[0];
              const friendlyName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
              return (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
                    {friendlyName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">
                    {friendlyName}
                  </span>
                </>
              );
            })()}
            <button onClick={logout} className="p-1 hover:opacity-80 transition-all">
              <LogOut className="w-4 h-4 text-[#f6001d] drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]" />
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed top-0 left-0 bottom-0 w-[300px] bg-[#1a1c23] border-r border-white/10 z-[70] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6 text-blue-500" />
                  Período
                </h2>
                <button onClick={() => setIsSidebarOpen(false)} className="text-gray-500 hover:text-white">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ano</label>
                  <div className="flex items-center justify-between bg-[#0f1115] p-3 rounded-xl border border-white/5">
                    <button onClick={() => setCurrentYear(y => y - 1)} className="p-1 hover:bg-white/5 rounded"><ChevronDown className="w-4 h-4 rotate-90" /></button>
                    <span className="text-lg font-bold text-white">{currentYear}</span>
                    <button onClick={() => setCurrentYear(y => y + 1)} className="p-1 hover:bg-white/5 rounded"><ChevronDown className="w-4 h-4 -rotate-90" /></button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Mês</label>
                  <div className="grid grid-cols-1 gap-1">
                    {MONTHS.map((m, i) => {
                      // A month is accessible if:
                      // 1. It already has data
                      // 2. OR it is the month immediately following a closed month
                      // 3. OR it is the current month being viewed
                      
                      const hasData = monthlyData.some(d => d.year === currentYear && d.month === i);
                      
                      const prevMonth = i === 0 ? 11 : i - 1;
                      const prevYear = i === 0 ? currentYear - 1 : currentYear;
                      const prevPeriodId = `${prevYear}_${prevMonth}`;
                      const prevClosed = periods.find(p => p.id === prevPeriodId)?.closed;
                      
                      const isAccessible = hasData || prevClosed || (i === 0 && currentYear === new Date().getFullYear());
                      
                      return (
                        <button 
                          key={m}
                          disabled={!isAccessible}
                          onClick={() => {
                            if (isAccessible) {
                              setCurrentMonth(i);
                              setIsSidebarOpen(false);
                            }
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all group ${currentMonth === i ? 'bg-blue-600 text-white shadow-lg' : isAccessible ? 'hover:bg-white/5 text-gray-400' : 'text-gray-700 cursor-not-allowed'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="transition-transform group-hover:translate-x-1">{m}</span>
                            {!isAccessible && <Lock className="w-3 h-3 transition-transform group-hover:scale-125 group-hover:-translate-y-0.5" />}
                            {periods.find(p => p.id === `${currentYear}_${i}`)?.closed && <CheckCircle2 className="w-3 h-3 text-green-500 transition-transform group-hover:scale-125 group-hover:-translate-y-0.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="pt-24 pb-12 px-6 max-w-[1800px] mx-auto">
        <AnimatePresence mode="wait">
          {view === 'dashboard' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Dashboard Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-blue-400">
                    <span className="text-sm font-bold tracking-widest uppercase">Período de Apuração</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <h1 className="text-7xl font-black text-white italic tracking-tighter uppercase drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] flex items-center gap-4">
                      <Calendar className="w-12 h-12 text-gray-400" />
                      {MONTHS[currentMonth]} <span className="text-blue-500 opacity-80">{currentYear}</span>
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {isPeriodClosed() ? (
                    <button 
                      onClick={reopenMonth}
                      className="px-4 py-2 bg-amber-600/10 hover:bg-amber-600/20 text-amber-500 border border-amber-600/20 rounded-[36px] text-xs font-bold transition-all flex items-center gap-2 group"
                    >
                      <Lock className="w-4 h-4 transition-transform group-hover:scale-125 group-hover:-translate-y-1" />
                      REABRIR MÊS
                    </button>
                  ) : (
                    <button 
                      onClick={closeMonthAndCarryOver}
                      className="px-4 py-2 bg-green-600/10 hover:bg-green-600/20 text-green-500 border border-green-600/20 rounded-[36px] text-xs font-bold transition-all flex items-center gap-2 group"
                    >
                      <ArrowRightCircle className="w-4 h-4 transition-transform group-hover:scale-125 group-hover:-translate-y-1" />
                      FECHAR MÊS
                    </button>
                  )}
                </div>
              </div>

              {/* Data Grid */}
              <div className="bg-white shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#252833] text-[11px] font-bold uppercase tracking-wider text-gray-400 border-b border-white/5">
                        <FilterHeader label="EMPRESA" field="name" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} icon={Building2} iconColor="#50d2ff" />
                        <FilterHeader label="CNPJ" field="cnpj" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} icon={FileText} iconColor="#ffffff" />
                        <FilterHeader label="CCM" field="ccm" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} icon={FileText} iconColor="#ffffff" />
                        <FilterHeader label="MUNICÍPIO" field="city" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} icon={Building2} iconColor="#ffa050" />
                        <FilterHeader label="ACESSO" field="accessType" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} icon={Globe} iconColor="#50d2ff" />
                        <FilterHeader label="LOGIN" field="login" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} icon={UserIcon} iconColor="#507cff" />
                        <FilterHeader label="SENHA" field="password" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} icon={Lock} iconColor="#10a5c6" />
                        
                        <FilterHeader label="MOVI" field="movi" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} center icon={ClipboardCheck} iconColor="#50ffa9" />
                        <FilterHeader label="SERV.PREST" field="servPrest" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} center icon={Share} iconColor="#57ff50" />
                        <FilterHeader label="SERV.TOMAD" field="servTomad" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} center icon={Reply} iconColor="#ff5050" />
                        <FilterHeader label="PIS/COFINS" field="pisCofins" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} center icon={CircleDot} iconColor="#ffb350" />
                        <FilterHeader label="IRPJ/CSLL" field="irpjCsll" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} center icon={CircleDot} iconColor="#5066ff" />
                        <FilterHeader label="ISS" field="iss" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} center icon={CircleDot} iconColor="#c050ff" />
                        <FilterHeader label="DÉBITOS" field="debitos" activeFilter={activeFilter} setActiveFilter={setActiveFilter} getUniqueValues={getUniqueValues} filters={filters} toggleFilterValue={toggleFilterValue} center icon={AlertTriangle} iconColor="#fffd50" />
                        
                        <th className="p-4 bg-[#252833] border-l border-white/5">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredClients.map((client, idx) => {
                        const foundStatus = monthlyData.find(d => d.clientId === client.id);
                        const status = {
                          movi: foundStatus?.movi || 'pending',
                          servPrest: foundStatus?.servPrest || 'pending',
                          servTomad: foundStatus?.servTomad || 'pending',
                          pisCofins: foundStatus?.pisCofins || 'pending',
                          irpjCsll: foundStatus?.irpjCsll || 'pending',
                          iss: foundStatus?.iss || 'pending',
                          debitos: foundStatus?.debitos || 'pending'
                        };

                        const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                        return (
                          <tr key={client.id} className={`hover:bg-blue-50 transition-colors ${rowBg} whitespace-nowrap`}>
                            <td 
                              className={`p-4 font-bold text-gray-900 sticky left-0 z-10 border-r border-gray-100 ${rowBg}`}
                            >
                              {client.name}
                            </td>
                            <td className="p-4 font-mono text-xs text-gray-600">{client.cnpj}</td>
                            <td className="p-4 text-xs text-gray-600">{client.ccm}</td>
                            <td className="p-4 text-xs text-gray-600">{client.city}</td>
                            <td className="p-4">
                              {client.accessLink ? (
                                <a 
                                  href={client.accessLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline flex items-center gap-1 text-xs font-bold"
                                >
                                  {client.accessType}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-gray-500">{client.accessType}</span>
                              )}
                            </td>
                            <td className="p-4 font-mono text-xs text-gray-600">{client.login}</td>
                            <td className="p-4 font-mono text-xs text-gray-600">{client.password}</td>
                            
                            {/* Status Cells */}
                            <StatusCell 
                              value={status.movi} 
                              onClick={() => toggleStatus(client.id, 'movi', status.movi)} 
                              disabled={isPeriodClosed()}
                            />
                            <StatusCell 
                              value={status.servPrest} 
                              onClick={() => toggleStatus(client.id, 'servPrest', status.servPrest)} 
                              disabled={isPeriodClosed()}
                            />
                            <StatusCell 
                              value={status.servTomad} 
                              onClick={() => toggleStatus(client.id, 'servTomad', status.servTomad)} 
                              disabled={isPeriodClosed()}
                            />
                            <StatusCell 
                              value={status.pisCofins} 
                              onClick={() => toggleStatus(client.id, 'pisCofins', status.pisCofins)} 
                              disabled={isPeriodClosed()}
                            />
                            <StatusCell 
                              value={status.irpjCsll} 
                              onClick={() => toggleStatus(client.id, 'irpjCsll', status.irpjCsll)} 
                              disabled={isPeriodClosed()}
                            />
                            <StatusCell 
                              value={status.iss} 
                              onClick={() => toggleStatus(client.id, 'iss', status.iss)} 
                              disabled={isPeriodClosed()}
                            />
                            <StatusCell 
                              value={status.debitos} 
                              onClick={() => toggleStatus(client.id, 'debitos', status.debitos)} 
                              disabled={isPeriodClosed()}
                              allowAttention
                            />
                            <td className="p-4 border-l border-gray-100 bg-inherit">
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    setEditingClient(client);
                                    setView('register');
                                  }}
                                  disabled={isPeriodClosed()}
                                  className={`p-2 rounded-lg transition-colors ${isPeriodClosed() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-50 text-blue-600'}`}
                                  title={isPeriodClosed() ? "Mês Bloqueado" : "Editar Cliente"}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteFromCurrentMonth(client)}
                                  disabled={isPeriodClosed()}
                                  className={`p-2 rounded-lg transition-colors ${isPeriodClosed() ? 'opacity-30 cursor-not-allowed' : 'hover:bg-red-50 text-red-600'}`}
                                  title={isPeriodClosed() ? "Mês Bloqueado" : "Excluir deste Mês"}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <RegistrationView 
              client={editingClient} 
              onComplete={() => {
                setEditingClient(null);
                setView('dashboard');
              }} 
              onDelete={deleteClientPermanently}
              isLocked={isPeriodClosed()}
            />
          )}
        </AnimatePresence>
      </main>

      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        isDangerous={confirmModal.isDangerous}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      <ReportModal 
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        clients={clients}
        allYearData={allYearData}
        year={currentYear}
      />

      <AnimatePresence>
        {isFilesModalOpen && (
          <MultiFileMoveModal onClose={() => setIsFilesModalOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isEmailModalOpen && (
          <BatchEmailModal onClose={() => setIsEmailModalOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

interface EmailAttachment {
  id: string;
  path: string;
  status: 'pending' | 'found' | 'not_found';
}

interface EmailBatchItem {
  id: string;
  clientName: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  imagePath: string;
  attachments: EmailAttachment[];
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}

function BatchEmailModal({ onClose }: { onClose: () => void }) {
  const [emails, setEmails] = useState<EmailBatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addClientCard = () => {
    const newEmail: EmailBatchItem = {
      id: Math.random().toString(36).substr(2, 9),
      clientName: '',
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: '',
      imagePath: '',
      attachments: [],
      status: 'pending'
    };
    setEmails(prev => [...prev, newEmail]);
  };

  const removeClientCard = (id: string) => {
    setEmails(prev => prev.filter(e => e.id !== id));
  };

  const updateEmailField = (id: string, field: keyof EmailBatchItem, value: any) => {
    setEmails(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };

  const addAttachment = (emailId: string) => {
    setEmails(prev => prev.map(e => {
      if (e.id === emailId) {
        const newAttachment: EmailAttachment = {
          id: Math.random().toString(36).substr(2, 9),
          path: '',
          status: 'pending'
        };
        return { ...e, attachments: [...e.attachments, newAttachment] };
      }
      return e;
    }));
  };

  const removeAttachment = (emailId: string, attachmentId: string) => {
    setEmails(prev => prev.map(e => {
      if (e.id === emailId) {
        return { ...e, attachments: e.attachments.filter(a => a.id !== attachmentId) };
      }
      return e;
    }));
  };

  const updateAttachmentPath = (emailId: string, attachmentId: string, path: string) => {
    setEmails(prev => prev.map(e => {
      if (e.id === emailId) {
        return {
          ...e,
          attachments: e.attachments.map(a => a.id === attachmentId ? { ...a, path, status: 'pending' } : a)
        };
      }
      return e;
    }));
  };

  const validateAttachments = async () => {
    const allPaths: string[] = [];
    emails.forEach(e => {
      e.attachments.forEach(a => {
        if (a.path) allPaths.push(a.path);
      });
      if (e.imagePath) allPaths.push(e.imagePath);
    });

    if (allPaths.length === 0) return;

    try {
      const response = await fetch('/api/validate-attachments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attachments: allPaths })
      });
      const data = await response.json();

      if (data.success && data.results) {
        setEmails(prev => prev.map(e => {
          const updatedAttachments = e.attachments.map(a => {
            const result = data.results.find((r: any) => r.path === a.path);
            return result ? { ...a, status: result.exists ? 'found' : 'not_found' } : a;
          });
          return { ...e, attachments: updatedAttachments };
        }));
      }
    } catch (error) {
      console.error('Error validating attachments:', error);
    }
  };

  const handleSendAll = async () => {
    if (emails.length === 0) return;

    // Basic validation
    const invalid = emails.filter(e => !e.to || !e.subject || !e.body);
    if (invalid.length > 0) {
      alert('Por favor, preencha Destinatário, Assunto e Corpo de todos os clientes.');
      return;
    }

    setIsProcessing(true);
    setEmails(prev => prev.map(e => ({ ...e, status: 'processing', errorMessage: undefined })));

    try {
      const response = await fetch('/api/send-batch-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          emails: emails.map(e => ({
            ...e,
            attachments: e.attachments.map(a => a.path).filter(Boolean)
          }))
        })
      });

      const data = await response.json();

      if (data.success && data.results) {
        setEmails(prev => prev.map(e => {
          const result = data.results.find((r: any) => r.id === e.id);
          if (result) {
            return { 
              ...e, 
              status: result.success ? 'success' : 'error', 
              errorMessage: result.success ? undefined : result.message 
            };
          }
          return e;
        }));
      }
    } catch (error) {
      console.error('Error sending emails:', error);
      setEmails(prev => prev.map(e => ({ ...e, status: 'error', errorMessage: 'Erro de conexão com o servidor.' })));
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setEmails([]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-7xl max-h-[95vh] bg-gradient-to-br from-[#27313D] to-[#000000] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Envio de E-mails em Lote</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Módulo Corporativo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {emails.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-3xl">
              <Mail className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Nenhum cliente adicionado à lista de envio.</p>
              <button 
                onClick={addClientCard}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar primeiro cliente
              </button>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {emails.map((email) => (
                <motion.div 
                  key={email.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#1a1c23]/50 border border-white/5 rounded-3xl p-6 relative group hover:border-white/10 transition-all shadow-lg"
                >
                  <button 
                    onClick={() => removeClientCard(email.id)}
                    className="absolute top-6 right-6 p-2 hover:bg-red-500/10 rounded-xl text-gray-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Basic Info */}
                    <div className="lg:col-span-4 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome do Cliente</label>
                        <input 
                          type="text"
                          value={email.clientName}
                          onChange={(e) => updateEmailField(email.id, 'clientName', e.target.value)}
                          placeholder="Ex: Empresa ABC"
                          className="w-full bg-[#0f1115] border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Para (Destinatário)</label>
                        <input 
                          type="email"
                          value={email.to}
                          onChange={(e) => updateEmailField(email.id, 'to', e.target.value)}
                          placeholder="cliente@email.com"
                          className="w-full bg-[#0f1115] border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">CC</label>
                          <input 
                            type="text"
                            value={email.cc}
                            onChange={(e) => updateEmailField(email.id, 'cc', e.target.value)}
                            className="w-full bg-[#0f1115] border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">BCC</label>
                          <input 
                            type="text"
                            value={email.bcc}
                            onChange={(e) => updateEmailField(email.id, 'bcc', e.target.value)}
                            className="w-full bg-[#0f1115] border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Caminho da Imagem (Opcional)</label>
                        <input 
                          type="text"
                          value={email.imagePath}
                          onChange={(e) => updateEmailField(email.id, 'imagePath', e.target.value)}
                          placeholder="\\caminho\servidor\imagem.jpg"
                          className="w-full bg-[#0f1115] border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>
                    </div>

                    {/* Middle Column: Content */}
                    <div className="lg:col-span-5 space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Assunto</label>
                        <input 
                          type="text"
                          value={email.subject}
                          onChange={(e) => updateEmailField(email.id, 'subject', e.target.value)}
                          placeholder="Assunto do e-mail"
                          className="w-full bg-[#0f1115] border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Corpo do E-mail (HTML)</label>
                        <textarea 
                          value={email.body}
                          onChange={(e) => updateEmailField(email.id, 'body', e.target.value)}
                          placeholder="Olá, segue anexo..."
                          rows={8}
                          className="w-full bg-[#0f1115] border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all resize-none custom-scrollbar"
                        />
                      </div>
                    </div>

                    {/* Right Column: Attachments & Status */}
                    <div className="lg:col-span-3 space-y-4 flex flex-col">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Anexos</label>
                          <button 
                            onClick={() => addAttachment(email.id)}
                            className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-widest"
                          >
                            + Adicionar
                          </button>
                        </div>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                          {email.attachments.map((att) => (
                            <div key={att.id} className="flex items-center gap-2 group/att">
                              <div className="relative flex-1">
                                <input 
                                  type="text"
                                  value={att.path}
                                  onChange={(e) => updateAttachmentPath(email.id, att.id, e.target.value)}
                                  placeholder="\\caminho\anexo.pdf"
                                  className="w-full bg-[#0f1115] border border-white/5 rounded-lg py-1.5 px-3 text-[11px] text-white focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                  {att.status === 'found' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                                  {att.status === 'not_found' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                </div>
                              </div>
                              <button 
                                onClick={() => removeAttachment(email.id, att.id)}
                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-gray-600 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                          {email.attachments.length === 0 && (
                            <p className="text-[10px] text-gray-600 italic text-center py-4">Nenhum anexo</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Status do Envio</label>
                        </div>
                        <div className="flex items-center gap-3">
                          {email.status === 'pending' && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-500/10 text-gray-400 rounded-full border border-gray-500/20 text-[10px] font-bold uppercase tracking-wider">
                              <CircleDot className="w-3 h-3" />
                              Pendente
                            </div>
                          )}
                          {email.status === 'processing' && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider">
                              <div className="w-2 h-2 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                              Processando
                            </div>
                          )}
                          {email.status === 'success' && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 text-[10px] font-bold uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" />
                              Enviado
                            </div>
                          )}
                          {email.status === 'error' && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 text-[10px] font-bold uppercase tracking-wider">
                              <XCircle className="w-3 h-3" />
                              Erro
                            </div>
                          )}
                        </div>
                        {email.errorMessage && (
                          <p className="mt-2 text-[10px] text-red-500/80 font-medium italic leading-tight">{email.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/20 border-t border-white/5 flex items-center justify-between shrink-0">
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
            >
              Fechar
            </button>
            <button 
              onClick={clearAll}
              className="px-5 py-2.5 text-xs font-bold text-gray-400 hover:text-red-400 transition-colors uppercase tracking-widest"
            >
              Limpar Tudo
            </button>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={validateAttachments}
              disabled={isProcessing || emails.length === 0}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              Validar Anexos
            </button>
            <button 
              onClick={addClientCard}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Adicionar Cliente
            </button>
            <button 
              onClick={handleSendAll}
              disabled={isProcessing || emails.length === 0}
              className="px-8 py-2.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 uppercase tracking-widest"
            >
              {isProcessing ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar E-mails
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface FileMoveItem {
  id: string;
  sourcePath: string;
  destPath: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
}

function MultiFileMoveModal({ onClose }: { onClose: () => void }) {
  const [files, setFiles] = useState<FileMoveItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addFileCard = () => {
    const newFile: FileMoveItem = {
      id: Math.random().toString(36).substr(2, 9),
      sourcePath: '',
      destPath: '',
      status: 'pending'
    };
    setFiles(prev => [...prev, newFile]);
  };

  const removeFileCard = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileField = (id: string, field: keyof FileMoveItem, value: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const handleMoveAll = async () => {
    if (files.length === 0) return;
    
    // Validate all cards have required fields
    const invalidFiles = files.filter(f => !f.sourcePath || !f.destPath);
    if (invalidFiles.length > 0) {
      alert('Por favor, preencha todos os campos de todos os arquivos.');
      return;
    }

    setIsProcessing(true);
    
    // Set all to processing
    setFiles(prev => prev.map(f => ({ ...f, status: 'processing', errorMessage: undefined })));

    try {
      const response = await fetch('/api/move-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files })
      });

      const data = await response.json();

      if (data.success && data.results) {
        setFiles(prev => prev.map(f => {
          const result = data.results.find((r: any) => r.id === f.id);
          if (result) {
            return { 
              ...f, 
              status: result.success ? 'success' : 'error', 
              errorMessage: result.success ? undefined : result.message 
            };
          }
          return f;
        }));
      }
    } catch (error) {
      console.error('Error moving files:', error);
      setFiles(prev => prev.map(f => ({ ...f, status: 'error', errorMessage: 'Erro de conexão com o servidor.' })));
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-6xl max-h-[90vh] bg-gradient-to-br from-[#27313D] to-[#000000] rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Movimentação de Múltiplos Arquivos</h2>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-medium">Servidor Corporativo</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body - Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {files.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/5 rounded-3xl">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Nenhum arquivo adicionado à lista.</p>
              <button 
                onClick={addFileCard}
                className="mt-4 text-blue-400 hover:text-blue-300 text-sm font-bold flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Adicionar primeiro arquivo
              </button>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {files.map((file) => (
                <motion.div 
                  key={file.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-[#1a1c23]/50 border border-white/5 rounded-2xl p-5 relative group hover:border-white/10 transition-all"
                >
                  <button 
                    onClick={() => removeFileCard(file.id)}
                    className="absolute top-4 right-4 p-1.5 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Caminho Origem</label>
                      <input 
                        type="text"
                        value={file.sourcePath}
                        onChange={(e) => updateFileField(file.id, 'sourcePath', e.target.value)}
                        placeholder="/home/user/file.pdf"
                        className="w-full bg-[#0f1115] border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Caminho Destino</label>
                      <input 
                        type="text"
                        value={file.destPath}
                        onChange={(e) => updateFileField(file.id, 'destPath', e.target.value)}
                        placeholder="/var/www/dest/file.pdf"
                        className="w-full bg-[#0f1115] border border-white/5 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {file.status === 'pending' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-gray-500/10 text-gray-400 rounded-full border border-gray-500/20 text-[10px] font-bold uppercase tracking-wider">
                          <CircleDot className="w-3 h-3" />
                          Pendente
                        </div>
                      )}
                      {file.status === 'processing' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider">
                          <div className="w-2 h-2 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
                          Processando
                        </div>
                      )}
                      {file.status === 'success' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 text-[10px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-3 h-3" />
                          Movido
                        </div>
                      )}
                      {file.status === 'error' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 text-[10px] font-bold uppercase tracking-wider">
                          <XCircle className="w-3 h-3" />
                          Não movido
                        </div>
                      )}
                      {file.errorMessage && (
                        <span className="text-[10px] text-red-500/80 font-medium italic">{file.errorMessage}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-black/20 border-t border-white/5 flex items-center justify-between shrink-0">
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-widest"
            >
              Fechar
            </button>
            <button 
              onClick={clearAll}
              className="px-5 py-2.5 text-xs font-bold text-gray-400 hover:text-red-400 transition-colors uppercase tracking-widest"
            >
              Limpar Tudo
            </button>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={addFileCard}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all border border-white/10 flex items-center gap-2 disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              Adicionar Arquivo
            </button>
            <button 
              onClick={handleMoveAll}
              disabled={isProcessing || files.length === 0}
              className="px-8 py-2.5 bg-gradient-to-b from-blue-500 to-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2 uppercase tracking-widest"
            >
              {isProcessing ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Share className="w-4 h-4" />
                  Mover Arquivos
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReportModal({ 
  isOpen, 
  onClose, 
  clients, 
  allYearData,
  year
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  clients: Client[], 
  allYearData: MonthlyStatus[],
  year: number
}) {
  const [selectedQuarter, setSelectedQuarter] = useState(0); // 0-3

  const quarters = [
    { label: '1º Trimestre', months: [0, 1, 2] },
    { label: '2º Trimestre', months: [3, 4, 5] },
    { label: '3º Trimestre', months: [6, 7, 8] },
    { label: '4º Trimestre', months: [9, 10, 11] },
  ];

  const currentQuarterMonths = quarters[selectedQuarter].months;

  const reportData = clients
    .filter(client => client.active !== false)
    .map(client => {
      const monthlyMovements = currentQuarterMonths.map(monthIdx => {
        const status = allYearData.find(d => d.clientId === client.id && d.month === monthIdx);
        return {
          month: monthIdx,
          hasMovement: status?.servPrest === 'yes' && status?.hidden !== true
        };
      });

    const hasAnyMovement = monthlyMovements.some(m => m.hasMovement);

    return {
      client,
      movements: monthlyMovements,
      hasAnyMovement
    };
  }).filter(item => item.hasAnyMovement);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-4xl bg-[#1a1c23] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1c23]">
              <div>
                <h3 className="text-xl font-bold text-white">Relatório de Apuração IRPJ / CSLL</h3>
                <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Ano Base: {year}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="p-6 bg-[#0f1115] flex gap-2 overflow-x-auto">
              {quarters.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedQuarter(i)}
                  className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                    selectedQuarter === i 
                      ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {reportData.length > 0 ? (
                <div className="bg-white/5 rounded-xl border border-white/5 divide-y divide-white/5">
                  {reportData.map(({ client, movements }) => {
                    const activeMonths = movements
                      .filter(m => m.hasMovement)
                      .map(m => MONTHS[m.month].substring(0, 3).toUpperCase());

                    return (
                      <div 
                        key={client.id}
                        className="flex items-center justify-between p-4 hover:bg-white/5 transition-all group"
                      >
                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors">
                          {client.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {activeMonths.map((month, idx) => (
                            <React.Fragment key={month}>
                              <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">
                                {month}
                              </span>
                              {idx < activeMonths.length - 1 && (
                                <span className="text-gray-600 font-bold">|</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <LineChart className="w-8 h-8 text-gray-600" />
                  </div>
                  <h4 className="text-white font-bold">Nenhuma movimentação encontrada</h4>
                  <p className="text-gray-500 text-sm mt-1 max-w-xs">
                    Não foram encontrados registros de "Serviço Prestado" para este trimestre.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-[#1a1c23] flex justify-end">
              <button 
                onClick={() => window.print()}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Imprimir Relatório
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  isDangerous = false 
}: { 
  isOpen: boolean, 
  title: string, 
  message: string, 
  onConfirm: () => void, 
  onCancel: () => void,
  isDangerous?: boolean
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-[#1a1c23] border border-white/10 rounded-2xl p-8 shadow-2xl"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-3 rounded-xl ${isDangerous ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                {isDangerous ? <AlertTriangle className="w-6 h-6" /> : <ArrowRightCircle className="w-6 h-6" />}
              </div>
              <h3 className="text-xl font-bold text-white">{title}</h3>
            </div>
            
            <p className="text-gray-400 mb-8 leading-relaxed whitespace-pre-wrap">
              {message}
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={onConfirm}
                className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                  isDangerous 
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)]' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                }`}
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function StatusCell({ value, onClick, disabled, allowAttention = false }: { value: StatusValue, onClick: () => void, disabled?: boolean, allowAttention?: boolean }) {
  return (
    <td className="p-4 text-center">
      <button 
        onClick={onClick}
        disabled={disabled}
        className={`transition-transform active:scale-90 ${disabled ? 'opacity-80 cursor-not-allowed' : ''}`}
      >
        {value === 'yes' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
        {value === 'no' && <XCircle className="w-5 h-5 text-red-500" />}
        {value === 'pending' && <Circle className="w-5 h-5 text-gray-300" />}
        {value === 'attention' && allowAttention && <AlertTriangle className="w-5 h-5 text-amber-500" />}
        {value === 'attention' && !allowAttention && <Circle className="w-5 h-5 text-gray-300" />}
      </button>
    </td>
  );
}

function FilterHeader({ 
  label, 
  field, 
  activeFilter, 
  setActiveFilter, 
  getUniqueValues, 
  filters, 
  toggleFilterValue,
  center = false,
  icon: Icon,
  iconColor
}: { 
  label: string, 
  field: string, 
  activeFilter: string | null, 
  setActiveFilter: (f: string | null) => void,
  getUniqueValues: (f: string) => any[],
  filters: Record<string, string[]>,
  toggleFilterValue: (f: string, v: string) => void,
  center?: boolean,
  icon?: any,
  iconColor?: string
}) {
  const isOpen = activeFilter === field;
  const uniqueValues = getUniqueValues(field);
  const selectedValues = filters[field] || [];

  return (
    <th className={`p-4 min-w-[120px] relative ${field === 'name' ? 'sticky left-0 bg-gradient-to-b from-[#2a2d3a] to-[#1a1c23] z-20' : 'bg-gradient-to-b from-[#2a2d3a] to-[#1a1c23]'} ${center ? 'text-center' : ''} shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]`}>
      <div className={`flex items-center gap-2 cursor-pointer hover:text-white transition-colors group ${center ? 'justify-center' : 'justify-between'}`} onClick={() => setActiveFilter(isOpen ? null : field)}>
        <div className="flex items-center gap-2 truncate">
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]" style={{ color: iconColor || 'rgba(96, 165, 250, 0.8)' }} />}
          <span className="truncate drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]">{label}</span>
        </div>
        <Filter className={`w-3 h-3 ${selectedValues.length > 0 ? 'text-blue-400' : 'opacity-50'} shrink-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]`} />
      </div>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setActiveFilter(null)} />
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full left-0 mt-2 w-64 bg-[#1a1c23] border border-white/10 rounded-xl shadow-2xl z-40 overflow-hidden text-left normal-case font-normal"
            >
              <div className="p-3 border-b border-white/5 bg-[#252833] flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Filtrar {label}</span>
                <button onClick={() => setActiveFilter(null)} className="text-gray-500 hover:text-white">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                {uniqueValues.map(val => (
                  <label key={val} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-white/10 bg-transparent text-blue-600 focus:ring-0"
                      checked={selectedValues.includes(val)}
                      onChange={() => toggleFilterValue(field, val)}
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white truncate">
                      {val === 'yes' ? 'Sim' : val === 'no' ? 'Não' : val === 'pending' ? 'Pendente' : val === 'attention' ? 'Atenção' : val}
                    </span>
                  </label>
                ))}
              </div>
              {selectedValues.length > 0 && (
                <div className="p-2 border-t border-white/5 bg-[#0f1115]">
                  <button 
                    onClick={() => toggleFilterValue(field, '')} // This logic would need to clear all
                    className="w-full py-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase"
                  >
                    Limpar Filtro
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </th>
  );
}

function RegistrationView({ onComplete, client, onDelete, isLocked }: { onComplete: () => void, client?: Client | null, onDelete: (client: Client) => void, isLocked: boolean }) {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    cnpj: client?.cnpj || '',
    ccm: client?.ccm || '',
    city: client?.city || '',
    accessType: client?.accessType || '',
    accessLink: client?.accessLink || '',
    login: client?.login || '',
    password: client?.password || '',
    active: client?.active ?? true,
    startMonth: client?.startMonth ?? new Date().getMonth(),
    startYear: client?.startYear ?? new Date().getFullYear(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (client) {
        await updateDoc(doc(db, 'clients', client.id), {
          ...formData
        });
      } else {
        await addDoc(collection(db, 'clients'), {
          ...formData,
          active: true,
          createdAt: new Date().toISOString()
        });
      }
      onComplete();
    } catch (error) {
      handleFirestoreError(error, client ? 'UPDATE' : 'CREATE', 'clients');
    }
  };

  const handleDeleteClient = () => {
    if (!client) return;
    onDelete(client);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-[#1a1c23] rounded-2xl border border-white/5 p-8 shadow-2xl">
        <div className="flex justify-between items-start mb-8">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            {client ? <Pencil className="w-8 h-8 text-blue-500" /> : <UserPlus className="w-8 h-8 text-blue-500" />}
            {client ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
          </h2>
          {client && (
            <button 
              type="button"
              onClick={handleDeleteClient}
              disabled={isLocked}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-xs font-bold uppercase tracking-wider ${
                isLocked 
                  ? 'bg-gray-500/10 text-gray-500 border-gray-500/20 cursor-not-allowed' 
                  : 'bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Excluir Permanentemente
            </button>
          )}
        </div>

        {isLocked && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
            <span className="text-sm font-medium">Este período está bloqueado. A edição e exclusão de empresas não é permitida.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Razão Social</label>
            <input 
              required
              type="text" 
              disabled={isLocked}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.name}
              onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">CNPJ</label>
            <input 
              required
              type="text" 
              disabled={isLocked}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.cnpj}
              onChange={e => setFormData(d => ({ ...d, cnpj: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">CCM</label>
            <input 
              type="text" 
              disabled={isLocked}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.ccm}
              onChange={e => setFormData(d => ({ ...d, ccm: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Município</label>
            <input 
              type="text" 
              disabled={isLocked}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.city}
              onChange={e => setFormData(d => ({ ...d, city: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status do Cliente</label>
            <div className={`flex items-center gap-4 p-4 bg-[#0f1115] border border-white/10 rounded-xl ${isLocked ? 'opacity-50' : ''}`}>
              <label className={`flex items-center gap-2 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input 
                  type="radio" 
                  disabled={isLocked}
                  checked={formData.active === true}
                  onChange={() => setFormData(d => ({ ...d, active: true }))}
                  className="w-4 h-4 text-blue-600 bg-transparent border-white/10 focus:ring-0"
                />
                <span className="text-sm text-green-500 font-bold">Ativo</span>
              </label>
              <label className={`flex items-center gap-2 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input 
                  type="radio" 
                  disabled={isLocked}
                  checked={formData.active === false}
                  onChange={() => setFormData(d => ({ ...d, active: false }))}
                  className="w-4 h-4 text-red-600 bg-transparent border-white/10 focus:ring-0"
                />
                <span className="text-sm text-red-500 font-bold">Inativo</span>
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tipo de Acesso</label>
            <input 
              type="text" 
              disabled={isLocked}
              placeholder="Ex: CNPJ CSK, Portal, etc."
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.accessType}
              onChange={e => setFormData(d => ({ ...d, accessType: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Link de Acesso</label>
            <input 
              type="url" 
              disabled={isLocked}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.accessLink}
              onChange={e => setFormData(d => ({ ...d, accessLink: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Login</label>
            <input 
              type="text" 
              disabled={isLocked}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.login}
              onChange={e => setFormData(d => ({ ...d, login: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Senha</label>
            <input 
              type="text" 
              disabled={isLocked}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.password}
              onChange={e => setFormData(d => ({ ...d, password: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mês de Início</label>
            <select 
              disabled={isLocked}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.startMonth}
              onChange={e => setFormData(d => ({ ...d, startMonth: parseInt(e.target.value) }))}
            >
              {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ano de Início</label>
            <input 
              type="number" 
              disabled={isLocked}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl p-4 focus:border-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              value={formData.startYear}
              onChange={e => setFormData(d => ({ ...d, startYear: parseInt(e.target.value) }))}
            />
          </div>

          <div className="md:col-span-2 pt-6 flex gap-4">
            {!isLocked && (
              <button 
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all"
              >
                SALVAR CLIENTE
              </button>
            )}
            <button 
              type="button"
              onClick={onComplete}
              className="px-8 bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl border border-white/10 transition-all"
            >
              CANCELAR
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
