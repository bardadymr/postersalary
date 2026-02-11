// frontend/src/components/ConnectLocation.jsx

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ConnectLocation = ({ onLocationConnected }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('initial'); // initial, connecting, success
  
  const broadcastChannelRef = useRef(null);
  const checkIntervalRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || 'https://proper-donkey-nice.ngrok-free.app/api';

  // Cleanup function
  useEffect(() => {
    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  // Слушаем все методы коммуникации
  useEffect(() => {
    // Метод 1: BroadcastChannel
    try {
      const channel = new BroadcastChannel('poster_auth_channel');
      broadcastChannelRef.current = channel;
      
      channel.onmessage = (event) => {
        console.log('BroadcastChannel message:', event.data);
        handleAuthData(event.data);
      };
      
      console.log('BroadcastChannel listener added');
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    // Метод 2: localStorage events
    const handleStorageChange = (e) => {
      if (e.key === 'poster_auth_result' && e.newValue) {
        console.log('Storage event:', e);
        try {
          const data = JSON.parse(e.newValue);
          handleAuthData(data);
        } catch (err) {
          console.error('Error parsing storage data:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    console.log('Storage listener added');

    // Метод 3: postMessage
    const messageHandler = (event) => {
      // Фильтруем лишние сообщения
      if (!event.data || typeof event.data !== 'object') {
        console.log('Received postMessage:', event.data);
        return;
      }
      
      // Игнорируем сообщения от расширений браузера
      if (event.data.target === 'metamask-inpage' || 
          event.data.target === 'metamask-contentscript' ||
          typeof event.data === 'string') {
        console.log('Received postMessage:', event.data);
        return;
      }

      if (event.data.type === 'POSTER_AUTH_SUCCESS' || 
          event.data.type === 'POSTER_AUTH_ERROR') {
        console.log('Auth postMessage:', event.data);
        handleAuthData(event.data);
      }
    };

    window.addEventListener('message', messageHandler);
    console.log('PostMessage listener added');

    // Периодическая проверка localStorage если мы в режиме connecting
    if (step === 'connecting') {
      checkIntervalRef.current = setInterval(() => {
        const stored = localStorage.getItem('poster_auth_result');
        if (stored) {
          console.log('Found in localStorage polling');
          try {
            const data = JSON.parse(stored);
            // Проверяем, что данные свежие (не старше 5 минут)
            const age = Date.now() - data.timestamp;
            if (age < 5 * 60 * 1000) {
              handleAuthData(data);
            } else {
              localStorage.removeItem('poster_auth_result');
            }
          } catch (err) {
            console.error('Error parsing stored data:', err);
          }
        }
      }, 500);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('message', messageHandler);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [step]);

  const handleAuthData = (data) => {
    console.log('handleAuthData called:', data);
    
    // Проверяем timestamp чтобы не обрабатывать старые данные
    if (data.timestamp) {
      const age = Date.now() - data.timestamp;
      if (age > 5 * 60 * 1000) { // 5 минут
        console.log('Data too old, ignoring');
        return;
      }
    }

    // Очищаем localStorage сразу после получения
    localStorage.removeItem('poster_auth_result');

    if (data.type === 'POSTER_AUTH_SUCCESS') {
      console.log('Processing auth success');
      saveLocationData(data);
    } else if (data.type === 'POSTER_AUTH_ERROR') {
      console.log('Processing auth error');
      setError(data.error || 'Помилка авторизації');
      setLoading(false);
      setStep('initial');
    }
  };

  const handleConnectPoster = async () => {
    setLoading(true);
    setError(null);

    try {
      // Очищаем старые данные
      localStorage.removeItem('poster_auth_result');

      console.log('Fetching auth URL...');
      const response = await axios.get(`${API_URL}/auth/poster`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });
      
      console.log('Auth URL response:', response.data);
      
      if (response.data.success && response.data.authUrl) {
        setStep('connecting');
        console.log('Opening auth window...');

        // Відкриваємо Poster авторизацію в новому вікні
        const authWindow = window.open(
          response.data.authUrl,
          'PosterAuth',
          'width=600,height=700,location=no,menubar=no'
        );

        if (!authWindow) {
          throw new Error('Не вдалось відкрити вікно авторизації. Перевірте налаштування блокування спливаючих вікон.');
        }

        console.log('Auth window opened');

        // Перевірка, чи вікно не закрито користувачем
        const checkClosed = setInterval(() => {
          if (authWindow.closed) {
            console.log('Auth window closed');
            clearInterval(checkClosed);
            
            // Даем время на обработку данных
            setTimeout(() => {
              if (step === 'connecting') {
                console.log('Auth cancelled by user');
                setError('Авторизація скасована');
                setLoading(false);
                setStep('initial');
              }
            }, 1000);
          }
        }, 1000);

        // Таймаут
        setTimeout(() => {
          clearInterval(checkClosed);
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