// src/lib/geminiChat.ts
export async function sendToGemini(message: string) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("❌ 找不到 Gemini API Key");

  // ✅ 使用最新 v1beta API（你帳號支援這個）
  const API_VERSION = "v1beta";

  // ✅ 根據你帳號實際可用的模型更新清單
  const CANDIDATE_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-pro-preview-06-05",
  ];

  const payload = {
    contents: [{ role: "user", parts: [{ text: message }] }],
  };

  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${model}:generateContent?key=${apiKey}`;
    console.log("🌐 嘗試模型：", model, "→", url);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (res.ok) {
        const text =
          body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "（沒有回覆）";
        console.log("✅ 成功使用模型：", model);
        return text;
      }

      if (res.status === 404) {
        console.warn(`⚠️ 模型不存在（${model}）：`, body?.error?.message ?? body);
        lastError = body;
        continue;
      }

      console.error(`❌ API 錯誤（${model}）：`, res.status, body);
      throw new Error(`Gemini API Error ${res.status}`);
    } catch (err) {
      console.error(`❌ 呼叫失敗（${model}）：`, err);
      lastError = err;
    }
  }

  console.error("❌ 所有候選模型都無法使用。最後錯誤：", lastError);
  throw new Error("❌ 無可用的 Gemini 模型（請確認金鑰或改用其他模型名稱）");
}
