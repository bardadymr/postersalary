// frontend/src/components/SalaryCalculator.jsx
// ОБНОВЛЕННАЯ ВЕРСИЯ с выбором инвентаризации

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SalaryCalculator = ({ refreshKey }) => {
  const [locations, setLocations] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingInventories, setLoadingInventories] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Inline стили как fallback если Tailwind не работает
  const textStyles = {
    dark: { color: '#1f2937' },
    gray: { color: '#4b5563' },
    lightGray: { color: '#6b7280' },
    green: { color: '#059669' },
    red: { color: '#dc2626' }
  };
  
  const [formData, setFormData] = useState({
    locationId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    inventoryId: '',      // Новое поле
    storageId: '',        // Новое поле
    shiftRate: 500,
    revenuePercent: 2
  });

  const API_URL = import.meta.env.VITE_API_URL || 'https://proper-donkey-nice.ngrok-free.app/api';

  console.log('API_URL:', API_URL);

  // Ініціалізація Telegram WebApp
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      tg.setHeaderColor('bg_color');
      tg.setBackgroundColor('bg_color');
    }
  }, []);

  // Завантаження списку закладів
  useEffect(() => {
    fetchLocations();
  }, [refreshKey]);

  const fetchLocations = async () => {
    setLoadingLocations(true);
    setError(null);
    
    try {
      console.log('Fetching locations from:', `${API_URL}/locations`);
      
      const response = await axios.get(`${API_URL}/locations`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      console.log('Locations response:', response.data);
      
      if (response.data && response.data.locations) {
        setLocations(response.data.locations);
        console.log('Loaded locations:', response.data.locations);
      } else {
        setLocations([]);
        console.warn('No locations in response');
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setError('Помилка завантаження закладів: ' + (error.response?.data?.error || error.message));
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  // Загрузка инвентаризаций при выборе заведения
  const fetchInventories = async (locationId) => {
    if (!locationId) return;
    
    setLoadingInventories(true);
    setError(null);
    
    try {
      console.log('Fetching inventories for location:', locationId);
      
      const response = await axios.get(`${API_URL}/locations/${locationId}/inventories`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        params: {
          limit: 10 // Получаем последние 10 инвентаризаций
        }
      });
      
      console.log('Inventories response:', response.data);
      
      if (response.data && response.data.inventories) {
        setInventories(response.data.inventories);
        console.log('Loaded inventories:', response.data.inventories);
      } else {
        setInventories([]);
        console.warn('No inventories in response');
      }
    } catch (error) {
      console.error('Error fetching inventories:', error);
      showNotification('Помилка завантаження інвентаризацій: ' + (error.response?.data?.error || error.message), 'error');
      setInventories([]);
    } finally {
      setLoadingInventories(false);
    }
  };

  const handleLocationChange = (e) => {
    const locationId = e.target.value;
    console.log('Location changed:', locationId);
    
    setFormData(prev => ({
      ...prev,
      locationId: locationId,
      inventoryId: '', // Сбрасываем выбранную инвентаризацию
      storageId: ''
    }));
    
    setSelectedLocation(locations.find(l => l.id === locationId));
    
    // Загружаем инвентаризации для выбранного заведения
    if (locationId) {
      fetchInventories(locationId);
    } else {
      setInventories([]);
    }
  };

  const handleInventoryChange = (e) => {
    const selectedValue = e.target.value;
    console.log('Inventory selected:', selectedValue);
    
    if (!selectedValue) {
      setFormData(prev => ({
        ...prev,
        inventoryId: '',
        storageId: ''
      }));
      return;
    }
    
    // Формат: "inventoryId:storageId"
    const [inventoryId, storageId] = selectedValue.split(':');
    
    setFormData(prev => ({
      ...prev,
      inventoryId: inventoryId,
      storageId: storageId
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('Input change:', name, value);
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCalculate = async () => {
    console.log('Calculate button clicked');
    console.log('Form data:', formData);
    
    // Валідація
    if (!formData.locationId) {
      showNotification('Оберіть заклад', 'error');
      return;
    }

    if (formData.shiftRate <= 0 || formData.revenuePercent < 0) {
      showNotification('Перевірте введені дані', 'error');
      return;
    }

    setLoading(true);
    setResults(null);
    setError(null);

    try {
      console.log('Sending calculation request to:', `${API_URL}/salary/calculate`);
      
      // Формируем данные для отправки - убеждаемся что все в правильном формате
      const requestData = {
        locationId: formData.locationId,
        month: parseInt(formData.month), // Убеждаемся что это число
        year: parseInt(formData.year),   // Убеждаемся что это число
        inventoryId: formData.inventoryId || undefined, // Отправляем только если выбрана
        storageId: formData.storageId || undefined,     // Отправляем только если выбрана
        shiftRate: parseFloat(formData.shiftRate),       // Преобразуем в число
        revenuePercent: parseFloat(formData.revenuePercent) // Преобразуем в число
      };
      
      console.log('Request data (formatted):', requestData);
      
      const response = await axios.post(`${API_URL}/salary/calculate`, requestData, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Calculation response:', response.data);
      
      if (response.data.success) {
        setResults(response.data);
        showNotification('Розрахунок виконано успішно', 'success');
        
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        const errorMsg = response.data.error || 'Помилка розрахунку';
        setError(errorMsg);
        showNotification(errorMsg, 'error');
      }
    } catch (error) {
      console.error('Calculation error:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMsg = error.response?.data?.error || error.message || 'Помилка з\'єднання з сервером';
      setError(errorMsg);
      showNotification(errorMsg, 'error');
      
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    console.log('Notification:', type, message);
    
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const formatInventoryDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  const months = [
    'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
    'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4">
          <h1 className="!text-base !sm:text-2xl font-bold text-gray-800 mb-2">
            💰 Розрахунок зарплати
          </h1>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4">
          <div className="space-y-4">
            {/* Вибір закладу */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏪 Заклад
              </label>
              {loadingLocations ? (
                <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  Завантаження закладів...
                </div>
              ) : locations.length === 0 ? (
                <div className="w-full p-3 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700">
                  ⚠️ Немає підключених закладів. Перейдіть на вкладку "🔗 Підключити"
                </div>
              ) : (
                <select
                  name="locationId"
                  value={formData.locationId}
                  onChange={handleLocationChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Оберіть заклад</option>
                  {locations.map(location => (
                    <option key={location.id} value={location.id}>
                      {location.name} ({location.poster_account})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Вибір інвентаризації */}
            {formData.locationId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📦 Інвентаризація (опціонально)
                </label>
                {loadingInventories ? (
                  <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                    Завантаження інвентаризацій...
                  </div>
                ) : inventories.length === 0 ? (
                  <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 text-sm">
                    📭 Інвентаризації не знайдено. Розрахунок буде без вирахувань.
                  </div>
                ) : (
                  <select
                    name="inventory"
                    value={formData.inventoryId && formData.storageId ? `${formData.inventoryId}:${formData.storageId}` : ''}
                    onChange={handleInventoryChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Без інвентаризації</option>
                    {inventories.map(inv => (
                      <option 
                        key={`${inv.inventoryId}-${inv.storageId}`} 
                        value={`${inv.inventoryId}:${inv.storageId}`}
                      >
                        {inv.storageName} - {formatInventoryDate(inv.dateEnd)} 
                        {inv.lossAmount < 0 ? ` (нестача ${Math.abs(inv.lossAmount).toFixed(2)} грн)` : ` (надлишок ${inv.lossAmount.toFixed(2)} грн)`}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  💡 Якщо не обрано - розрахунок буде без вирахувань за інвентаризацію
                </p>
              </div>
            )}

            {/* Період розрахунку */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📅 Місяць
                </label>
                <select
                  name="month"
                  value={formData.month}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {months.map((month, index) => (
                    <option key={index + 1} value={index + 1}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📆 Рік
                </label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ставка за зміну */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                💵 Ставка за 1 зміну (грн)
              </label>
              <input
                type="number"
                name="shiftRate"
                value={formData.shiftRate}
                onChange={handleInputChange}
                min="0"
                step="50"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="500"
              />
            </div>

            {/* Процент від виручки */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📊 Процент від виручки (%)
              </label>
              <input
                type="number"
                name="revenuePercent"
                value={formData.revenuePercent}
                onChange={handleInputChange}
                min="0"
                max="100"
                step="0.5"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="2"
              />
            </div>

            {/* Кнопка розрахунку */}
            <button
              onClick={handleCalculate}
              disabled={loading || locations.length === 0}
              className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                loading || locations.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-zinc-600 hover:bg-zinc-700 active:scale-95'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Розраховуємо...
                </span>
              ) : locations.length === 0 ? (
                '🔗 Спочатку підключіть заклад'
              ) : (
                '💸​ Розрахувати зарплату'
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4">
            <h2 className="text-sm sm:text-xl font-bold text-gray-800 mb-4">
              📋 Результати розрахунку
            </h2>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg">
              <div>
                <div className="text-xs sm:text-sm text-gray-600" style={textStyles.lightGray}>Період</div>
                <div className="font-semibold text-sm sm:text-base" style={textStyles.dark}>{results.period.monthName} {results.period.year}</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-gray-600" style={textStyles.lightGray}>Співробітників</div>
                <div className="font-semibold text-sm sm:text-base" style={textStyles.dark}>{results.summary.employeesCount}</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-gray-600" style={textStyles.lightGray}>Загальна виручка</div>
                <div className="font-semibold text-sm sm:text-base" style={textStyles.dark}>{results.summary.totalRevenue.toFixed(2)} грн</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-gray-600" style={textStyles.lightGray}>Всього до виплати</div>
                <div className="font-semibold text-sm sm:text-base text-green-600" style={textStyles.green}>
                  {results.summary.totalSalary.toFixed(2)} грн
                </div>
              </div>
            </div>

            {/* Inventory */}
            {results.inventory && results.inventory.totalLoss !== 0 && (
              <div className={`p-4 rounded-lg mb-4 ${
                results.inventory.totalLoss < 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <div className="font-semibold mb-1" style={textStyles.dark}>
                  📦 Інвентаризація
                </div>
                <div 
                  className={results.inventory.totalLoss < 0 ? 'text-red-600' : 'text-green-600'}
                  style={results.inventory.totalLoss < 0 ? textStyles.red : textStyles.green}
                >
                  {results.inventory.totalLoss >= 0 ? '+' : ''}
                  {results.inventory.totalLoss.toFixed(2)} грн
                </div>
              </div>
            )}

            {/* Employees Table */}
            {results.employees && results.employees.length > 0 ? (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="py-2 px-1 sm:p-3 text-left text-sm" style={textStyles.dark}>Ім'я</th>
                      <th className="py-2 px-1 sm:p-3 text-center text-sm" style={textStyles.dark}>Зміни</th>
                      <th className="py-2 px-1 sm:p-3 text-right text-sm" style={textStyles.dark}>Виручка</th>
                      <th className="py-2 px-1 sm:p-3 text-right text-sm" style={textStyles.dark}>ЗП</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.employees.map((emp, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-1 sm:p-3 font-medium text-sm" style={textStyles.dark}>
                          <div className="truncate max-w-[90px] sm:max-w-none">{emp.employeeName}</div>
                        </td>
                        <td className="py-2 px-1 sm:p-3 text-center text-sm" style={textStyles.dark}>{emp.shiftsCount}</td>
                        <td className="py-2 px-1 sm:p-3 text-right text-sm whitespace-nowrap" style={textStyles.gray}>
                          {emp.revenue.toFixed(0)}
                        </td>
                        <td className="py-2 px-1 sm:p-3 text-right font-semibold text-sm whitespace-nowrap" style={textStyles.green}>
                          {emp.totalSalary.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8" style={textStyles.gray}>
                Немає даних про співробітників
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaryCalculator;