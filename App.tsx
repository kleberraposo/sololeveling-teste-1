
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Menu, 
  PlusCircle, 
  UserCircle, 
  LayoutDashboard, 
  Trash2,
  X,
  Zap,
  Clock,
  Dna,
  Book,
  Droplets,
  Apple,
  Moon,
  Layout,
  Trophy,
  ShieldAlert,
  Sword,
  Brain,
  Target,
  Heart,
  Sparkles,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  Activity,
  CheckCircle,
  History,
  RefreshCw
} from 'lucide-react';
import { Player, Rank, Quest, Job, Title, Priority, Recurrence } from './types';
import { SystemModal } from './components/SystemModal';
import { classifyMissionAttribute } from './services/geminiService';

const INITIAL_PLAYER: Player = {
  name: "Jogador",
  level: 1,
  rank: Rank.E,
  rankPoints: 0,
  job: Job.NONE,
  title: Title.NEWBIE,
  hp: { current: 100, max: 100 },
  mp: { current: 20, max: 20 },
  fatigue: 0,
  stats: { force: 0, intelligence: 0, focus: 0, vitality: 0, charisma: 0 },
  statPoints: 0,
  gold: 0,
  exp: 0,
  expToNext: 200 
};

const RANK_THRESHOLDS = [
  { rank: Rank.E, min: 0 },
  { rank: Rank.D, min: 100 },
  { rank: Rank.C, min: 300 },
  { rank: Rank.B, min: 600 },
  { rank: Rank.A, min: 1100 },
  { rank: Rank.S, min: 2100 },
];

const MISSION_CATEGORIES = [
  { name: "Flexões", type: "physical", icon: <Zap size={16} />, defaultAttr: 'force' },
  { name: "Abdominais", type: "physical", icon: <Zap size={16} />, defaultAttr: 'force' },
  { name: "Agachamentos", type: "physical", icon: <Zap size={16} />, defaultAttr: 'force' },
  { name: "Hidratação", type: "hydration", icon: <Droplets size={16} />, defaultAttr: 'vitality' },
  { name: "Estudos", type: "study", icon: <Book size={16} />, defaultAttr: 'intelligence' },
  { name: "Alimentação", type: "nutrition", icon: <Apple size={16} />, defaultAttr: 'vitality' },
  { name: "Sono", type: "sleep", icon: <Moon size={16} />, defaultAttr: 'vitality' },
  { name: "Organização", type: "org", icon: <Layout size={16} />, defaultAttr: 'focus' }
];

