// frontend/src/components/SalaryCalculator.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SalaryCalculator = ({ refreshKey }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  const [formData, setFormData] = useState({
    locationId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    inventoryMonth: new Date().getMonth() + 1,
    inventoryYear: new Date().getFullYear(),
    shiftRate: 500,
    revenuePercent: 3
  });

  const API_URL = import.meta.env.VITE_API_URL || 'https://proper-donkey-nice.ngrok-free.app/api';

  console.log('API_URL:', API_URL);

  // Ініціалізація Telegram WebApp
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      
      // Налаштування теми
      tg.setHeaderColor('bg_color');
      tg.setBackgroundColor('bg_color');
    }
  }, []);

  // Завантаження списку закладів
  useEffect(() => {
    fetchLocations();
  }, [refreshKey]); // Оновлюємо при зміні refreshKey

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
      console.log('Request data:', formData);
      
      const response = await axios.post(`${API_URL}/salary/calculate`, formData, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Calculation response:', response.data);
      
      if (response.data.success) {
        setResults(response.data);
        showNotification('Розрахунок виконано успішно', 'success');
        
        // Вібрація при успіху
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

  const exportToCSV = async () => {
    showNotification('Експорт буде доступний найближчим часом');
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
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            💰 Розрахунок зарплати
          </h1>
          <p className="text-gray-600 text-sm">
            Автоматичний розрахунок на основі даних Poster
          </p>
          
          {/* Debug info */}
          <div className="mt-2 text-xs text-gray-400">
            Закладів: {locations.length} | API: {API_URL.split('/').pop()}
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <span className="text-red-600 text-lg mr-2">⚠️</span>
              <div className="flex-1">
                <p className="text-red-800 font-medium">Помилка</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
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
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">Оберіть заклад...</option>
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

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

            {/* Місяць інвентаризації */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📦 Інвентаризація (місяць)
                </label>
                <select
                  name="inventoryMonth"
                  value={formData.inventoryMonth}
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
                  name="inventoryYear"
                  value={formData.inventoryYear}
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
                placeholder="3"
              />
            </div>

            {/* Кнопка розрахунку */}
            <button
              onClick={handleCalculate}
              disabled={loading || locations.length === 0}
              className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                loading || locations.length === 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
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
                '🧮 Розрахувати зарплату'
              )}
            </button>

            {/* Reload locations button */}
            <button
              onClick={fetchLocations}
              disabled={loadingLocations}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              {loadingLocations ? '⏳ Завантаження...' : '🔄 Оновити список закладів'}
            </button>
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                📋 Результати розрахунку
              </h2>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
              >
                📥 Експорт CSV
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">Період</div>
                <div className="font-semibold">{results.period.monthName} {results.period.year}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Співробітників</div>
                <div className="font-semibold">{results.summary.employeesCount}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Загальна виручка</div>
                <div className="font-semibold">{results.summary.totalRevenue.toFixed(2)} грн</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Всього до виплати</div>
                <div className="font-semibold text-green-600">
                  {results.summary.totalSalary.toFixed(2)} грн
                </div>
              </div>
            </div>

            {/* Inventory */}
            {results.inventory && results.inventory.totalLoss !== 0 && (
              <div className={`p-4 rounded-lg mb-4 ${
                results.inventory.totalLoss < 0 ? 'bg-red-50' : 'bg-green-50'
              }`}>
                <div className="font-semibold mb-1">
                  📦 Інвентаризація ({months[results.inventory.month - 1]} {results.inventory.year})
                </div>
                <div className={results.inventory.totalLoss < 0 ? 'text-red-600' : 'text-green-600'}>
                  {results.inventory.totalLoss >= 0 ? '+' : ''}
                  {results.inventory.totalLoss.toFixed(2)} грн
                </div>
              </div>
            )}

            {/* Employees Table */}
            {results.employees && results.employees.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-3 text-left">Співробітник</th>
                      <th className="p-3 text-center">Зміни</th>
                      <th className="p-3 text-right">Виручка</th>
                      <th className="p-3 text-right">ЗП</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.employees.map((emp, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{emp.employeeName}</td>
                        <td className="p-3 text-center">{emp.shiftsCount}</td>
                        <td className="p-3 text-right text-gray-600">
                          {emp.revenue.toFixed(0)} грн
                        </td>
                        <td className="p-3 text-right font-semibold text-green-600">
                          {emp.totalSalary.toFixed(2)} грн
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
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