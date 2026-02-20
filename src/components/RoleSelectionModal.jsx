import React, { useState, useMemo, memo } from 'react';
import { X, Lock } from 'lucide-react';
import { SUPPLY_ROLES } from '../utils/supplyRoles';

// Мемоизированная кнопка роли для исключения лишних ререндеров при вводе пароля
const RoleButton = memo(({ roleKey, data, isSelected, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(roleKey)}
    className={`p-4 rounded-lg border-2 transition-all text-left group ${
      isSelected
        ? 'border-cyan-500 bg-cyan-50 shadow-md ring-2 ring-cyan-500/20'
        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
    }`}
  >
    <div className="text-2xl mb-2 transition-transform group-hover:scale-110 duration-300">{data.icon}</div>
    <div className={`text-sm font-black uppercase tracking-tight ${isSelected ? 'text-cyan-700' : 'text-slate-800'}`}>
      {data.label}
    </div>
  </button>
));

export default function RoleSelectionModal({ onClose, onSelectRole }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Мемоизируем массив ролей, чтобы не пересчитывать его при вводе каждого символа пароля
  const rolesList = useMemo(() => Object.entries(SUPPLY_ROLES), []);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedRole) {
      setError('Выберите должность');
      return;
    }

    const roleData = SUPPLY_ROLES[selectedRole];
    if (password === roleData.password) {
      onSelectRole(selectedRole);
    } else {
      setError('Неверный пароль');
      // Очищаем пароль при ошибке для безопасности и удобства повторного ввода
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Заголовок с градиентом */}
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black text-white p-6 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
              <Lock size={20} className="text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-widest leading-none">Вход</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-1.5">Авторизация сотрудника</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-all active:scale-90 relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-white">
          {/* Выбор роли */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1">
              Выберите должность
            </label>
            <div className="grid grid-cols-2 gap-3">
              {rolesList.map(([key, data]) => (
                <RoleButton
                  key={key}
                  roleKey={key}
                  data={data}
                  isSelected={selectedRole === key}
                  onClick={(k) => {
                    setSelectedRole(k);
                    setError('');
                  }}
                />
              ))}
            </div>
          </div>

          {/* Пароль - появляется плавно */}
          <div className={`transition-all duration-500 ease-out ${selectedRole ? 'opacity-100 translate-y-0 max-h-40' : 'opacity-0 -translate-y-4 max-h-0 pointer-events-none'}`}>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">
              Пароль
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl focus:outline-none transition-all duration-300 font-black tracking-[0.3em] text-lg ${
                  error 
                    ? 'border-red-200 text-red-500 focus:border-red-500' 
                    : 'border-slate-100 text-slate-900 focus:border-cyan-500 focus:bg-white focus:shadow-xl focus:shadow-cyan-100'
                }`}
                autoFocus
              />
              {password && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]"></div>
              )}
            </div>
          </div>

          {/* Сообщение об ошибке */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider animate-in slide-in-from-top-2 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {error}
            </div>
          )}

          {/* Кнопки управления */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 hover:text-slate-600 transition-all font-black uppercase tracking-widest text-[10px]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!selectedRole || !password}
              className={`flex-1 px-4 py-4 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] shadow-lg ${
                selectedRole && password
                  ? 'bg-slate-900 text-white hover:bg-cyan-600 hover:shadow-cyan-200 active:scale-95'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              Войти в систему
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
