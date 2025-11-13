// src/App.tsx
import { Routes, Route } from "react-router-dom";
import Home from "./Home";
import ItineraryPlanner from "./ItineraryPlanner";
import Recommend from "./Recommend";
import Favorites from "./Favorites";
import MyTrips from "./MyTrips";
import TripDetail from "./TripDetail";
import Layout from "./components/Layout"; // <--- 引入 Layout

export default function App(){
  return (
    // 移除最外層的 div 和重複的 ChatBox/ThemeToggle
    <Routes>
      {/* 【關鍵】所有頁面都由 Layout.tsx 負責佈局和背景 */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/planner" element={<ItineraryPlanner />} />
        <Route path="/recommend" element={<Recommend />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/my-trips" element={<MyTrips />} />
        <Route path="/trips/:id" element={<TripDetail />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}