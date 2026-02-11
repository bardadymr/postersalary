// frontend/src/components/ConnectLocation.jsx

import React, { useState } from 'react';
import axios from 'axios';

const ConnectLocation = ({ onLocationConnected }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('initial'); // initial, connecting, success

  const API_URL = import.meta.env.VITE_API_URL || 'https://proper-donkey-nice.ngrok-free.app/api';

  const handleConnectPoster = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Отримуємо URL для авторизації в Poster
      const response = await axios.get(`${API_URL}/auth/poster`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      if (response.data.success && response.data.authUrl) {
        setStep('connecting');
        
        // 2. Встановлюємо обробник ПЕРЕД відкриттям вікна
        let authWindow = null;
        
        const messageHandler = async (event) => {
          console.log("Received message:", event);
          console.log("Event origin:", event.origin);
          console.log("Event data:", event.data);
          
          // Перевіряємо тип повідомлення (не origin, бо може бути з backend домену)
          if (!event.data || !event.data.type) {
            console.log("Invalid message format");
            return;
          }

          if (event.data.type === 'POSTER_AUTH_SUCCESS') {
            console.log("Auth success received");
            window.removeEventListener('message', messageHandler);
            
            // Закриваємо вікно авторизації
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }

            // Зберігаємо дані закладу
            await saveLocationData(event.data);
            
          } else if (event.data.type === 'POSTER_AUTH_ERROR') {
            console.log("Auth error received");
            window.removeEventListener('message', messageHandler);
            
            if (authWindow && !authWindow.closed) {
              authWindow.close();
            }
            
            setError(event.data.error || 'Помилка авторизації');
            setLoading(false);
            setStep('initial');
          }
        };

        // Додаємо обробник
        window.addEventListener('message', messageHandler);
        console.log("Message handler added");

        // 3. Відкриваємо Poster авторизацію в новому вікні
        authWindow = window.open(
          response.data.authUrl,
          'PosterAuth',
          'width=600,height=700,location=no,menubar=no'
        );

        if (!authWindow) {
          window.removeEventListener('message', messageHandler);
          throw new Error('Не вдалось відкрити вікно авторизації. Перевірте налаштування блокування спливаючих вікон.');
        }

        console.log("Auth window opened");

        // Перевірка, чи вікно не закрито користувачем
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            
            if (step === 'connecting') {
              setError('Авторизація скасована');
              setLoading(false);
              setStep('initial');
            }
          }
        }, 1000);

        // Таймаут на випадок, якщо вікно закрили без авторизації
        setTimeout(() => {
          clearInterval(checkClosed);
          if (authWindow && !authWindow.closed) {
            window.removeEventListener('message', messageHandler);
          }
        }, 300000); // 5 хвилин

      } else {
        throw new Error('Не вдалось отримати URL авторизації');
      }
    } catch (err) {
      console.error('Connect error:', err);
      setError(err.response?.data?.error || err.message || 'Помилка підключення');
      setLoading(false);
      setStep('initial');
    }
  };

  const saveLocationData = async (authData) => {
    try {
      console.log('Saving location data:', authData);
      
      const response = await axios.post(`${API_URL}/locations/connect`, {
        code: authData.code,
        account: authData.account,
        name: authData.name || authData.account
      }, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      console.log('Save location response:', response.data);

      if (response.data.success) {
        setStep('success');
        setLoading(false);
        
        // Викликаємо callback для оновлення списку закладів
        if (onLocationConnected) {
          onLocationConnected(response.data.location);
        }

        // Telegram вібрація при успіху
        if (window.Telegram?.WebApp) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }

        // Повертаємось на початковий екран через 2 секунди
        setTimeout(() => {
          setStep('initial');
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Не вдалось зберегти заклад');
      }
    } catch (err) {
      console.error('Save location error:', err);
      setError(err.response?.data?.error || err.message || 'Помилка збереження закладу');
      setLoading(false);
      setStep('initial');
    }
  };

  if (step === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-600 mb-2">
          Успішно підключено!
        </h2>
        <p className="text-gray-600">
          Заклад додано до системи
        </p>
      </div>
    );
  }

  if (step === 'connecting') {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <div className="flex justify-center mb-4">
          <svg className="animate-spin h-16 w-16 text-blue-600" viewBox="0 0 24 24">
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
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">
          Підключення до Poster...
        </h2>
        <p className="text-gray-600">
          Будь ласка, завершіть авторизацію у відкритому вікні
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <div className="text-6xl mb-4">🏪</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Підключити заклад
        </h2>
        <p className="text-gray-600">
          Підключіть свій заклад з Poster для автоматичного розрахунку зарплати
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">❌ {error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Що потрібно:</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>✓ Акаунт в Poster</li>
            <li>✓ Права адміністратора</li>
            <li>✓ Доступ до інтернету</li>
          </ul>
        </div>

        <button
          onClick={handleConnectPoster}
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
              Підключення...
            </span>
          ) : (
            '🔗 Підключити через Poster'
          )}
        </button>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            Натиснувши кнопку, ви будете перенаправлені на сайт Poster для авторизації
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectLocation;