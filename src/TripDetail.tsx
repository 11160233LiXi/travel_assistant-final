// src/TripDetail.tsx (最終修正版)

import React, { useMemo, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { TripSerialized } from "./types";
import { loadTrips } from "./lib/trips";
import HomeButton from "./components/HomeButton";

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const trip = useMemo<TripSerialized | undefined>(() => {
    if (!id) return undefined;
    return loadTrips().find((t) => t.id === id);
  }, [id]);

  useEffect(() => {
    if (trip) {
      window.dispatchEvent(new CustomEvent('chatbox:setContext', { detail: trip }));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('chatbox:clearContext'));
    };
  }, [trip]);

  if (!id) return <div className="p-6 text-red-500">找不到行程 ID。</div>;
  if (!trip)
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
        <p className="mb-4">找不到該行程（ID: {id}）。</p>
        <div className="flex gap-2">
          <Link to="/my-trips" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">回到我的行程</Link>
          <button onClick={() => navigate(-1)} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">返回</button>
        </div>
      </div>
    );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <HomeButton />
      <div className="flex items-start justify-between mb-6">
        <div>
            <h1 className="text-3xl font-bold dark:text-white">{trip.name}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">建立於：{format(new Date(trip.createdAt), 'yyyy-MM-dd HH:mm')}</p>
        </div>
        <div className="text-right">
            <div className="text-lg font-semibold dark:text-white">{trip.days} 天</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">自 {trip.startDate} 開始</div>
        </div>
      </div>

      <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-3 dark:text-white">景點清單 ({trip.places.length} 個)</h2>
        <ol className="list-decimal list-inside space-y-3">
          {trip.places.map((p, i) => (
            <li key={p.id} className="text-sm border-b dark:border-gray-700 pb-2 last:border-b-0">
              <div className="font-medium text-gray-800 dark:text-gray-100">{i + 1}. {p.name}</div>
              {p.address && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.address}</div>}
            </li>
          ))}
        </ol>
      </section>
      
      <section className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-3 dark:text-white">原始行程資料 (JSON)</h2>
        <pre className="text-xs max-h-64 overflow-auto bg-gray-100 dark:bg-gray-900 dark:text-gray-300 p-3 rounded-md">{JSON.stringify(trip, null, 2)}</pre>
      </section>

      <div className="mt-6 flex gap-3">
        <Link to="/my-trips" className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 transition text-gray-800 dark:text-gray-200">回到我的行程</Link>
        <Link to={`/planner?editId=${trip.id}`} className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition">
          繼續編輯此行程
        </Link>
      </div>
    </div>
  );
}
