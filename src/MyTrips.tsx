import React, { JSX, useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { TripSerialized } from "./types";
import { loadTrips, saveTrips } from "./lib/trips";
import { format } from "date-fns";
import HomeButton from "./components/HomeButton";

export default function MyTrips(): JSX.Element {
  const [trips, setTrips] = useState<TripSerialized[]>([]);
  const navigate = useNavigate();

  const refresh = useCallback(() => { setTrips(loadTrips()); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const deleteTrip = (id: string) => {
    if (!confirm("確定要刪除此行程？此操作無法復原。")) return;
    saveTrips(loadTrips().filter((t) => t.id !== id));
    refresh();
  };

  return (
    // 【關鍵修正】移除所有背景和 min-h-screen 樣式，讓 Layout 全權控制
    <div className="p-6 max-w-5xl mx-auto">
      <HomeButton />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">我的行程</h1>
        <div className="flex items-center gap-2">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm hover:shadow transition border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
          >
            ← 返回首頁
          </Link>
          <button 
            onClick={() => navigate("/planner")} 
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition"
          >
            新增行程
          </button>
        </div>
      </div>

      {trips.length === 0 ? (
        <div className="text-center p-6 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400">尚無行程，
            <Link to="/planner" className="text-emerald-600 dark:text-emerald-400 underline ml-1">請新增一個行程</Link>。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {[...trips].reverse().map((t) => (
            <div key={t.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 flex flex-wrap justify-between items-center border border-gray-200 dark:border-gray-700 gap-4">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{t.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t.days} 天 · {t.startDate} · 建立於 {format(new Date(t.createdAt), 'yyyy/MM/dd')}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link to={`/trips/${t.id}`} className="px-3 py-1 text-sm bg-slate-200 dark:bg-gray-600 hover:bg-slate-300 dark:hover:bg-gray-500 rounded-md text-gray-800 dark:text-gray-200 transition">查看</Link>
                <Link to={`/planner?editId=${t.id}`} className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition">編輯</Link>
                <button onClick={() => deleteTrip(t.id)} className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition">刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}