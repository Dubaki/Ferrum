import React, { useState } from 'react';
import { Plus, Trash2, Calendar, BarChart3, Users } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('planning');
  const [resources, setResources] = useState([
    { id: 1, name: 'Сварщик 1', hoursPerDay: 8, available: true, extraHours: 0 },
    { id: 2, name: 'Сварщик 2', hoursPerDay: 8, available: true, extraHours: 0 },
    { id: 3, name: 'Сварщик 3', hoursPerDay: 8, available: true, extraHours: 0 },
    { id: 4, name: 'Слесарь 1', hoursPerDay: 8, available: true, extraHours: 0 },
    { id: 5, name: 'Слесарь 2', hoursPerDay: 8, available: true, extraHours: 0 },
    { id: 6, name: 'Слесарь 3', hoursPerDay: 8, available: true, extraHours: 0 },
    { id: 7, name: 'Плазморезчик', hoursPerDay: 8, available: true, extraHours: 0 },
    { id: 8, name: 'Лентопил', hoursPerDay: 8, available: true, extraHours: 0 },
    { id: 9, name: 'Покраска', hoursPerDay: 8, available: true, extraHours: 0 }
  ]);

  const [products, setProducts] = useState([
    {
      id: 1,
      name: 'Печь полимеризации',
      quantity: 1,
      startDate: new Date().toISOString().split('T')[0],
      operations: [
        { id: 1, name: 'Резка Лентопильный станок', resourceId: 8, hours: 3, sequence: 1 },
        { id: 2, name: 'Резка Плазморез', resourceId: 7, hours: 2, sequence: 2 },
        { id: 3, name: 'Сборка каркаса', resourceId: 1, hours: 14, sequence: 3 },
        { id: 4, name: 'Зачистка каркаса', resourceId: 4, hours: 4, sequence: 4 },
        { id: 5, name: 'Покраска каркаса', resourceId: 9, hours: 3, sequence: 5 },
        { id: 6, name: 'Обшивка каркаса', resourceId: 4, hours: 8, sequence: 6 },
        { id: 7, name: 'Заклёпка каркаса', resourceId: 5, hours: 3, sequence: 7 }
      ]
    },
    {
      id: 2,
      name: 'Пешеходные ограждения',
      quantity: 174,
      startDate: new Date().toISOString().split('T')[0],
      operations: [
        { id: 1, name: 'Резка Лентопильный станок', resourceId: 8, hours: 0.5, sequence: 1 },
        { id: 2, name: 'Сверловка', resourceId: 4, hours: 0.3, sequence: 2 },
        { id: 3, name: 'Сборка', resourceId: 1, hours: 0.4, sequence: 3 },
        { id: 4, name: 'Обварка', resourceId: 2, hours: 0.6, sequence: 4 },
        { id: 5, name: 'Зачистка', resourceId: 5, hours: 0.2, sequence: 5 },
        { id: 6, name: 'Упаковка и перемещение', resourceId: 5, hours: 0.1, sequence: 6 }
      ]
    }
  ]);

  const calculateResourceLoad = () => {
    const load = {};
    resources.forEach(res => {
      const dailyCapacity = res.available ? (res.hoursPerDay + res.extraHours) : 0;
      load[res.id] = {
        name: res.name,
        totalHours: 0,
        dailyCapacity: dailyCapacity,
        available: res.available
      };
    });

    products.forEach(product => {
      product.operations.forEach(op => {
        if (load[op.resourceId]) {
          load[op.resourceId].totalHours += op.hours * product.quantity;
        }
      });
    });

    return load;
  };

  const calculateGanttData = () => {
    const ganttData = [];

    products.forEach(product => {
      let productStartDate = new Date(product.startDate);
      
      product.operations.sort((a, b) => a.sequence - b.sequence).forEach(op => {
        const resource = resources.find(r => r.id === op.resourceId);
        if (!resource) return;

        const totalHours = op.hours * product.quantity;
        const dailyCapacity = resource.available ? (resource.hoursPerDay + resource.extraHours) : 0;
        const daysNeeded = dailyCapacity > 0 ? Math.ceil(totalHours / dailyCapacity) : 0;

        ganttData.push({
          productName: product.name,
          operationName: op.name,
          resourceName: resource.name,
          startDate: new Date(productStartDate),
          daysNeeded: daysNeeded,
          totalHours: totalHours,
          sequence: op.sequence
        });

        productStartDate = new Date(productStartDate.getTime() + daysNeeded * 24 * 60 * 60 * 1000);
      });
    });

    return ganttData;
  };

  const addResource = () => {
    const newId = Math.max(...resources.map(r => r.id), 0) + 1;
    setResources([...resources, {
      id: newId,
      name: 'Новый ресурс',
      hoursPerDay: 8,
      available: true,
      extraHours: 0
    }]);
  };

  const updateResource = (id, field, value) => {
    setResources(resources.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const deleteResource = (id) => {
    setResources(resources.filter(r => r.id !== id));
  };

  const addProduct = () => {
    const newId = Math.max(...products.map(p => p.id), 0) + 1;
    setProducts([...products, {
      id: newId,
      name: 'Новое изделие',
      quantity: 1,
      startDate: new Date().toISOString().split('T')[0],
      operations: []
    }]);
  };

  const deleteProduct = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const updateProduct = (id, field, value) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const addOperation = (productId) => {
    setProducts(products.map(p => {
      if (p.id === productId) {
        const newOpId = Math.max(...p.operations.map(op => op.id), 0) + 1;
        const maxSequence = Math.max(...p.operations.map(op => op.sequence), 0);
        return {
          ...p,
          operations: [...p.operations, {
            id: newOpId,
            name: 'Новая операция',
            resourceId: resources[0]?.id || 1,
            hours: 1,
            sequence: maxSequence + 1
          }]
        };
      }
      return p;
    }));
  };

  const deleteOperation = (productId, opId) => {
    setProducts(products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          operations: p.operations.filter(op => op.id !== opId)
        };
      }
      return p;
    }));
  };

  const updateOperation = (productId, opId, field, value) => {
    setProducts(products.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          operations: p.operations.map(op =>
            op.id === opId ? { ...op, [field]: value } : op
          )
        };
      }
      return p;
    }));
  };

  const resourceLoad = calculateResourceLoad();
  const ganttData = calculateGanttData();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Навигация */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('planning')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'planning'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Calendar size={20} />
              Планирование
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'resources'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users size={20} />
              Ресурсы
            </button>
            <button
              onClick={() => setActiveTab('gantt')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition ${
                activeTab === 'gantt'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <BarChart3 size={20} />
              Диаграмма Ганта
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Вкладка: Планирование */}
        {activeTab === 'planning' && (
          <div>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-6">
                Планирование производства
              </h1>

              {/* Сводка по ресурсам */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">
                  Загрузка ресурсов
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {Object.values(resourceLoad).map(res => {
                    const daysNeeded = res.dailyCapacity > 0 ? res.totalHours / res.dailyCapacity : 0;
                    const statusColor = !res.available 
                      ? 'bg-red-50 border-red-300' 
                      : res.totalHours === 0 
                        ? 'bg-gray-50 border-gray-200'
                        : 'bg-blue-50 border-blue-200';
                    
                    return (
                      <div
                        key={res.name}
                        className={`border-2 rounded-lg p-4 ${statusColor}`}
                      >
                        <div className="text-sm font-medium text-gray-600">
                          {res.name}
                          {!res.available && <span className="text-red-600 ml-2">(Недоступен)</span>}
                        </div>
                        <div className="text-2xl font-bold text-blue-700 mt-1">
                          {res.totalHours.toFixed(1)} ч
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {daysNeeded.toFixed(1)} дней ({res.dailyCapacity}ч/день)
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Список изделий */}
              <div className="space-y-6">
                {products.map(product => (
                  <div
                    key={product.id}
                    className="border-2 border-gray-200 rounded-lg p-5 bg-gray-50"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) => updateProduct(product.id, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-semibold text-lg"
                        placeholder="Название изделия"
                      />
                      <input
                        type="number"
                        value={product.quantity}
                        onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center"
                        min="1"
                      />
                      <span className="text-gray-600">шт.</span>
                      <input
                        type="date"
                        value={product.startDate}
                        onChange={(e) => updateProduct(product.id, 'startDate', e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                      />
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="text-red-600 hover:text-red-800 p-2"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    {/* Операции */}
                    <div className="space-y-2 mb-3">
                      {product.operations
                        .sort((a, b) => a.sequence - b.sequence)
                        .map((op) => {
                          return (
                            <div
                              key={op.id}
                              className="flex items-center gap-3 bg-white p-3 rounded-lg"
                            >
                              <input
                                type="number"
                                value={op.sequence}
                                onChange={(e) => updateOperation(product.id, op.id, 'sequence', parseInt(e.target.value) || 1)}
                                className="w-12 px-2 py-2 border border-gray-300 rounded text-center"
                                min="1"
                              />
                              <input
                                type="text"
                                value={op.name}
                                onChange={(e) => updateOperation(product.id, op.id, 'name', e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded"
                                placeholder="Название операции"
                              />
                              <select
                                value={op.resourceId}
                                onChange={(e) => updateOperation(product.id, op.id, 'resourceId', parseInt(e.target.value))}
                                className="w-40 px-3 py-2 border border-gray-300 rounded"
                              >
                                {resources.map(res => (
                                  <option key={res.id} value={res.id}>
                                    {res.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                value={op.hours}
                                onChange={(e) => updateOperation(product.id, op.id, 'hours', parseFloat(e.target.value) || 0)}
                                className="w-20 px-3 py-2 border border-gray-300 rounded text-center"
                                step="0.1"
                                min="0"
                              />
                              <span className="text-gray-600 w-8">ч</span>
                              <div className="text-sm text-gray-500 w-24 text-right">
                                Σ {(op.hours * product.quantity).toFixed(1)} ч
                              </div>
                              <button
                                onClick={() => deleteOperation(product.id, op.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          );
                        })}
                    </div>

                    <button
                      onClick={() => addOperation(product.id)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Plus size={18} />
                      Добавить операцию
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={addProduct}
                className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                <Plus size={20} />
                Добавить изделие
              </button>
            </div>
          </div>
        )}

        {/* Вкладка: Ресурсы */}
        {activeTab === 'resources' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              Управление ресурсами
            </h1>

            <div className="space-y-3">
              {resources.map(resource => (
                <div
                  key={resource.id}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <input
                    type="text"
                    value={resource.name}
                    onChange={(e) => updateResource(resource.id, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-medium"
                    placeholder="Название ресурса"
                  />
                  
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Часов/день:</label>
                    <input
                      type="number"
                      value={resource.hoursPerDay}
                      onChange={(e) => updateResource(resource.id, 'hoursPerDay', parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded text-center"
                      min="0"
                      max="24"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Доп. часы:</label>
                    <input
                      type="number"
                      value={resource.extraHours}
                      onChange={(e) => updateResource(resource.id, 'extraHours', parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded text-center"
                      min="-8"
                      max="8"
                      title="Раньше приход (положительное) или больничный (отрицательное)"
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={resource.available}
                      onChange={(e) => updateResource(resource.id, 'available', e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="text-sm font-medium">
                      {resource.available ? 'Доступен' : 'На больничном'}
                    </span>
                  </label>

                  <div className="text-sm font-semibold text-blue-700">
                    = {resource.available ? resource.hoursPerDay + resource.extraHours : 0} ч/день
                  </div>

                  <button
                    onClick={() => deleteResource(resource.id)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addResource}
              className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              <Plus size={20} />
              Добавить ресурс
            </button>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Подсказки:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Доп. часы</strong>: положительное число = ранний приход или задержка (например, +2 = работает на 2 часа дольше)</li>
                <li>• <strong>Доп. часы</strong>: отрицательное число = сокращенный день (например, -3 = работает на 3 часа меньше)</li>
                <li>• Снимите галочку "Доступен" если сотрудник на больничном</li>
                <li>• Доп. часы учитываются в расчете загрузки и диаграмме Ганта</li>
              </ul>
            </div>
          </div>
        )}

        {/* Вкладка: Диаграмма Ганта */}
        {activeTab === 'gantt' && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
              Диаграмма Ганта
            </h1>

            <div className="space-y-4">
              {ganttData.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-lg text-gray-800">
                        {item.productName} → {item.operationName}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        Ресурс: <span className="font-medium">{item.resourceName}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        Начало: {item.startDate.toLocaleDateString('ru-RU')}
                      </div>
                      <div className="text-sm font-semibold text-blue-700 mt-1">
                        {item.totalHours.toFixed(1)} ч / {item.daysNeeded} дней
                      </div>
                    </div>
                  </div>
                  
                  {/* Визуальная полоса */}
                  <div className="mt-3 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="bg-blue-500 h-full rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ width: `${Math.min(item.daysNeeded * 10, 100)}%` }}
                    >
                      {item.daysNeeded > 0 && `${item.daysNeeded} дн.`}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {ganttData.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Нет данных для отображения. Добавьте изделия и операции.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}