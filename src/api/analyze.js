export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { images, trainingType } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'サーバーにAPIキーが設定されていません' });
    }

    if (!images || images.length === 0) {
      return res.status(400).json({ error: '解析する画像がありません' });
    }

    const imageParts = images.map((base64Str) => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: base64Str.replace(/^data:image\/\w+;base64,/, ''),
      },
    }));

    const promptText = `あなたはプロのサッカーコーチです。送られた「${trainingType}」のフォーム画像（連続写真または静止画）を分析し、以下のJSON形式のみで回答してください。余分なテキストやマークダウンのバッククォート（\`\`\`jsonなど）は一切含めず、純粋なJSON文字列のオブジェクトだけを返してください。

{
  "score": 0から100までの整数評価,
  "advice": "軸足の位置、蹴り足の振り、上半身の傾きなどに触れながら、具体的で分かりやすい日本語の改善アドバイス（150文字程度）"
}`;

    const url = `https://googleapis.com{apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [...imageParts, { text: promptText }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const rawText = data.candidates?.?.content?.parts?.?.text?.trim() || '';
    const cleanJsonText = rawText.replace(/^```json\s*|\s*```$/g, '');
    const result = JSON.parse(cleanJsonText);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Analyze Error:', error);
    return res.status(500).json({ error: 'AI解析中にエラーが発生しました' });
  }
}
