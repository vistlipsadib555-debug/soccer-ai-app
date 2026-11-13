// src/SmartExpenseApp.jsx
import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export default function SmartExpenseApp() {
  const [items, setItems] = useState([]);
  const [store, setStore] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('通信費');
  const [alarmTime, setAlarmTime] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  // 1. 初回マウント時にブラウザ通知の許可をリクエスト
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 2. 1秒ごとに現在時刻をチェックし、アラーム（リマインダー）を鳴らす
  useEffect(() => {
    const timerId = setInterval(() => {
      const now = new Date();
      const currentHHMM = now.toTimeString().slice(0, 5); // "HH:MM"

      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.isSet && item.time === currentHHMM && !item.triggered) {
            triggerAlarm(item);
            return { ...item, isSet: false, triggered: true };
          }
          return item;
        })
      );
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  const triggerAlarm = (item) => {
    playAlarmSound();
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ 経費・タスク リマインダー', {
        body: `時間になりました！\n「${item.store}」: ${item.amount}円 (${item.category})`,
        icon: 'https://cdn-icons-png.flaticon.com/512/3236/3236743.png',
      });
    }
  };

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
      console.error(e);
    }
  };

  // 経費・メモ項目の追加
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!store.trim() || !amount) {
      alert('利用先と金額を入力してください');
      return;
    }

    const newItem = {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      store: store,
      amount: Number(amount),
      category: category,
      time: alarmTime,
      isSet: Boolean(alarmTime),
      triggered: false,
    };

    setItems([newItem, ...items]);
    setStore('');
    setAmount('');
    setAlarmTime('');
  };

  const handleDeleteItem = (id) => {
    setItems(items.filter((item) => item.id !== id));
  };

  // AIによる解析・要約のシミュレーション（ここにOpenAI APIを組み込めます）
  const handleAIAnalysis = () => {
    if (items.length === 0) {
      alert('データがありません');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const total = items.reduce((sum, item) => sum + item.amount, 0);
      setAiSummary(`【AI自動要約】今週のバクラク利用件数 ${items.length}件、合計金額 ${total.toLocaleString()}円。経費規定内の適正な支出として処理可能です。`);
      setLoading(false);
    }, 1200);
  };

  // PDF出力
  const generatePDF = () => {
    if (items.length === 0) return;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Bakuraku Expense & Task Report", 14, 20);

    doc.setFontSize(10);
    if (aiSummary) {
      doc.text(aiSummary, 14, 30, { maxWidth: 180 });
    }

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    doc.text(`Total Amount: ¥${totalAmount.toLocaleString()}`, 14, 42);

    const tableColumn = ["Date", "Store / Memo", "Category", "Amount", "Reminder"];
    const tableRows = items.map(item => [
      item.date,
      item.store,
      item.category,
      `¥${item.amount.toLocaleString()}`,
      item.time ? item.time : 'なし'
    ]);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 48,
    });

    doc.save("bakuraku_expense_report.pdf");
  };

  // 上司へのメール転送
  const handleSendToBoss = () => {
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    const subject = encodeURIComponent("【経費精算】バクラク利用明細（AI要約・リマインダー付）");
    const body = encodeURIComponent(
      `上司各位\n\nお疲れ様です。\nバクラクビジネスカードの利用明細とリマインダー登録分をまとめました。\n\n【合計金額】¥${totalAmount.toLocaleString()}\n${aiSummary}\n\nご確認のほどよろしくお願いいたします。`
    );
    window.location.href = `mailto:boss@example.com?subject=${subject}&body=${body}`;
  };

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div style={{ padding: '20px', maxWidth: '650px', margin: '30px auto', fontFamily: 'sans-serif', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
      <h2>🤖 バクラク経費 ＆ リマインダー統合アシスタント</h2>

      {/* 入力フォーム */}
      <form onSubmit={handleAddItem} style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3>➕ 明細・メモの追加</h3>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            placeholder="利用先 / メモ内容 (例: AWS, 文房具)"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            style={{ flex: 2, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
          <input
            type="number"
            placeholder="金額 (円)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
          >
            <option value="通信費">通信費</option>
            <option value="消耗品費">消耗品費</option>
            <option value="交通費">交通費</option>
            <option value="接待交際費">接待交際費</option>
          </select>

          <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>アラーム通知:</label>
          <input
            type="time"
            value={alarmTime}
            onChange={(e) => setAlarmTime(e.target.value)}
            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #ccc' }}
          />

          <button
            type="submit"
            style={{ background: '#4f46e5', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginLeft: 'auto' }}
          >
            追加
          </button>
        </div>
      </form>

      {/* 一覧＆合計 */}
      <div style={{ background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>📋 登録済み明細 ({items.length}件)</h3>
          <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#059669' }}>合計: ¥{totalAmount.toLocaleString()}</span>
        </div>

        {items.length === 0 ? (
          <p style={{ color: '#666' }}>まだ明細が登録されていません。</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item) => (
              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f3f4f6', borderRadius: '6px' }}>
                <div>
                  <strong>{item.store}</strong> ({item.category}) — <span style={{ color: '#2563eb' }}>¥{item.amount.toLocaleString()}</span>
                  <div style={{ fontSize: '0.8rem', color: item.isSet ? '#d97706' : '#6b7280' }}>
                    {item.time ? `⏰ アラーム設定: ${item.time} ${item.triggered ? '(鳴動済み)' : item.isSet ? '(待機中)' : ''}` : '🕒 アラームなし'}
                  </div>
                </div>
                <button onClick={() => handleDeleteItem(item.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* AI解析 & 出力アクション */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          onClick={handleAIAnalysis}
          disabled={loading}
          style={{ background: '#7c3aed', color: '#fff', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? 'AI解析中...' : '🧠 AIに一括解析・要約させる'}
        </button>

        {aiSummary && (
          <div style={{ padding: '12px', background: '#ede9fe', borderRadius: '6px', border: '1px solid #c4b5fd', fontSize: '0.9rem' }}>
            {aiSummary}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
          <button
            onClick={generatePDF}
            style={{ flex: 1, background: '#059669', color: '#fff', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            📥 明細PDFをダウンロード
          </button>
          <button
            onClick={handleSendToBoss}
            style={{ flex: 1, background: '#2563eb', color: '#fff', padding: '10px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✉️ 上司にメール転送
          </button>
        </div>
      </div>
    </div>
  );
}