// src/SoccerEducationApp.jsx
import React, { useState, useRef, useEffect } from 'react';

export default function SoccerEducationApp() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [mode, setMode] = useState('camera'); // 'camera' or 'upload'
  const [countdown, setCountdown] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedFrames, setCapturedFrames] = useState([]);
  
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [menuType, setMenuType] = useState('インステップシュート');
  const [history, setHistory] = useState([]);

  // ローカルストレージからAPIキーと履歴を読み込み
  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) setApiKey(savedKey);

    const savedHistory = localStorage.getItem('soccer_ai_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) { console.error(e); }
    }
  }, []);

  const handleApiKeyChange = (val) => {
    setApiKey(val);
    localStorage.setItem('openai_api_key', val);
  };

  // カメラ起動
  const startCamera = async () => {
    setMode('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOn(true);
      }
    } catch (err) {
      alert('カメラの起動に失敗しました。ブラウザの権限を確認してください。');
      console.error(err);
    }
  };

  // 動画ファイルアップロード時の処理
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMode('upload');
    const videoUrl = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = videoUrl;
      videoRef.current.pause();
      setIsCameraOn(true);
    }
  };

  // カウントダウン付き撮影スタート
  const startCountdownAndRecord = () => {
    if (!videoRef.current) return;
    setCountdown(3);
    setCapturedFrames([]);
    setFeedback(null);

    let currentCount = 3;
    const timer = setInterval(() => {
      currentCount--;
      if (currentCount > 0) {
        setCountdown(currentCount);
      } else {
        clearInterval(timer);
        setCountdown(null);
        executeCaptureSequence();
      }
    }, 1000);
  };

  // アップロード動画からのフレーム抽出
  const captureUploadedVideo = () => {
    if (!videoRef.current) return;
    setCapturedFrames([]);
    setFeedback(null);
    setIsRecording(true);

    const video = videoRef.current;
    video.currentTime = 0; // 先頭から
    video.play();

    const frames = [];
    let count = 0;

    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas && video) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
        setCapturedFrames([...frames]);
      }

      count++;
      if (count >= 3 || video.ended) {
        clearInterval(interval);
        video.pause();
        setIsRecording(false);
      }
    }, 800);
  };

  // リアルタイムカメラ用の連続フレーム撮影
  const executeCaptureSequence = () => {
    setIsRecording(true);
    const frames = [];
    let count = 0;

    const interval = setInterval(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
        setCapturedFrames([...frames]);
      }

      count++;
      if (count >= 3) {
        clearInterval(interval);
        setIsRecording(false);
      }
    }, 600);
  };

  // OpenAI API (GPT-4o) を使った本格AI解析
  const analyzeWithAI = async () => {
    if (capturedFrames.length === 0) return;
    if (!apiKey) {
      alert('OpenAI APIキーを入力してください（画面下部または設定欄）');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "あなたは優秀なプロのサッカーコーチです。提供された連続写真を見て、フォームの良い点、改善すべきポイント、および具体的なおすすめ練習ドリルを日本語でわかりやすく指導してください。"
            },
            {
              role: "user",
              content: [
                { 
                  type: "text", 
                  text: `練習メニュー：「${menuType}」。この連続フォームの改善点を具体的に指摘してください。` 
                },
                ...capturedFrames.map(img => ({
                  type: "image_url",
                  image_url: { url: img }
                }))
              ]
            }
          ],
          max_tokens: 800
        })
      });

      const data = await response.json();

      if (data.error) {
        alert(`APIエラー: ${data.error.message}`);
        setLoading(false);
        return;
      }

      const aiText = data.choices[0].message.content;

      const result = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        menu: menuType,
        summary: aiText,
      };

      setFeedback(result);
      const newHistory = [result, ...history];
      setHistory(newHistory);
      localStorage.setItem('soccer_ai_history', JSON.stringify(newHistory));
      setLoading(false);

    } catch (err) {
      console.error(err);
      alert('通信エラーが発生しました。インターネット接続やAPIキーを確認してください。');
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '750px', margin: '30px auto', fontFamily: 'sans-serif', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
      <h2 style={{ color: '#0f172a', textAlign: 'center', marginBottom: '15px' }}>⚽ AI サッカー教育・完全版プログラム</h2>

      {/* APIキー入力欄 */}
      <div style={{ marginBottom: '20px', padding: '12px', background: '#e2e8f0', borderRadius: '8px' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
          🔑 OpenAI API Key (GPT-4o用):
        </label>
        <input
          type="password"
          placeholder="sk-..."
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
        />
      </div>

      {/* メニュー選択 */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center' }}>
        <label style={{ fontWeight: 'bold' }}>トレーニング種目:</label>
        <select
          value={menuType}
          onChange={(e) => setMenuType(e.target.value)}
          style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
        >
          <option value="インステップシュート">インステップシュート</option>
          <option value="インサイドパス＆トラップ">インサイドパス＆トラップ</option>
          <option value="ドリブル・方向転換">ドリブル・方向転換</option>
          <option value="ヘディングフォーム">ヘディングフォーム</option>
        </select>
      </div>

      {/* 入力ソース切替ボタン（カメラ起動 or 動画ファイル選択） */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          onClick={startCamera}
          style={{ flex: 1, background: isCameraOn && mode === 'camera' ? '#1d4ed8' : '#2563eb', color: '#fff', padding: '10px', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          📷 カメラで撮影するモード
        </button>
        <label style={{ flex: 1, background: '#0d9488', color: '#fff', padding: '10px', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center', cursor: 'pointer', display: 'block' }}>
          📁 動画ファイルをアップロード
          <input type="file" accept="video/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        </label>
      </div>

      {/* プレビュー画面 */}
      <div style={{ position: 'relative', background: '#0f172a', borderRadius: '12px', overflow: 'hidden', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video
          ref={videoRef}
          controls={mode === 'upload'}
          playsInline
          muted
          style={{ width: '100%', maxHeight: '400px', display: isCameraOn ? 'block' : 'none' }}
        />
        {!isCameraOn && (
          <p style={{ color: '#94a3b8' }}>上のボタンから「カメラ起動」または「動画ファイル選択」を行ってください。</p>
        )}

        {countdown !== null && (
          <div style={{ position: 'absolute', fontSize: '5rem', fontWeight: 'bold', color: '#fff', background: 'rgba(0,0,0,0.6)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {countdown}
          </div>
        )}

        {isRecording && (
          <div style={{ position: 'absolute', top: '15px', right: '15px', background: '#dc2626', color: '#fff', padding: '6px 16px', borderRadius: '20px', fontWeight: 'bold' }}>
            ● フレーム抽出中...
          </div>
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* アクションボタン */}
      {isCameraOn && (
        <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
          {mode === 'camera' ? (
            <button
              onClick={startCountdownAndRecord}
              disabled={countdown !== null || isRecording}
              style={{ flex: 1, background: '#dc2626', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
            >
              {isRecording ? '撮影中...' : '🎬 プレーを撮影する (3秒)'}
            </button>
          ) : (
            <button
              onClick={captureUploadedVideo}
              disabled={isRecording}
              style={{ flex: 1, background: '#d97706', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}
            >
              {isRecording ? '抽出中...' : '🔄 アップロード動画からフレームを抽出'}
            </button>
          )}

          <button
            onClick={analyzeWithAI}
            disabled={loading || capturedFrames.length === 0}
            style={{ flex: 1, background: '#059669', color: '#fff', padding: '12px', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', opacity: capturedFrames.length === 0 ? 0.5 : 1 }}
          >
            {loading ? '🧠 GPT-4oが解析中...' : '🤖 AIに改善点を診断してもらう'}
          </button>
        </div>
      )}

      {/* 抽出フレームプレビュー */}
      {capturedFrames.length > 0 && (
        <div style={{ marginTop: '20px', background: '#fff', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 10px 0' }}>📸 AIに送信される連続フレーム画像</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            {capturedFrames.map((src, i) => (
              <img key={i} src={src} alt={`frame-${i}`} style={{ width: '32%', borderRadius: '6px', border: '2px solid #059669' }} />
            ))}
          </div>
        </div>
      )}

      {/* AI診断結果表示 */}
      {feedback && (
        <div style={{ marginTop: '20px', background: '#eff6ff', padding: '20px', borderRadius: '12px', border: '2px solid #3b82f6' }}>
          <h3 style={{ color: '#1e40af', marginTop: 0 }}>📋 {feedback.menu} AIコーチ診断結果</h3>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem' }}>
            {feedback.summary}
          </div>
        </div>
      )}

      {/* 過去の履歴 */}
      {history.length > 0 && (
        <div style={{ marginTop: '30px' }}>
          <h3>📜 過去のトレーニング履歴 ({history.length}件)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((item) => (
              <div key={item.id} style={{ background: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                  <span><strong>{item.menu}</strong></span>
                  <span>{item.date}</span>
                </div>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {item.summary.slice(0, 100)}...
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}