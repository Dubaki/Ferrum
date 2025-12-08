import React, { useState } from 'react';
import { Plus, User, MapPin, Phone, Calendar, Briefcase, Trash2, Archive, X, Save, ShieldAlert } from 'lucide-react';

export default function ResourcesTab({ resources, setResources, actions }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState(null); // Если null, значит создаем нового
  const [showArchive, setShowArchive] = useState(false);

  const openNewResourceModal = () => {
      setSelectedResource(null);
      setIsModalOpen(true);
  };

  const openEditModal = (res) => {
      setSelectedResource(res);
      setIsModalOpen(true);
  };

  // Фильтр списка
  const visibleResources = resources.filter(r => showArchive ? r.status === 'fired' : r.status !== 'fired');

  return (
    <div className="pb-20 fade-in">
      
      {/* Заголовок */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-8">
          <div>
              <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
                  <User className="text-orange-600" size={32} />
                  Сотрудники
              </h2>
              <p className="text-sm text-slate-500 font-medium tracking-wide border-l-2 border-orange-500 pl-2 mt-1">
                  УПРАВЛЕНИЕ ПЕРСОНАЛОМ
              </p>
          </div>
          
          <div className="flex gap-3">
              <button 
                onClick={() => setShowArchive(!showArchive)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition
                    ${showArchive ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}
                `}
              >
                  <Archive size={18} /> {showArchive ? 'Назад к активным' : 'Архив уволенных'}
              </button>
              
              {!showArchive && (
                  <button 
                    onClick={openNewResourceModal}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-2.5 rounded-lg shadow-lg hover:shadow-orange-500/50 transition-all active:scale-95 font-bold uppercase tracking-wide text-sm"
                  >
                    <Plus size={18} strokeWidth={3} /> Добавить
                  </button>
              )}
          </div>
      </div>

      {/* Сетка карточек */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleResources.map(res => (
              <div 
                key={res.id} 
                onClick={() => openEditModal(res)}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
              >
                  {/* Статус Уволен (полоска) */}
                  {res.status === 'fired' && <div className="absolute top-0 left-0 w-full h-1 bg-slate-400"></div>}
                  
                  <div className="flex items-start gap-4">
                      {/* Аватар */}
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-2xl group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors shrink-0 overflow-hidden">
                          {res.photoUrl ? <img src={res.photoUrl} alt={res.name} className="w-full h-full object-cover"/> : res.name.charAt(0)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-slate-800 truncate group-hover:text-orange-600 transition-colors">{res.name}</h3>
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{res.position || 'Сотрудник'}</div>
                          
                          <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Phone size={12} className="text-slate-300"/> {res.phone || 'Нет телефона'}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <MapPin size={12} className="text-slate-300"/> {res.address || 'Адрес не указан'}
                              </div>
                          </div>
                      </div>
                  </div>
              </div>
          ))}
          
          {visibleResources.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                  Список пуст.
              </div>
          )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО СОТРУДНИКА */}
      {isModalOpen && (
          <EmployeeModal 
              resource={selectedResource} 
              onClose={() => setIsModalOpen(false)} 
              actions={actions}
          />
      )}
    </div>
  );
}

// =================================================================================================
// МОДАЛКА (РЕДАКТИРОВАНИЕ / СОЗДАНИЕ)
// =================================================================================================
function EmployeeModal({ resource, onClose, actions }) {
    // Начальный стейт (или пустой для нового)
    const [formData, setFormData] = useState({
        name: resource?.name || '',
        position: resource?.position || '',
        phone: resource?.phone || '',
        address: resource?.address || '',
        dob: resource?.dob || '',
        employmentDate: resource?.employmentDate || new Date().toISOString().split('T')[0],
        baseRate: resource?.baseRate || '',
        photoUrl: resource?.photoUrl || ''
    });

    const isEditing = !!resource;

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!formData.name) return alert("Введите имя сотрудника");
        
        if (isEditing) {
            // Обновляем каждое поле
            Object.keys(formData).forEach(key => {
                if (formData[key] !== resource[key]) {
                    actions.updateResource(resource.id, key, formData[key]);
                }
            });
        } else {
            // Создаем нового
            await actions.addResource(formData);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Шапка */}
                <div className="bg-slate-900 p-6 text-white flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold">{isEditing ? formData.name : 'Новый сотрудник'}</h2>
                        <p className="text-slate-400 text-sm font-medium">{isEditing ? 'Редактирование профиля' : 'Заполните данные'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"><X size={20}/></button>
                </div>

                {/* Форма */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-5">
                    
                    {/* Фото (URL) */}
                    <div className="flex gap-4 items-center">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0 overflow-hidden">
                            {formData.photoUrl ? <img src={formData.photoUrl} className="w-full h-full object-cover"/> : <User size={32} className="text-slate-300"/>}
                        </div>
                        <div className="flex-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Ссылка на фото</label>
                            <input 
                                type="text" 
                                value={formData.photoUrl}
                                onChange={e => handleChange('photoUrl', e.target.value)}
                                className="w-full border-b border-slate-200 py-2 text-sm outline-none focus:border-orange-500 bg-transparent placeholder-slate-300"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">ФИО</label>
                            <input 
                                type="text" 
                                value={formData.name}
                                onChange={e => handleChange('name', e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-lg p-2.5 font-bold text-slate-800 focus:border-orange-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Должность</label>
                            <input 
                                type="text" 
                                value={formData.position}
                                onChange={e => handleChange('position', e.target.value)}
                                className="w-full border-2 border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:border-orange-500 outline-none transition"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Телефон</label>
                            <input 
                                type="text" 
                                value={formData.phone}
                                onChange={e => handleChange('phone', e.target.value)}
                                className="w-full border-b border-slate-200 py-2 text-sm outline-none focus:border-orange-500"
                                placeholder="+7..."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Дата рождения</label>
                            <input 
                                type="date" 
                                value={formData.dob}
                                onChange={e => handleChange('dob', e.target.value)}
                                className="w-full border-b border-slate-200 py-2 text-sm outline-none focus:border-orange-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Адрес проживания</label>
                        <input 
                            type="text" 
                            value={formData.address}
                            onChange={e => handleChange('address', e.target.value)}
                            className="w-full border-b border-slate-200 py-2 text-sm outline-none focus:border-orange-500"
                            placeholder="Город, улица, дом..."
                        />
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl space-y-4 border border-slate-100">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Ставка (₽/смена)</label>
                                <input 
                                    type="number" 
                                    value={formData.baseRate}
                                    onChange={e => handleChange('baseRate', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded p-2 text-sm font-bold outline-none focus:border-orange-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Дата приема</label>
                                <input 
                                    type="date" 
                                    value={formData.employmentDate}
                                    onChange={e => handleChange('employmentDate', e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded p-2 text-sm outline-none focus:border-orange-500"
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Футер */}
                <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                    {isEditing && resource.status !== 'fired' ? (
                        <button 
                            onClick={() => {
                                actions.fireResource(resource.id);
                                onClose();
                            }}
                            className="text-red-500 font-bold text-xs hover:bg-red-50 px-3 py-2 rounded transition flex items-center gap-1"
                        >
                            <ShieldAlert size={16}/> УВОЛИТЬ
                        </button>
                    ) : (
                        <div></div>
                    )}

                    <div className="flex gap-3">
                        {isEditing && resource.status === 'fired' && (
                             <button onClick={() => actions.deleteResource(resource.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={20}/></button>
                        )}
                        <button onClick={onClose} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-800 transition">Отмена</button>
                        <button 
                            onClick={handleSave}
                            className="px-8 py-2.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-orange-600 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Save size={18}/> Сохранить
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}