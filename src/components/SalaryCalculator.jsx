// frontend/src/components/SalaryCalculator.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SalaryCalculator = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  const [formData, setFormData] = useState({
    locationId: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    inventoryMonth: new Date().getMonth() + 1,
    inventoryYear: new Date().getFullYear(),
    shiftRate: 500,
    revenuePercent: 3
  });

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API_URL}/locations`);
      setLocations(response.data.locations || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      showNotification('Помилка завантаження закладів', 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCalculate = async () => {
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

    try {
      const response = await axios.post(`${API_URL}/salary/calculate`, formData);
      
      if (response.data.success) {
        setResults(response.data);
        showNotification('Розрахунок виконано успішно', 'success');
        
        // Вібрація при успіху
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      } else {
        showNotification(response.data.error || 'Помилка розрахунку', 'error');
      }
    } catch (error) {
      console.error('Calculation error:', error);
      showNotification(
        error.response?.data?.error || 'Помилка з\'єднання з сервером',
        'error'
      );
      
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const exportToCSV = async () => {
    // TODO: Implement CSV export
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
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="space-y-4">
            {/* Вибір закладу */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                🏪 Заклад
              </label>
              <select
                name="locationId"
                value={formData.locationId}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Оберіть заклад...</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="3"
              />
            </div>

            {/* Кнопка розрахунку */}
            <button
              onClick={handleCalculate}
              disabled={loading}
              className={`w-full py-4 rounded-lg font-semibold text-white transition-all ${
                loading
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
              ) : (
                '🧮 Розрахувати зарплату'
              )}
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
            {results.inventory.totalLoss !== 0 && (
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
          </div>
        )}
      </div>
    </div>
  );
};

export default SalaryCalculator;
