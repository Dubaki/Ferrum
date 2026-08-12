import { useState } from 'react';
import { AlertTriangle, Lock, Key, ShieldCheck, CreditCard, Phone } from 'lucide-react';

export default function TrialBanner({ daysLeft, isExpired, isUnlocked, onUnlock }) {
  const [inputPassword, setInputPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isUnlocked) {
    return null;
  }

  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    
    try {
      const success = await onUnlock(inputPassword);
      if (!success) {
        setErrorMsg('Неверный код доступа! Свяжитесь с администратором для получения пароля.');
      } else {
        setInputPassword('');
        setShowPasswordModal(false);
      }
    } catch (err) {
      setErrorMsg('Ошибка проверки кода доступа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. ПОЛНАЯ БЛОКИРОВКА ПРИЛОЖЕНИЯ ПОСЛЕ 27 АВГУСТА (0 дней)
  if (isExpired || daysLeft <= 0) {
    return (
      <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-white text-center select-none pointer-events-auto">
        <div className="max-w-lg w-full bg-slate-900 border-2 border-red-500/40 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Телефон по центру сверху блокировки */}
          <div className="mb-6 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-sm">
            <Phone className="w-4 h-4" />
            <span>Телефон для связи: <a href="tel:+79221800911" className="underline hover:text-white">+7 922 18 00 911</a></span>
          </div>

          <div className="w-20 h-20 bg-red-500/10 border-2 border-red-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner text-red-500">
            <Lock className="w-10 h-10 animate-pulse" />
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
            Приложение заблокировано
          </h1>

          <p className="text-slate-300 text-base mb-6 leading-relaxed">
            Бесплатная версия закончена. 27 августа 15-дневный период использования истек. 
            Работа программы остановлена. Просьба ввести код доступа после оплаты подписки.
          </p>

          <form onSubmit={handleUnlockSubmit} className="space-y-4">
            <div>
              <label className="block text-left text-xs font-semibold text-slate-400 mb-2">
                Код разблокировки:
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="Введите пароль доступа..."
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
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-red-500/25 transition-all duration-200 active:scale-98 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              {isSubmitting ? 'Проверка...' : 'Снять блокировку'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
            Для получения пароля звоните: <a href="tel:+79221800911" className="text-orange-400 font-bold underline">+7 922 18 00 911</a>
          </div>
        </div>
      </div>
    );
  }

  // 2. БАННЕР НА ПОЛ-ЭКРАНА (ПРОЗРАЧНЫЙ, НЕ МЕШАЕТ НАЖИМАТЬ КНОПКИ ПОД НИМ!)
  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none h-[45vh] min-h-[340px] bg-slate-950/35 border-t-2 border-orange-500/80 shadow-2xl transition-all duration-300"
      >
        <div className="max-w-6xl mx-auto h-full px-6 py-4 flex flex-col justify-between text-white relative">
          
          {/* Телефон по центру сверху плашки */}
          <div className="flex items-center justify-between border-b border-slate-800/40 pb-2">
            <div className="flex-1 text-center pointer-events-auto">
              <a 
                href="tel:+79221800911" 
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/50 text-orange-300 hover:text-white hover:bg-orange-500/30 transition text-xs sm:text-sm font-extrabold shadow-lg"
              >
                <Phone className="w-4 h-4 text-orange-400 animate-pulse" />
                <span>Телефон для связи: <strong className="text-white">+7 922 18 00 911</strong></span>
              </a>
            </div>
            
            <button
              onClick={() => setShowPasswordModal(true)}
              className="pointer-events-auto text-xs bg-slate-800/90 hover:bg-slate-700 text-slate-100 px-3 py-1.5 rounded-lg border border-slate-600 transition flex items-center gap-1.5 shadow-md font-semibold shrink-0"
            >
              <Key className="w-3.5 h-3.5 text-orange-400" />
              Ввести код-пароль
            </button>
          </div>

          <div className="my-auto flex flex-col items-center text-center max-w-3xl mx-auto py-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-300 text-xs font-semibold mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              Бесплатный период использования
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight mb-2 leading-tight drop-shadow-lg">
              Бесплатная версия закончена, через{' '}
              <span className="text-orange-400 underline underline-offset-4 decoration-orange-500">
                {daysLeft} {daysLeft === 1 ? 'день' : (daysLeft >= 2 && daysLeft <= 4 ? 'дня' : 'дней')}
              </span>{' '}
              приложение будет закрыто!
            </h2>

            <p className="text-slate-200 text-xs sm:text-sm mb-4 leading-relaxed max-w-2xl drop-shadow">
              27 августа 2026 года доступ к системе будет заблокирован. Вы можете продолжать пользоваться приложением прямо сейчас сквозь эту плашку. Для снятия ограничения оплатите подписку.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pointer-events-auto">
              <button
                onClick={() => setShowPasswordModal(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-xl hover:shadow-orange-500/30 transition flex items-center gap-2 text-xs sm:text-sm"
              >
                <CreditCard className="w-4 h-4" />
                Оплатить подписку / Ввести пароль
              </button>
            </div>
          </div>

          <div className="text-center text-[11px] text-slate-300 pt-1 border-t border-slate-800/30">
            Телефон поддержки: <a href="tel:+79221800911" className="text-orange-400 font-bold underline pointer-events-auto">+7 922 18 00 911</a> | Окончательное закрытие: 27 августа 2026 г.
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
              Введите код доступа, полученный по телефону <strong className="text-orange-400">+7 922 18 00 911</strong> после оплаты подписки.
            </p>

            <form onSubmit={handleUnlockSubmit} className="space-y-4">
              <input
                type="password"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                placeholder="Введите пароль..."
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
                  disabled={isSubmitting}
                  className="w-1/2 bg-orange-600 hover:bg-orange-500 text-white font-bold py-2.5 rounded-xl text-sm shadow-md"
                >
                  {isSubmitting ? '...' : 'Подтвердить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
