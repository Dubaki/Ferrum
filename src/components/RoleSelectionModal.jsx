import { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { SUPPLY_ROLES } from '../utils/supplyRoles';

export default function RoleSelectionModal({ onClose, onSelectRole }) {
  const [selectedRole, setSelectedRole] = useState(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedRole) {
      setError('Выберите должность');
      return;
    }

    // Проверяем пароль
    const roleData = SUPPLY_ROLES[selectedRole];
    if (password === roleData.password) {
      onSelectRole(selectedRole);
    } else {
      setError('Неверный пароль');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Заголовок */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Lock size={24} />
            <div>
              <h2 className="text-xl font-bold">Вход в систему</h2>
              <p className="text-slate-300 text-sm">Выберите вашу должность</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Выбор роли */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Ваша должность
            </label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(SUPPLY_ROLES).map(([key, data]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedRole(key);
                    setError('');
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedRole === key
                      ? 'border-cyan-500 bg-cyan-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-2xl mb-2">{data.icon}</div>
                  <div className="text-sm font-bold text-slate-800">{data.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Пароль */}
          {selectedRole && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Пароль
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="Введите пароль"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                autoFocus
              />
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          {/* Кнопки */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!selectedRole}
              className={`flex-1 px-4 py-3 rounded-lg transition font-medium ${
                selectedRole
                  ? 'bg-cyan-600 text-white hover:bg-cyan-700'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
