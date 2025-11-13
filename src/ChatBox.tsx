import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Loader2, X, Paperclip } from "lucide-react";
import { sendToGemini } from "./lib/geminiChat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMsg = { role: "user" | "assistant"; text: string };

export default function ChatBox() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });
  const [itineraryContext, setItineraryContext] = useState<any | null>(null);

  const ask = useCallback(async (userText: string) => {
    if (!userText.trim()) return;
    setOpen(true);
    setMsgs((m) => [...m, { role: "user", text: userText }]);
    setLoading(true);

    let prompt = userText;
    if (itineraryContext && !userText.startsWith("請介紹這個景點：")) {
      const itineraryJSON = JSON.stringify(itineraryContext, null, 2);
      prompt = `
你是一位專業的智慧旅遊助理。
使用者的問題是：「${userText}」
請根據以下使用者正在查看的行程內容來回答：
\`\`\`json
${itineraryJSON}
\`\`\`
`.trim();
    }

    try {
      const reply = await sendToGemini(prompt);
      setMsgs((m) => [...m, { role: "assistant", text: (reply || "").trim() || "（未收到回覆）" }]);
    } catch (e: any) {
      setMsgs((m) => [ ...m, { role: "assistant", text: `抱歉，無法取得回覆（${e?.message || "未知錯誤"}）` }]);
    } finally {
      setLoading(false);
    }
  }, [itineraryContext]);

  useEffect(() => {
    const onPlace = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { name?: string };
      if (detail?.name) ask(`請介紹這個景點：${detail.name}`);
    };
    window.addEventListener("chatbox:place", onPlace as EventListener);
    return () => window.removeEventListener("chatbox:place", onPlace as EventListener);
  }, [ask]);

  useEffect(() => {
    const onAskForJSON = async (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { prompt?: string, originalQuestion?: string };
      if (!detail?.prompt || !detail.originalQuestion) return;

      setOpen(true);
      setMsgs(m => [...m, { role: 'user', text: detail.originalQuestion! }]);
      setLoading(true);
      
      try {
        const reply = await sendToGemini(detail.prompt);
        try {
          const cleanedReply = reply.substring(reply.indexOf('['), reply.lastIndexOf(']') + 1);
          const parsedSuggestions = JSON.parse(cleanedReply);

          if (Array.isArray(parsedSuggestions) && parsedSuggestions.length > 0) {
            window.dispatchEvent(new CustomEvent('planner:showSuggestions', { detail: parsedSuggestions }));
            setMsgs(m => [...m, { role: 'assistant', text: "我為您規劃了一些建議，請在預覽視窗中查看並決定是否套用。" }]);
          } else {
            throw new Error("AI 回覆的 JSON 內容不正確。");
          }
        } catch (e) {
          console.error("解析 AI JSON 回覆失敗:", e);
          setMsgs(m => [...m, { role: 'assistant', text: `抱歉，我產生的建議格式似乎有點問題，無法自動套用。您可以參考以下原始回覆：\n\n${reply}` }]);
        }
      } catch (e: any) {
        setMsgs(m => [...m, { role: 'assistant', text: `抱歉，規劃行程時呼叫 AI 服務發生錯誤：${e.message}` }]);
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener('chatbox:askForJSON', onAskForJSON as EventListener);
    return () => window.removeEventListener('chatbox:askForJSON', onAskForJSON as EventListener);
  }, []);

  useEffect(() => {
    const onSetContext = (ev: Event) => { setItineraryContext((ev as CustomEvent).detail); };
    const onClearContext = () => { setItineraryContext(null); };
    window.addEventListener("chatbox:setContext", onSetContext as EventListener);
    window.addEventListener("chatbox:clearContext", onClearContext as EventListener);
    return () => {
      window.removeEventListener("chatbox:setContext", onSetContext as EventListener);
      window.removeEventListener("chatbox:clearContext", onClearContext as EventListener);
    };
  }, []);
  
  useEffect(() => {
    const el = dragRef.current;
    if (!el) return;
    const onPointerDown = (e: PointerEvent) => {
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      const rect = el.getBoundingClientRect();
      startRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
      const move = (evt: PointerEvent) => { setPos({ x: Math.max(8, evt.clientX - startRef.current.dx), y: Math.max(8, evt.clientY - startRef.current.dy) }); };
      const up = () => {
        (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    el.addEventListener("pointerdown", onPointerDown);
    return () => el.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="fixed z-50" style={ pos ? { left: pos.x, top: pos.y, width: 360, maxWidth: "92vw" } : { right: 16, bottom: 16, width: 360, maxWidth: "92vw" }}>
      {!open && ( <button className="rounded-2xl shadow-lg bg-emerald-500 text-white px-3 py-2 text-sm inline-flex items-center gap-2 hover:bg-emerald-600 transition" onClick={() => setOpen(true)} title="開啟旅遊助理"> <MessageSquare size={16} /> 旅遊助理 </button> )}
      {open && (
        <div className="rounded-2xl shadow-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div ref={dragRef} className="cursor-grab active:cursor-grabbing bg-emerald-600 text-white px-3 py-2 flex items-center justify-between select-none" title="拖曳以移動">
            <div className="font-medium text-sm inline-flex items-center gap-2"> <MessageSquare size={16} /> 智慧旅遊助理 </div>
            <button className="opacity-90 hover:opacity-100" onClick={() => setOpen(false)}> <X size={16} /> </button>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-3 space-y-2">
            {itineraryContext && (
              <div className="text-xs text-emerald-700 bg-emerald-50 dark:text-emerald-200 dark:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 rounded-md px-2 py-1.5 flex items-center gap-1.5">
                <Paperclip size={12} />
                <span>目前正在討論：<strong>{itineraryContext.name}</strong></span>
              </div>
            )}
            {msgs.length === 0 && ( <div className="text-xs text-gray-500 dark:text-gray-400"> 💬 歡迎使用！您可以隨時向我提問。 </div> )}
            {msgs.map((m, i) => (
              <div key={i} className={ m.role === "user" ? "ml-auto max-w-[85%] rounded-xl bg-emerald-100 dark:bg-emerald-900 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-100" : "mr-auto max-w-[85%] rounded-xl bg-gray-100 dark:bg-gray-700 px-3 py-2 text-sm text-gray-800 dark:text-gray-100" }>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ node, ...props }) => (
                        <a
                          {...(props as any)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 underline"
                        />
                      ),
                    }}
                  >
                    {m.text}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && ( <div className="mr-auto inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm"> <Loader2 className="animate-spin" size={16} /> 正在向 Gemini 詢問… </div> )}
          </div>
          <div className="border-t dark:border-gray-700 p-2 flex items-center gap-2">
            <input className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-400 dark:text-gray-100 dark:placeholder-gray-400" placeholder="對這個行程有什麼問題？" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !loading) { ask(input); setInput(""); } }}/>
            <button className="rounded-xl border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm hover:shadow hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200" onClick={() => { ask(input); setInput(""); }} disabled={loading || !input.trim()}> 送出 </button>
          </div>
        </div>
      )}
    </div>
  );
}