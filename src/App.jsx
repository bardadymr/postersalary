// frontend/src/App.jsx

import React, { useState } from 'react';
import SalaryCalculator from './components/SalaryCalculator';
import ConnectLocation from './components/ConnectLocation';

function App() {
  const [view, setView] = useState('calculator'); // 'calculator' | 'connect'
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLocationConnected = (location) => {
    console.log('Location connected:', location);
    // Оновлюємо список закладів
    setRefreshKey(prev => prev + 1);
    // Повертаємось до калькулятора
    setView('calculator');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <div className="bg-white shadow-sm mb-4">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={() => setView('calculator')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                view === 'calculator'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              💰 Розрахунок
            </button>
            <button
              onClick={() => setView('connect')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                view === 'connect'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🔗 Підключити
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4">
        {view === 'calculator' ? (
          <SalaryCalculator key={refreshKey} />
        ) : (
          <div className="max-w-2xl mx-auto">
            <ConnectLocation onLocationConnected={handleLocationConnected} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;