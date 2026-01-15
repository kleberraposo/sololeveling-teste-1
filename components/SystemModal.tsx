
import React from 'react';

interface SystemModalProps {
  title: string;
  message: string;
  onClose: () => void;
  type?: 'alert' | 'info' | 'reward';
}

export const SystemModal: React.FC<SystemModalProps> = ({ title, message, onClose, type = 'info' }) => {
  const borderColor = type === 'alert' ? 'border-red-500' : type === 'reward' ? 'border-emerald-400' : 'border-sky-400';
  const textColor = type === 'alert' ? 'text-red-400' : type === 'reward' ? 'text-emerald-300' : 'text-sky-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className={`w-full max-w-md system-gradient border-2 ${borderColor} p-6 relative animate-in fade-in zoom-in duration-300`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className={`font-orbitron text-xl font-bold ${textColor} uppercase tracking-widest`}>
            {title}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-slate-200 leading-relaxed font-medium italic">
            "{message}"
          </p>
          <button 
            onClick={onClose}
            className={`w-full py-2 border ${borderColor} ${textColor} hover:bg-sky-400/10 transition-all font-orbitron font-bold uppercase tracking-wider`}
          >
            Confirmar
          </button>
        </div>
        {/* Decorative elements */}
        <div className={`absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 ${borderColor}`}></div>
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 ${borderColor}`}></div>
      </div>
    </div>
  );
};
