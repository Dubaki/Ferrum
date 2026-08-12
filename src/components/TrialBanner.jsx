import { useState } from 'react';
import { AlertTriangle, Lock, Key, ShieldCheck, CreditCard } from 'lucide-react';

export default function TrialBanner({ daysLeft, isExpired, isUnlocked, onUnlock }) {
  const [inputPassword, setInputPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  if (isUnlocked) {
    return null;
  }

  const handleUnlockSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');
    const success = onUnlock(inputPassword);
    if (!success) {
      setErrorMsg('Неверный код доступа! Пароль для отмены: fer25_paid');
    } else {
      setInputPassword('');
      setShowPasswordModal(false);
    }
  };

  // 1. ПОЛНАЯ БЛОКИРОВКА ПРИЛОЖЕНИЯ ПОСЛЕ 27 АВГУСТА (0 дней)
  if (isExpired || daysLeft <= 0) {
    return (
      <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white text-center select-none pointer-events-auto">
        <div className="max-w-lg w-full bg-slate-900 border-2 border-red-500/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Декоративное свечение */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl"></div>

          <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner text-red-500">
            <Lock className="w-10 h-10 animate-pulse" />
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
            Приложение заблокировано
          </h1>

          <p className="text-slate-300 text-base mb-6 leading-relaxed">
            Бесплатная версия закончена. 27 августа 15-дневный бесплатный период истек. 
            Программа закрыта. Просьба ввести код-пароль оплаты для возобновления доступа.
          </p>

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div>
              <label className="block text-left text-xs font-semibold text-slate-400 mb-2">
                Код-пароль оплаты:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="Введите пароль fer25_paid..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-red-500 transition shadow-inner font-mono text-sm"
                  autoFocus
                />
                <Key className="w-5 h-5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {errorMsg && (
              <div className="text-red-400 text-xs font-semibold bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-red-500/25 transition-all duration-200 active:scale-98 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              Снять блокировку
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-500">
            Для возобновления работы введите код <code className="text-orange-400 font-mono">fer25_paid</code>
          </div>
        </div>
      </div>
    );
  }

  // 2. ПОЛУПРОЗРАЧНЫЙ БАННЕР НА ПОЛ-ЭКРАНА (ПРОПУСКАЕТ КЛИКИ В ПРИЛОЖЕНИЕ!)
  return (
    <>
      <div 
        className={`fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none transition-all duration-500 ease-in-out ${
          isMinimized ? 'h-16 bg-slate-950/80 border-t border-orange-500/40' : 'h-[48vh] min-h-[360px] bg-slate-950/70 backdrop-blur-sm border-t-4 border-orange-500/90 shadow-2xl'
        }`}
      >
        <div className="max-w-6xl mx-auto h-full px-6 py-5 flex flex-col justify-between text-white relative">
          
          {/* Верхняя панель переключателей (интерактивна через pointer-events-auto) */}
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3 pointer-events-auto">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500 animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-orange-400">
                Бесплатный период активен
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-100 px-3 py-1.5 rounded-lg border border-slate-600 transition flex items-center gap-1.5 shadow-md"
                title="Ввести пароль fer25_paid"
              >
                <Key className="w-3.5 h-3.5 text-orange-400" />
                Ввести код-пароль
              </button>

              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-600 transition"
              >
                {isMinimized ? 'Развернуть ▲' : 'Свернуть ▼'}
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="my-auto flex flex-col items-center text-center max-w-3xl mx-auto py-2">
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-semibold mb-3">
                <AlertTriangle className="w-4 h-4 text-orange-400" />
                Работа в приложении доступна через прозрачную надпись
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-3 leading-tight drop-shadow-md">
                Бесплатная версия закончена, через{' '}
                <span className="text-orange-400 underline underline-offset-4 decoration-orange-500">
                  {daysLeft} {daysLeft === 1 ? 'день' : (daysLeft >= 2 && daysLeft <= 4 ? 'дня' : 'дней')}
                </span>{' '}
                приложение будет закрыто!
              </h2>

              <p className="text-slate-200 text-sm sm:text-base mb-5 leading-relaxed max-w-2xl drop-shadow">
                27 августа 2026 года доступ будет заблокирован. Вы можете продолжать пользоваться приложением прямо сейчас сквозь эту плашку. Для снятия ограничения введите код-пароль.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold px-6 py-3 rounded-xl shadow-xl hover:shadow-orange-500/30 transition flex items-center gap-2 text-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  Оплатить подписку / Ввести пароль
                </button>
              </div>
            </div>
          )}

          {isMinimized && (
            <div className="flex items-center justify-between text-xs text-slate-200 pointer-events-auto">
              <span className="font-semibold text-orange-400">
                ⚠️ Бесплатная версия закончена, через {daysLeft} дн. приложение будет закрыто (27 августа). Можно работать сквозь прозрачную надпись.
              </span>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="text-orange-400 hover:underline font-bold"
              >
                Ввести код-пароль
              </button>
            </div>
          )}

          <div className="text-center text-[11px] text-slate-400 pt-2 border-t border-slate-800/40">
            Окончательное закрытие программы: 27 августа 2026 г. Пароль отмены: <code className="text-orange-400">fer25_paid</code>
          </div>
        </div>
      </div>

      {/* Модальное окно ввода пароля разблокировки */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl text-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Key className="w-5 h-5 text-orange-400" />
                Ввод пароля подписки
              </h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setErrorMsg('');
                }}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-300 text-xs mb-4">
              Введите код-пароль <code className="text-orange-400 font-mono">fer25_paid</code> для полного отключения надписи и снятия таймера.
            </p>

            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              <input
                type="password"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                placeholder="Введи fer25_paid..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-sm font-mono"
                autoFocus
              />

              {errorMsg && (
                <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/30 rounded-lg p-2">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setErrorMsg('');
                  }}
                  className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-2.5 rounded-xl text-sm"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl text-sm shadow-md"
                >
                  Подтвердить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
