import { Link } from "react-router-dom";
import { loadTrips } from "./lib/trips";
import type { TripSerialized } from "./types";

export default function Home() {
  const cards = [
    { title: "建立行程", subtitle: "Create your trip plan", path: "/planner", icon: "🗺️" },
    { title: "景點推薦", subtitle: "Find nearby attractions", path: "/recommend", icon: "📍" },
    { title: "收藏景點", subtitle: "Save your favorite spots", path: "/favorites", icon: "💖" },
    { title: "我的行程", subtitle: "View and manage your saved trips", path: "/my-trips", icon: "🧳" },
  ];

  let trips: TripSerialized[] = [];
  try {
    // 確保讀取的是 my-trips-v1
    trips = loadTrips();
  } catch {
    trips = [];
  }

  return (
    // 【已修正】移除最外層 div 的樣式，讓 Layout 元件全權控制
    <div>
      {/* ===== Hero 區塊 ===== */}
      <section
        className="w-full bg-cover bg-center relative"
        style={{ backgroundImage: "url('/taipei-101.jpg')" }}
      >
        <div className="bg-black/40 w-full h-full absolute top-0 left-0"></div>
        <div className="relative z-10 flex flex-col items-center justify-center text-center py-32 px-6">
          <h1 className="text-5xl font-extrabold text-white drop-shadow-lg">
            趣旅行 Trip Planner
          </h1>
          <p className="mt-4 text-lg text-gray-100 max-w-2xl">
            輕鬆規劃行程 · 探索新景點 · 收藏美好回憶
          </p>
          <Link
            to="/planner"
            className="mt-8 inline-block bg-emerald-500 text-white font-semibold px-6 py-3 rounded-xl shadow hover:bg-emerald-600 transition"
          >
            🚀 開始規劃行程
          </Link>
        </div>
      </section>

      {/* ===== 功能導覽卡片 ===== */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-8 w-full max-w-6xl px-6 mt-16 mx-auto">
        {cards.map((c, idx) => (
          <Link
            key={idx}
            to={c.path}
            className="rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 p-8 flex flex-col items-center text-center border border-gray-200 dark:border-gray-700"
          >
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mb-6 text-3xl">
              {c.icon}
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{c.title}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{c.subtitle}</p>
          </Link>
        ))}
      </section>

      {/* ===== 最近行程區塊 ===== */}
      <section className="w-full max-w-6xl px-6 mt-20 mb-24 mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">🕓 最近建立的行程</h2>
        {trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trips
              .slice(-3)
              .reverse()
              .map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl bg-white/60 dark:bg-gray-800/60 backdrop-blur shadow-md p-6 hover:shadow-xl transition border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{t.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {t.days} 天行程 · 開始於 {t.startDate}
                  </p>
                  <Link
                    to={`/planner?editId=${t.id}`}
                    className="inline-block mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600"
                  >
                    繼續編輯
                  </Link>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-sm bg-white/60 dark:bg-gray-800/60 border dark:border-gray-700 rounded-xl p-6 text-center">
            目前沒有已儲存的行程，
            <Link to="/planner" className="text-emerald-600 dark:text-emerald-400 underline">
              立即建立一個吧！
            </Link>
          </div>
        )}
      </section>

      {/* ===== Footer ===== */}
      <footer className="w-full border-t border-gray-200 dark:border-gray-700 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        <p>© 2025 趣旅行 Trip Planner · Built with ❤️ using React + Tailwind</p>
        <p className="mt-1">
          Data from <span className="font-medium">Google Maps & Places API</span>
        </p>
      </footer>
    </div>
  );
}