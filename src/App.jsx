import React, { useState, useRef } from 'react';
import './App.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [trainingType, setTrainingType] = useState('インステップシュート');
  const [mode, setMode] = useState('none');
  const [videoSrc, setVideoSrc] = useState(null);
  const [extractedFrames, setExtractedFrames] = useState([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [advice, setAdvice] = useState('上のボタンから「カメラで撮影」または「動画ファイルをアップロード」を行ってください。');
  const [score, setScore] = useState(null);

  const startCamera = async () => {
    stopCamera();
    setVideoSrc(null);
    setExtractedFrames([]);
    setScore(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setMode('camera');
        setAdvice('カメラ起動完了！フォームを映して「フォームを解析する」を押してください。');
      }
    } catch (err) {
      console.error('カメラの起動に失敗しました:', err);
      alert('カメラへのアクセスが許可されていないか、利用できません。');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    stopCamera();
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
    setMode('video');
    setScore(null);
    setAdvice('動画を読み込みました。「フォームを解析する」を押すとAIが連続動作を分析します。');
    setExtractedFrames([]);
  };

  const extractFramesFromVideo = () => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return resolve([]);

      const duration = video.duration || 1;
      const timePoints = [duration * 0.25, duration * 0.5, duration * 0.75];
      const frames = [];
      let currentIndex = 0;

      const captureAtTime = () => {
        if (currentIndex >= timePoints.length) {
          setExtractedFrames(frames);
          resolve(frames);
          return;
        }
        video.currentTime = timePoints[currentIndex];
      };

      video.onseeked = () => {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL('image/jpeg', 0.8));
        currentIndex++;
        captureAtTime();
      };

      captureAtTime();
    });
  };

  const captureCameraFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return [];

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setExtractedFrames([dataUrl]);
    return [dataUrl];
  };

  const handleAnalyzeForm = async () => {
    if (mode === 'none') {
      alert('先にカメラを起動するか、動画をアップロードしてください！');
      return;
    }

    setIsAnalyzing(true);
    setAdvice('AIコーチ（Gemini）がフォームを解析中...');
    setScore(null);

    try {
      let imagesToSend = [];
      if (mode === 'camera') {
        imagesToSend = captureCameraFrame();
      } else if (mode === 'video') {
        imagesToSend = await extractFramesFromVideo();
      }

      if (imagesToSend.length === 0) {
        throw new Error('画像の取得に失敗しました');
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imagesToSend,
          trainingType: trainingType,
        }),
      });

      if (!res.ok) {
        throw new Error(`サーバーエラー: ${res.status}`);
      }

      const result = await res.json();
      setScore(result.score);
      setAdvice(result.advice);
    } catch (err) {
      console.error('AI解析エラー:', err);
      setAdvice('解析に失敗しました。もう一度撮影・選択して試してください。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <header className="app-header" style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1
          className="app-title"
          style={{
            fontSize: '24px',
            lineHeight: '1.4',
            margin: 0,
            wordBreak: 'keep-all',
          }}
        >
          ⚽ AI サッカー教育・<wbr />完全版プログラム
        </h1>
      </header>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
          トレーニング種目：
        </label>
        <select
          value={trainingType}
          onChange={(e) => setTrainingType(e.target.value)}
          style={{ width: '100%', padding: '10px', fontSize: '16px', borderRadius: '6px' }}
        >
          <option value="インステップシュート">インステップシュート</option>
          <option value="インサイドパス">インサイドパス</option>
          <option value="ドリブル姿勢">ドリブル姿勢</option>
          <option value="トラップ（コントロール）">トラップ（コントロール）</option>
          <option value="ヘディング">ヘディング</option>
        </select>
      </div>

      <div className="button-group" style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button
          className="btn btn-primary"
          onClick={startCamera}
          style={{ flex: 1, padding: '12px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          📷 カメラで撮影するモード
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => fileInputRef.current.click()}
          style={{ flex: 1, padding: '12px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          📁 動画ファイルをアップロード
        </button>
        <input
          type="file"
          accept="video/*"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
      </div>

      <div style={{ backgroundColor: '#0f172a', borderRadius: '8px', overflow: 'hidden', minHeight: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
        {mode === 'none' && (
          <p style={{ color: '#94a3b8', padding: '20px', textAlign: 'center' }}>
            上のボタンから「カメラ起動」または「動画ファイル選択」を行ってください。
          </p>
        )}
        <video
          ref={videoRef}
          src={videoSrc || undefined}
          autoPlay={mode === 'camera'}
          playsInline
          controls={mode === 'video'}
          style={{ width: '100%', display: mode === 'none' ? 'none' : 'block' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {extractedFrames.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
          {extractedFrames.map((src, idx) => (
            <img
              key={idx}
              src={src}
              alt={`frame-${idx}`}
              style={{ width: `${100 / extractedFrames.length}%`, borderRadius: '6px', border: '2px solid #10b981' }}
            />
          ))}
        </div>
      )}

      <button
        onClick={handleAnalyzeForm}
        disabled={isAnalyzing || mode === 'none'}
        style={{
          width: '100%',
          padding: '15px',
          fontSize: '18px',
          fontWeight: 'bold',
          backgroundColor: isAnalyzing || mode === 'none' ? '#94a3b8' : '#f59e0b',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: isAnalyzing || mode === 'none' ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
        }}
      >
        {isAnalyzing ? '解析中...' : '✨ AIコーチにフォームを解析してもらう'}
      </button>

      <div className="ai-result-card" style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '16px' }}>🤖 AIコーチング・アドバイス</span>
          {score !== null && (
            <span style={{ marginLeft: 'auto', color: '#10b981', fontWeight: 'bold', fontSize: '18px' }}>
              評価: {score}点
            </span>
          )}
        </div>
        <p style={{ lineHeight: '1.6', margin: 0 }}>{advice}</p>
      </div>
    </div>
  );
}

export default App;