const RadarChart = ({ stats }: { stats: Player['stats'] }) => {
  const size = 200;
  const center = size / 2;
  const radius = 70;
  const maxStat = 50;

  const points = [
    { label: 'FOR', value: stats.force },
    { label: 'INT', value: stats.intelligence },
    { label: 'FOC', value: stats.focus },
    { label: 'VIT', value: stats.vitality },
    { label: 'CAR', value: stats.charisma },
  ];

  const getCoordinates = (index: number, value: number) => {
    const angle = (Math.PI * 2 * index) / 5 - Math.PI / 2;
    const r = (Math.max(0.5, value) / maxStat) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPath = points
    .map((p, i) => {
      const { x, y } = getCoordinates(i, p.value);
      return `${x},${y}`;
    })
    .join(' ');

  const gridLevels = [10, 20, 30, 40, 50];

  return (
    <div className="relative flex justify-center items-center">
      <svg width={size} height={size} className="drop-shadow-[0_0_8px_rgba(14,165,233,0.3)]">
        {gridLevels.map((lvl) => (
          <polygon
            key={lvl}
            points={points.map((_, i) => {
              const { x, y } = getCoordinates(i, lvl);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke="white"
            strokeOpacity="0.05"
            strokeWidth="1"
          />
        ))}
        {points.map((_, i) => {
          const { x, y } = getCoordinates(i, maxStat);
          return (
            <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="white" strokeOpacity="0.1" strokeWidth="1" />
          );
        })}
        <polygon
          points={polygonPath}
          fill="rgba(14,165,233,0.2)"
          stroke="#0ea5e9"
          strokeWidth="2"
          className="transition-all duration-1000 ease-out"
        />
        {points.map((p, i) => {
          const { x, y } = getCoordinates(i, maxStat + 15);
          return (
            <text key={i} x={x} y={y} textAnchor="middle" className="fill-slate-500 font-orbitron font-bold text-[10px]">
              {p.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

const App: React.FC = () => {
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<any[]>([]);
  const [dailyQuest, setDailyQuest] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(86400); 
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'home' | 'create' | 'settings' | 'progress' | 'completed'>('home');
  const [newName, setNewName] = useState("");
  const [newQuest, setNewQuest] = useState({ 
    name: "", 
    description: "", 
    priority: Priority.MEDIUM,
    recurrence: Recurrence.NONE
  });
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' as 'info' | 'alert' | 'reward' });

  const timerRef = useRef<any>(null);

  const getRankColor = (rank: Rank) => {
    switch (rank) {
      case Rank.E: return 'text-slate-500';
      case Rank.D: return 'text-emerald-400';
      case Rank.C: return 'text-sky-400';
      case Rank.B: return 'text-indigo-400';
      case Rank.A: return 'text-red-500';
      case Rank.S: return 'text-amber-400';
      default: return 'text-white';
    }
  };

  const generateDailyMission = useCallback((level: number) => {
    const template = MISSION_CATEGORIES[Math.floor(Math.random() * MISSION_CATEGORIES.length)];
    let target: any = 0;
    let displayTarget = "";
    let difficulty = "Fácil";
    let rewardXP = 15;
    let rewardRank = 5;

    if (level <= 25) { difficulty = "Fácil"; rewardXP = 15; rewardRank = 5; } 
    else if (level <= 60) { difficulty = "Médio"; rewardXP = 35; rewardRank = 12; } 
    else { difficulty = "Difícil"; rewardXP = 60; rewardRank = 25; }

    switch (template.type) {
      case "physical": target = Math.floor(Math.random() * 20) + 10; displayTarget = `${target} Reps`; break;
      case "sleep": target = 8; displayTarget = "8 Horas"; break;
      case "hydration": target = 2; displayTarget = "2 Litros"; break;
      case "study": 
        if (difficulty === "Fácil") { target = 30; displayTarget = "30 Min"; }
        else if (difficulty === "Médio") { target = 60; displayTarget = "1 Hora"; }
        else { target = 180; displayTarget = "3 Horas"; }
        break;
      default: target = 1; displayTarget = "Concluir";
    }

    setTimeLeft(86400);
    return {
      id: 'daily-' + Date.now(),
      name: template.name,
      type: template.type,
      target,
      displayTarget,
      difficulty,
      rewardXP,
      rewardRank,
      defaultAttr: template.defaultAttr,
      completed: false
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentTime(new Date());
      setTimeLeft(prev => {
        if (prev <= 1) {
          setDailyQuest(generateDailyMission(player.level));
          return 86400;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [dailyQuest, player.level, generateDailyMission]);

  useEffect(() => {
    const saved = localStorage.getItem('sl_system_v21_obs');
    if (saved) {
      const data = JSON.parse(saved);
      setPlayer(data.player);
      setQuests(data.quests);
      setCompletedQuests(data.completedQuests || []);
      setDailyQuest(data.dailyQuest || generateDailyMission(data.player.level));
      if (data.timeLeft) setTimeLeft(data.timeLeft);
    } else {
      setDailyQuest(generateDailyMission(INITIAL_PLAYER.level));
    }
  }, [generateDailyMission]);

  useEffect(() => {
    localStorage.setItem('sl_system_v21_obs', JSON.stringify({ player, quests, dailyQuest, completedQuests, timeLeft }));
  }, [player, quests, dailyQuest, completedQuests, timeLeft]);

  const showModal = (title: string, message: string, type: 'info' | 'alert' | 'reward') => {
    setModal({ isOpen: true, title, message, type });
  };

  const allocateStat = async (missionName: string, description: string = "", defaultAttr?: string) => {
    let targetStat: keyof Player['stats'] = (defaultAttr as any) || 'focus';
    
    if (!defaultAttr) {
        const aiResult = await classifyMissionAttribute(missionName, description);
        targetStat = aiResult as any;
    }

    setPlayer(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        [targetStat]: Math.min(50, prev.stats[targetStat] + 1)
      }
    }));

    const labels: Record<string, string> = {
      force: 'Força',
      intelligence: 'Inteligência',
      focus: 'Foco',
      vitality: 'Vitalidade',
      charisma: 'Carisma'
    };

    return labels[targetStat];
  };

  const addExpAndRank = (xp: number, rankPts: number) => {
    setPlayer(prev => {
      let newExp = prev.exp + xp;
      let newLevel = prev.level;
      let expToNext = prev.level <= 25 ? 200 : prev.level <= 60 ? 400 : 800;
      
      while (newExp >= expToNext && newLevel < 999) {
        newLevel += 1;
        newExp -= expToNext;
        expToNext = newLevel <= 25 ? 200 : newLevel <= 60 ? 400 : 800;
        const lvl = newLevel;
        setTimeout(() => showModal("NÍVEL AUMENTOU", `Status recalibrado. Nível ${lvl} atingido.`, "reward"), 300);
      }

      let newRankPoints = prev.rankPoints + rankPts;
      let newRank = prev.rank;
      const nextRankObj = RANK_THRESHOLDS.slice().reverse().find(t => newRankPoints >= t.min);
      if (nextRankObj && nextRankObj.rank !== prev.rank) {
        newRank = nextRankObj.rank;
        setTimeout(() => showModal("RANK AUMENTOU", `Autoridade de Rank atualizada para: ${newRank}`, "reward"), 1000);
      }

      return { ...prev, exp: newExp, level: newLevel, expToNext: expToNext, rankPoints: newRankPoints, rank: newRank };
    });
  };

  const completeDailyQuest = async () => {
    if (!dailyQuest || dailyQuest.completed) return;
    const statName = await allocateStat(dailyQuest.name, "", dailyQuest.defaultAttr);
    addExpAndRank(dailyQuest.rewardXP, dailyQuest.rewardRank);
    
    const finishedQuest = {
      ...dailyQuest,
      completed: true,
      completedAt: new Date().toISOString(),
      source: 'SISTEMA'
    };
    
    setCompletedQuests(prev => [finishedQuest, ...prev]);
    setDailyQuest({ ...dailyQuest, completed: true });
    showModal("MISSÃO CONCLUÍDA", `Diretriz sincronizada. +1 ponto em ${statName}.`, "reward");
    setTimeout(() => setDailyQuest(generateDailyMission(player.level)), 1200);
  };

  const updatePlayerQuest = async (id: string) => {
    const qIndex = quests.findIndex(q => q.id === id);
    if (qIndex === -1) return;
    const q = quests[qIndex];

    const newCurrent = Math.min(q.target, q.current + 1);
    
    if (newCurrent >= q.target && q.current < q.target) {
      const statName = await allocateStat(q.name, q.description);
      addExpAndRank(q.rewardXP, q.rewardRankPoints);
      
      const finishedQuest = {
        ...q,
        current: newCurrent,
        completedAt: new Date().toISOString(),
        source: 'JOGADOR'
      };
      
      setCompletedQuests(prev => [finishedQuest, ...prev]);
      
      if (q.recurrence !== Recurrence.NONE) {
        let cooldownTime = 0;
        const DAY_MS = 24 * 60 * 60 * 1000;
        
        if (q.recurrence === Recurrence.DAILY) cooldownTime = DAY_MS;
        else if (q.recurrence === Recurrence.WEEKLY) cooldownTime = 7 * DAY_MS;
        else if (q.recurrence === Recurrence.MONTHLY) cooldownTime = 30 * DAY_MS;

        const nextAvailable = new Date(Date.now() + cooldownTime).toISOString();
        
        setQuests(prev => prev.map(item => item.id === id ? { 
          ...item, 
          current: 0, 
          nextAvailableAt: nextAvailable 
        } : item));

        let cycleMsg = "";
        if (q.recurrence === Recurrence.DAILY) cycleMsg = "Ciclo de 24 horas iniciado.";
        else if (q.recurrence === Recurrence.WEEKLY) cycleMsg = "Ciclo de 7 dias iniciado.";
        else cycleMsg = "Ciclo de 30 dias iniciado.";

        showModal("OBJETIVO ATINGIDO", `Protocolo "${q.name}" finalizado. +1 ponto em ${statName}. ${cycleMsg} A diretriz reaparecerá no próximo período disponível.`, "reward");
      } else {
        setQuests(prev => prev.filter(item => item.id !== id));
        showModal("OBJETIVO ATINGIDO", `Protocolo "${q.name}" finalizado e arquivado. +1 ponto em ${statName}.`, "reward");
      }
    } else {
      setQuests(prev => prev.map(item => item.id === id ? { ...item, current: newCurrent } : item));
    }
  };

  const handleCreateQuest = () => {
    if (!newQuest.name.trim()) {
      showModal("[ALERTA]", "Identificador do protocolo não pode estar vazio.", "alert");
      return;
    }

    let rxp = 0, rrank = 0;
    if (newQuest.priority === Priority.LOW) {
      rxp = Math.floor(Math.random() * (12 - 5 + 1)) + 5;
      rrank = Math.floor(Math.random() * (9 - 5 + 1)) + 5;
    } else if (newQuest.priority === Priority.MEDIUM) {
      rxp = Math.floor(Math.random() * (15 - 10 + 1)) + 10;
      rrank = Math.floor(Math.random() * (13 - 10 + 1)) + 10;
    } else {
      rxp = Math.floor(Math.random() * (18 - 10 + 1)) + 10;
      rrank = Math.floor(Math.random() * (20 - 13 + 1)) + 13;
    }

    const quest: Quest = {
      id: 'protocol-' + Date.now(),
      name: newQuest.name,
      target: 1, // Definido como 1 por padrão após remoção do campo de meta
      current: 0,
      description: newQuest.description || "",
      priority: newQuest.priority,
      rewardXP: rxp,
      rewardRankPoints: rrank,
      recurrence: newQuest.recurrence
    };
    
    setQuests(prev => [...prev, quest].sort((a, b) => b.priority - a.priority));
    setNewQuest({ 
      name: "", 
      description: "", 
      priority: Priority.MEDIUM, 
      recurrence: Recurrence.NONE 
    });
    setActiveView('home');
    showModal("SISTEMA", `Protocolo registrado. Nível de Ameaça detectado.`, "info");
  };

  const getRankProgress = () => {
    const currentIndex = RANK_THRESHOLDS.findIndex(t => t.rank === player.rank);
    const currentMin = RANK_THRESHOLDS[currentIndex].min;
    const nextObj = RANK_THRESHOLDS[currentIndex + 1];
    if (!nextObj) return 100;
    return Math.min(100, ((player.rankPoints - currentMin) / (nextObj.min - currentMin)) * 100);
  };

  const getPointsToNextRank = () => {
    const currentIndex = RANK_THRESHOLDS.findIndex(t => t.rank === player.rank);
    const nextObj = RANK_THRESHOLDS[currentIndex + 1];
    if (!nextObj) return 0;
    return nextObj.min - player.rankPoints;
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const availableQuests = quests.filter(q => {
    if (!q.nextAvailableAt) return true;
    return new Date(q.nextAvailableAt) <= currentTime;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-rajdhani flex overflow-hidden">
      
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 bg-slate-900 border-r border-sky-500/20 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 shadow-2xl`}>
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h2 className="font-orbitron font-black text-sky-400 text-lg tracking-widest italic system-glow">SISTEMA</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-sky-400 p-1"><X size={20} /></button>
          </div>
          <nav className="flex-1 space-y-2">
            {[
              { id: 'home', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
              { id: 'progress', icon: <TrendingUp size={16} />, label: 'Progresso do Chamado' },
              { id: 'completed', icon: <CheckCircle size={16} />, label: 'Missões Concluídas' },
              { id: 'create', icon: <PlusCircle size={16} />, label: 'Novo Protocolo' },
              { id: 'settings', icon: <UserCircle size={16} />, label: 'Jogador' }
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => { setActiveView(item.id as any); setIsSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-[10px] font-orbitron font-bold uppercase transition-all ${activeView === item.id ? 'bg-sky-500/10 text-sky-400 border-l-4 border-sky-400 shadow-[inset_10px_0_20_rgba(14,165,233,0.05)]' : 'hover:bg-slate-800 text-slate-500'}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <div className="flex-1 flex flex-col w-full relative">
        <header className="pt-10 pb-6 px-6 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xl border-b border-sky-500/10">
          <button onClick={() => setIsSidebarOpen(true)} className="md:hidden absolute left-6 top-10 text-sky-400"><Menu size={24} /></button>
          <div className="text-center w-full max-w-sm animate-in fade-in duration-700">
            <h1 className="text-2xl md:text-3xl font-orbitron font-black text-white uppercase tracking-[0.25em] system-glow mb-3">{player.name}</h1>
            <div className={`text-lg md:text-xl font-orbitron font-black uppercase italic tracking-[0.1em] mb-1 ${getRankColor(player.rank)}`}>Rank {player.rank}</div>
            <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden border border-white/5 shadow-inner mb-2">
              <div className={`h-full transition-all duration-1000 ${player.rank === Rank.S ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : 'bg-sky-500 shadow-[0_0_10px_#0ea5e9]'}`} style={{ width: `${getRankProgress()}%` }}></div>
            </div>
            <div className="text-[10px] md:text-xs text-sky-400 font-orbitron font-black uppercase tracking-[0.5em] opacity-80">Nível {player.level}</div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-8 pb-10">
            
            {activeView === 'home' && (
              <>
                <section className="animate-in fade-in slide-in-from-bottom duration-500">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[10px] font-orbitron font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Dna size={12} className="text-sky-500" /> Missão do Sistema
                    </h2>
                    <div className={`flex items-center gap-1.5 px-3 py-0.5 rounded border-2 transition-all ${timeLeft <= 3600 ? 'border-red-500 text-red-500 animate-pulse' : 'border-sky-500/30 text-sky-400 bg-sky-500/5'}`}>
                      <Clock size={10} />
                      <span className="text-[10px] font-orbitron font-black">{formatTime(timeLeft)}</span>
                    </div>
                  </div>
                  {dailyQuest && (
                    <div className="system-gradient border border-sky-500/20 p-3 rounded-xl flex items-center justify-between shadow-lg relative group overflow-hidden">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-950 border border-sky-500/20 text-sky-400">
                          {MISSION_CATEGORIES.find(m => m.name === dailyQuest.name)?.icon || <Zap size={16} />}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-white uppercase font-orbitron tracking-tight">{dailyQuest.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-orbitron font-black text-sky-500">{dailyQuest.displayTarget}</span>
                            <span className="text-[9px] font-orbitron font-black text-emerald-400">+{dailyQuest.rewardXP} XP</span>
                            <span className="text-[9px] font-orbitron font-black text-amber-500">+{dailyQuest.rewardRank} PTS</span>
                          </div>
                        </div>
                      </div>
                      <button onClick={completeDailyQuest} disabled={dailyQuest.completed} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase font-orbitron tracking-widest transition-all border ${dailyQuest.completed ? 'border-emerald-500/20 text-emerald-500/30' : 'border-sky-500/60 text-white bg-sky-900/40 hover:bg-sky-500 hover:text-slate-950'}`}>
                        {dailyQuest.completed ? 'OK' : 'Concluir'}
                      </button>
                    </div>
                  )}
                </section>

                <section className="animate-in fade-in slide-in-from-bottom duration-700 delay-150">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-[10px] font-orbitron font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <LayoutDashboard size={12} className="text-sky-500" /> Protocolos de Jogador
                    </h2>
                    <span className="text-[9px] font-orbitron font-bold text-slate-700 uppercase">Prioritários</span>
                  </div>
                  <div className="space-y-3">
                    {availableQuests.length === 0 ? (
                      <div className="text-center py-12 border-2 border-dashed border-slate-900 rounded-xl">
                        <p className="text-slate-800 font-orbitron text-[9px] uppercase tracking-[0.3em]">
                          {quests.length > availableQuests.length ? 'Sincronizando próximo ciclo de diretrizes...' : 'Nenhum protocolo ativo.'}
                        </p>
                      </div>
                    ) : (
                      availableQuests.map(q => (
                        <div key={q.id} className={`bg-slate-900/40 border-l-4 p-3 rounded-xl flex items-center justify-between hover:bg-slate-900/60 transition-all group relative overflow-hidden ${
                          q.priority === Priority.HIGH ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 
                          q.priority === Priority.MEDIUM ? 'border-indigo-500' : 'border-sky-500'
                        }`}>
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`p-2 rounded-lg border flex items-center justify-center ${
                              q.priority === Priority.HIGH ? 'border-red-500/30 text-red-500' : 
                              q.priority === Priority.MEDIUM ? 'border-indigo-500/30 text-indigo-400' : 
                              'border-sky-500/30 text-sky-400'
                            }`}>
                              {q.priority === Priority.HIGH ? <ShieldAlert size={16} /> : <Target size={16} />}
                            </div>
                            <div className="flex-1 mr-4">
                              <h3 className="text-xs font-bold text-slate-300 uppercase font-orbitron tracking-tight mb-1 flex items-center gap-2">
                                {q.name}
                                {q.priority === Priority.HIGH && <span className="text-[8px] font-orbitron bg-red-500/10 text-red-500 px-1 border border-red-500/20 rounded">ALTA</span>}
                                {q.recurrence !== Recurrence.NONE && <RefreshCw size={10} className="text-sky-500 animate-spin-slow" />}
                              </h3>
                              <div className="flex flex-col gap-1">
                                {q.description && (
                                  <p className="text-[9px] text-slate-500 italic truncate max-w-[200px]">"{q.description}"</p>
                                )}
                                <div className="flex items-center gap-3">
                                  <div className="flex-1 h-1 bg-slate-950 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all duration-700 ${q.current >= q.target ? 'bg-emerald-500' : 'bg-sky-600'}`} style={{ width: `${(q.current / q.target) * 100}%` }}></div>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-[8px] font-orbitron font-black text-emerald-400/60">+{q.rewardXP} XP</span>
                                    <span className="text-[8px] font-orbitron font-black text-amber-400/60">+{q.rewardRankPoints} PTS</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => updatePlayerQuest(q.id)} disabled={q.current >= q.target} className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase font-orbitron tracking-widest border transition-all ${q.current >= q.target ? 'border-emerald-500/10 text-emerald-500/30' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-sky-500 hover:text-sky-400'}`}>
                              {q.current >= q.target ? 'Check' : 'OK'}
                            </button>
                            <button onClick={() => setQuests(quests.filter(item => item.id !== q.id))} className="text-slate-800 hover:text-red-500 ml-1 transition-colors"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </>
            )}

            {activeView === 'progress' && (
              <div className="animate-in fade-in slide-in-from-right duration-500 space-y-8">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                      <TrendingUp size={20} />
                   </div>
                   <h2 className="text-sm font-orbitron font-black text-white uppercase tracking-widest">Progresso do Chamado</h2>
                </div>

                <div className="bg-slate-900/30 p-6 rounded-2xl border border-sky-500/10 shadow-2xl space-y-6 relative overflow-hidden group">
                   <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="text-[9px] font-orbitron font-black text-sky-500 uppercase tracking-widest">Autoridade de Rank</span>
                        <div className={`text-3xl font-orbitron font-black italic tracking-wider ${getRankColor(player.rank)}`}>
                          Rank {player.rank}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[9px] font-orbitron font-black text-slate-500 uppercase tracking-widest">Pontos de Rank</span>
                        <div className="text-xl font-orbitron font-bold text-white">
                          {player.rankPoints} <span className="text-xs text-slate-600 font-medium">PTS</span>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-orbitron font-bold uppercase tracking-widest text-slate-400">
                        <span>Sincronização</span>
                        <span>{getRankProgress().toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden shadow-inner border border-white/5">
                        <div 
                          className={`h-full transition-all duration-1000 shadow-[0_0_10px_rgba(14,165,233,0.3)] ${player.rank === Rank.S ? 'bg-amber-400' : 'bg-sky-500'}`} 
                          style={{ width: `${getRankProgress()}%` }}
                        ></div>
                      </div>
                      {getPointsToNextRank() > 0 && (
                        <div className="text-[8px] font-orbitron font-black text-amber-500 uppercase tracking-widest text-right mt-1">
                          Faltam {getPointsToNextRank()} pontos para o próximo Rank
                        </div>
                      )}
                   </div>
                   <Activity size={80} className="absolute -right-4 -bottom-4 text-sky-500/5 rotate-12 group-hover:text-sky-500/10 transition-colors" />
                </div>

                <div className="bg-slate-900/30 p-6 rounded-2xl border border-sky-500/10 shadow-2xl space-y-6 relative overflow-hidden group">
                   <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="text-[9px] font-orbitron font-black text-emerald-500 uppercase tracking-widest">Nível Evolutivo</span>
                        <div className="text-3xl font-orbitron font-black italic tracking-wider text-white">
                          Nível {player.level}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[9px] font-orbitron font-black text-slate-500 uppercase tracking-widest">Experiência Atual</span>
                        <div className="text-xl font-orbitron font-bold text-white">
                          {player.exp} <span className="text-xs text-slate-600 font-medium">/ {player.expToNext} XP</span>
                        </div>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-orbitron font-bold uppercase tracking-widest text-slate-400">
                        <span>Potencial Orgânico</span>
                        <span>{((player.exp / player.expToNext) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden shadow-inner border border-white/5">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-1000 shadow-[0_0_10_rgba(16,185,129,0.3)]" 
                          style={{ width: `${(player.exp / player.expToNext) * 100}%` }}
                        ></div>
                      </div>
                      <div className="text-[8px] font-orbitron font-black text-emerald-400 uppercase tracking-widest text-right mt-1">
                        {player.expToNext - player.exp} XP para o próximo nível
                      </div>
                   </div>
                   <Zap size={80} className="absolute -right-4 -bottom-4 text-emerald-500/5 -rotate-12 group-hover:text-emerald-500/10 transition-colors" />
                </div>
              </div>
            )}

            {activeView === 'completed' && (
              <div className="animate-in fade-in slide-in-from-bottom duration-500 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                   <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <History size={20} />
                   </div>
                   <h2 className="text-sm font-orbitron font-black text-white uppercase tracking-widest">Arquivo de Protocolos Finalizados</h2>
                </div>

                <div className="space-y-3">
                  {completedQuests.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-slate-900 rounded-xl">
                      <p className="text-slate-800 font-orbitron text-[9px] uppercase tracking-[0.3em]">Nenhum protocolo arquivado.</p>
                    </div>
                  ) : (
                    completedQuests.map((q, idx) => (
                      <div key={idx} className="bg-slate-900/20 border border-emerald-500/10 p-4 rounded-xl flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-500">
                            <CheckCircle size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xs font-bold text-slate-200 uppercase font-orbitron tracking-tight">{q.name}</h3>
                              <span className={`text-[8px] font-orbitron px-1.5 py-0.5 rounded border ${q.source === 'SISTEMA' ? 'border-sky-500/30 text-sky-400 bg-sky-500/5' : 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5'}`}>
                                {q.source}
                              </span>
                              {q.recurrence && q.recurrence !== Recurrence.NONE && (
                                <span className="text-[7px] font-orbitron px-1 py-0.5 rounded border border-amber-500/30 text-amber-500 uppercase">
                                  {q.recurrence}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-1">
                               <span className="text-[9px] font-orbitron font-bold text-slate-500 uppercase">
                                 {new Date(q.completedAt).toLocaleDateString()} - {new Date(q.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                               </span>
                               <div className="flex gap-3">
                                 <span className="text-[9px] font-orbitron font-black text-emerald-500">+{q.rewardXP} XP</span>
                                 <span className="text-[9px] font-orbitron font-black text-amber-500">+{q.rewardRankPoints || q.rewardRank} PTS</span>
                               </div>
                            </div>
                            {q.description && (
                              <p className="text-[9px] text-slate-600 italic mt-1">"{q.description}"</p>
                            )}
                          </div>
                        </div>
                        <div className="text-[8px] font-orbitron font-black text-emerald-500 uppercase tracking-widest opacity-40 group-hover:opacity-100 transition-opacity hidden sm:block">Sincronizado</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeView === 'create' && (
              <div className="animate-in fade-in slide-in-from-left duration-500">
                <h2 className="text-[10px] font-orbitron font-black text-white uppercase mb-6 tracking-widest">Registrar Diretriz Manual</h2>
                <div className="space-y-6 bg-slate-900/30 p-6 rounded-2xl border border-sky-500/10 shadow-2xl backdrop-blur-sm">
                  <div className="space-y-1">
                    <label className="text-[9px] font-orbitron font-black text-sky-500 uppercase tracking-widest ml-1">Identificador do Protocolo</label>
                    <input type="text" placeholder="EX: TREINAMENTO DE RESISTÊNCIA" value={newQuest.name} onChange={e => setNewQuest({...newQuest, name: e.target.value})} className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white font-orbitron text-xs focus:border-sky-500 outline-none" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-orbitron font-black text-sky-500 uppercase tracking-widest ml-1">Nível de Prioridade</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: Priority.LOW, label: 'Baixa', color: 'border-sky-500/30 text-sky-500', active: 'bg-sky-500/10 border-sky-500' },
                          { id: Priority.MEDIUM, label: 'Média', color: 'border-indigo-500/30 text-indigo-400', active: 'bg-indigo-500/10 border-indigo-500' },
                          { id: Priority.HIGH, label: 'Alta', color: 'border-red-500/30 text-red-500', active: 'bg-red-500/10 border-red-500' }
                        ].map(p => (
                          <button 
                            key={p.id} 
                            onClick={() => setNewQuest({...newQuest, priority: p.id})}
                            className={`py-2 px-1 border rounded-lg font-orbitron font-black uppercase text-[8px] transition-all tracking-widest ${newQuest.priority === p.id ? p.active : p.color + ' opacity-40 hover:opacity-100'}`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-orbitron font-black text-sky-500 uppercase tracking-widest ml-1">Frequência de Ciclo</label>
                      <select 
                        value={newQuest.recurrence}
                        onChange={e => setNewQuest({...newQuest, recurrence: e.target.value as Recurrence})}
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-2 text-white font-orbitron text-[10px] focus:border-sky-500 outline-none uppercase tracking-widest h-[42px]"
                      >
                        {Object.values(Recurrence).map(rec => (
                          <option key={rec} value={rec} className="bg-slate-900">{rec}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-orbitron font-black text-sky-500 uppercase tracking-widest ml-1">observaçoes (opcional)</label>
                    <textarea 
                      placeholder="DETALHES ADICIONAIS DO PROTOCOLO..." 
                      value={newQuest.description} 
                      onChange={e => setNewQuest({...newQuest, description: e.target.value})} 
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white font-orbitron text-xs shadow-inner min-h-[80px] focus:border-sky-500 outline-none resize-none"
                    />
                  </div>
                  
                  <div className="p-3 bg-slate-950/50 rounded-xl border border-white/5 space-y-2">
                    <div className="flex justify-between text-[8px] font-orbitron font-bold uppercase tracking-widest text-slate-500">
                      <span>Projeção de Recompensa:</span>
                    </div>
                    <div className="flex gap-4">
                      <span className="text-[9px] font-orbitron font-black text-emerald-400">XP: {newQuest.priority === Priority.HIGH ? '10-18' : newQuest.priority === Priority.MEDIUM ? '10-15' : '5-12'}</span>
                      <span className="text-[9px] font-orbitron font-black text-amber-500">RANK: {newQuest.priority === Priority.HIGH ? '13-20' : newQuest.priority === Priority.MEDIUM ? '10-13' : '5-9'}</span>
                    </div>
                  </div>

                  <button onClick={handleCreateQuest} className="w-full py-5 bg-sky-900/30 hover:bg-sky-600 text-white font-orbitron font-black uppercase tracking-[0.4em] transition-all rounded-xl text-[10px] border border-sky-500/30 shadow-lg active:scale-95">ATIVAR DIRETRIZ</button>
                </div>
              </div>
            )}

            {activeView === 'settings' && (
              <div className="animate-in fade-in zoom-in duration-500 space-y-6">
                <h2 className="text-[10px] font-orbitron font-black text-white uppercase tracking-widest">Status da Identidade</h2>
                
                <div className="bg-slate-900/30 p-6 rounded-2xl border border-sky-500/10 shadow-2xl">
                  <label className="text-[9px] font-orbitron font-black text-sky-500 uppercase tracking-widest mb-2 block ml-1">Codinome Sincronizado</label>
                  <div className="flex gap-2">
                    <input type="text" placeholder={player.name} value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-white font-orbitron text-xs focus:border-sky-500 outline-none shadow-inner" />
                    <button onClick={() => { if(newName.trim()){ setPlayer({...player, name: newName}); setNewName(""); setActiveView('home'); } }} className="px-5 bg-sky-800/40 text-white font-orbitron font-black uppercase text-[9px] rounded-xl hover:bg-sky-500 transition-all border border-sky-500/20">SINC</button>
                  </div>
                </div>

                <div className="bg-slate-900/30 p-6 rounded-2xl border border-sky-500/10 shadow-2xl flex flex-col items-center">
                  <h3 className="text-[10px] font-orbitron font-black text-white uppercase tracking-widest mb-4 border-b border-white/5 pb-2 w-full text-center">Matriz de Atributos</h3>
                  <RadarChart stats={player.stats} />
                </div>

                <div className="bg-slate-900/30 p-6 rounded-2xl border border-sky-500/10 shadow-2xl space-y-5">
                   {[
                     { id: 'force', label: 'Força', icon: <Sword size={14} className="text-red-500" /> },
                     { id: 'intelligence', label: 'Inteligência', icon: <Brain size={14} className="text-blue-400" /> },
                     { id: 'focus', label: 'Foco', icon: <Target size={14} className="text-emerald-400" /> },
                     { id: 'vitality', label: 'Vitalidade', icon: <Heart size={14} className="text-rose-500" /> },
                     { id: 'charisma', label: 'Carisma', icon: <Sparkles size={14} className="text-amber-400" /> }
                   ].map(stat => (
                     <div key={stat.id} className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-orbitron font-bold uppercase tracking-widest">
                           <div className="flex items-center gap-2">
                              {stat.icon}
                              <span className="text-slate-400">{stat.label}</span>
                           </div>
                           <span className="text-white">{player.stats[stat.id as keyof Player['stats']]}/50</span>
                        </div>
                        <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden shadow-inner">
                           <div className="h-full bg-sky-500 transition-all duration-1000 shadow-[0_0_8px_#0ea5e9]" style={{ width: `${(player.stats[stat.id as keyof Player['stats']] / 50) * 100}%` }}></div>
                        </div>
                     </div>
                   ))}
                </div>

                <button onClick={() => { if(confirm("ANNIHILAR STATUS? TODOS OS DADOS SERÃO PERDIDOS.")) { localStorage.clear(); window.location.reload(); } }} className="w-full py-4 border border-red-900/20 text-red-900 hover:bg-red-500/5 font-black uppercase text-[9px] rounded-xl font-orbitron transition-all">REINICIAR SISTEMA CENTRAL</button>
              </div>
            )}
          </div>
        </main>
      </div>

      {modal.isOpen && <SystemModal title={modal.title} message={modal.message} type={modal.type} onClose={() => setModal(prev => ({ ...prev, isOpen: false }))} />}
    </div>
  );
};

export default App;
