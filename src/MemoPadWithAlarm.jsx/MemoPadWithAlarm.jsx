// src/MemoPadWithAlarm.jsx
import React, { useState, useEffect } from 'react';

export default function MemoPadWithAlarm() {
  const [memos, setMemos] = useState([]);
  const [text, setText] = useState('');
  const [alarmTime, setAlarmTime] = useState('');

  // 1. 初回マウント時にブラウザ通知の許可をリクエスト
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 2. 1秒ごとに現在時刻をチェックし、アラーム時刻に達したメモを検知
  useEffect(() => {
    const timerId = setInterval(() => {
      const now = new Date();
      const currentHHMM = now.toTimeString().slice(0, 5); // "HH:MM" 形式

      setMemos((prevMemos) =>
        prevMemos.map((memo) => {
          if (memo.isSet && memo.time === currentHHMM && !memo.triggered) {
            // アラーム発動！
            triggerAlarm(memo.text);
            return { ...memo, isSet: false, triggered: true }; // アラーム終了状態に更新
          }
          return memo;
        })
      );
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  // アラーム発動時の処理（ビープ音 ＋ ブラウザ通知）
  const triggerAlarm = (memoText) => {
    playAlarmSound();

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ メモ・リマインダー通知', {
        body: `時間になりました！\n「${memoText}」`,
        icon: 'https://cdn-icons-png.flaticon.com/512/3236/3236743.png',
      });
    }
  };

  // Web Audio APIによるビープ音
  const playAlarmSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 2);
    } catch (e) {
      console.error('音声の再生に失敗しました', e);
    }
  };

  // メモ＆アラームの追加
  const handleAddMemo = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      alert('メモの内容を入力してください');
      return;
    }

    const newMemo = {
      id: Date.now(),
      text: text,
      time: alarmTime,
      isSet: Boolean(alarmTime), // 時間が設定されていればアラーム有効
      triggered: false,
    };

    setMemos([newMemo, ...memos]);
    setText('');
    setAlarmTime('');
  };

  // メモの削除
  const handleDeleteMemo = (id) => {
    setMemos(memos.filter((memo) => memo.id !== id));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '40px auto', fontFamily: 'sans-serif', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
      <h2>📝 メモ帳 ＆ アラームリマインダー</h2>

      {/* メモ入力フォーム */}
      <form onSubmit={handleAddMemo} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
        <textarea
          rows="3"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="メモの内容を入力..."
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '1rem' }}
        />
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>アラーム時刻:</label>
          <input
            type="time"
            value={alarmTime}
            onChange={(e) => setAlarmTime(e.target.value)}
            style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
          <button
            type="submit"
            style={{ background: '#4f46e5', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}
          >
            メモを追加
          </button>
        </div>
      </form>

      {/* メモ一覧 */}
      <div>
        <h3>📋 メモ一覧 ({memos.length})</h3>
        {memos.length === 0 ? (
          <p style={{ color: '#666' }}>まだメモがありません。</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {memos.map((memo) => (
              <li
                key={memo.id}
                style={{
                  background: '#fff',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: '0 0 5px 0', whiteSpace: 'pre-wrap' }}>{memo.text}</p>
                  <small style={{ color: memo.isSet ? '#d97706' : '#6b7280' }}>
                    {memo.time ? `⏰ アラーム: ${memo.time} ${memo.triggered ? '(鳴動済み)' : memo.isSet ? '(設定中)' : ''}` : '🕒 アラームなし'}
                  </small>
                </div>
                <button
                  onClick={() => handleDeleteMemo(memo.id)}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}