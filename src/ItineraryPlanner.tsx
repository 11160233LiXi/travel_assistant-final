import { useCallback, useEffect, /* useMemo (未使用) */ useRef, useState } from "react";
import {
  GoogleMap,
  Marker,
  DirectionsRenderer,
  Autocomplete,
  InfoWindow,
} from "@react-google-maps/api";
import { format } from "date-fns";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import {
  // Plus, (未使用)
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock3,
  MapPinned,
  Wand2,
  CalendarDays,
  X,
  FolderPlus,
  Bot,
  Download,
} from "lucide-react";
import type {
  PlaceItem,
  DayBlockSerialized,
  // TripSerialized, (未使用)
  DayBlock,
  PlaceSuggestion,
} from "./types";
import { loadTrips, saveTrips, findTrip } from "./lib/trips";
import HomeButton from "./components/HomeButton";

// 已更新為支援 dark mode 的樣式
const card = "rounded-2xl shadow-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur border border-gray-200 dark:border-gray-700 p-4";
const btn = "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm hover:shadow transition active:scale-[0.98] border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200";
const iconBtn = "p-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300";

const TAIPEI = { lat: 25.033964, lng: 121.564468 };

function uid() { return Math.random().toString(36).slice(2, 10); }
function minutesToReadable(min: number) {
  if (min < 60) return `${Math.round(min)} 分鐘`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h} 小時${m ? ` ${m} 分` : ""}`.trim();
}

// 修正 (TS2503)：移除了 ': JSX.Element'。這需要配合 tsconfig.json 的 "jsx" 設定
export default function ItineraryPlanner() {
  // 修正 (no-explicit-any)：使用更安全的型別
  const [sdkReady, setSdkReady] = useState<boolean>(() => typeof (window as Window & { google?: unknown }).google !== "undefined");
  useEffect(() => {
    if (sdkReady) return;
    const iv = setInterval(() => {
      // 修正 (no-explicit-any)
      if (typeof (window as Window & { google?: unknown }).google !== "undefined") {
        setSdkReady(true);
        clearInterval(iv);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [sdkReady]); // 修正 (exhaustive-deps)：補上 'sdkReady'

  const mapRef = useRef<google.maps.Map | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);
  // 修正 (no-unused-vars)：將未使用的 setter 加上底線
  const [mapCenter] = useState(TAIPEI);
  const [zoom] = useState(12);
  const [auto, setAuto] = useState<google.maps.places.Autocomplete | null>(null);
  const [searchVal, setSearchVal] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const editId = searchParams.get("editId");
  const hydratedFromTripRef = useRef(false);
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [days, setDays] = useState<number>(3);
  const [dayStartTime, setDayStartTime] = useState<string>("09:00");
  const [dayEndTime, setDayEndTime] = useState<string>("19:00");
  const [schedule, setSchedule] = useState<DayBlock[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerReady, setContainerReady] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.PlaceResult | null>(null);
  
  // 修正 (TS 語法錯誤)：將 'null(null)' 修正為 'null>(null)'
  const [infoWindowPos, setInfoWindowPos] = useState<{ lat: number; lng: number } | null>(null);
  
  type FavPlace = { id: string; name: string; lat: number; lng: number; address?: string };
  type FavFolder = { id: string; name: string; places: FavPlace[] };
  const [showFavModal, setShowFavModal] = useState(false);
  const [favFolders, setFavFolders] = useState<FavFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [favSelected, setFavSelected] = useState<Record<string, boolean>>({});
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);
  const [suggestedPlaces, setSuggestedPlaces] = useState<PlaceSuggestion[]>([]);

  // ... (所有 useEffect 和函式邏輯保持不變) ...
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    if (el.clientWidth > 0) { setContainerReady(true); return; }
    const ro = new ResizeObserver(() => { if (el.clientWidth > 0) { setContainerReady(true); ro.disconnect(); } });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (sdkReady && containerReady) { setMapKey(k => k + 1); }
  }, [sdkReady, containerReady, location.pathname]);

  const loadFavorites = useCallback((): { folders: FavFolder[] } => {
    try {
      const parsed = JSON.parse(localStorage.getItem("favorites-v1") || '{"folders":[]}');
      return { folders: Array.isArray(parsed.folders) ? parsed.folders : [] };
    } catch { return { folders: [] }; }
  }, []);

  useEffect(() => {
    if (!showFavModal) return;
    const { folders } = loadFavorites();
    setFavFolders(folders);
    setFavSelected({});
  }, [showFavModal, loadFavorites]);

  useEffect(() => {
    if (!editId || hydratedFromTripRef.current) return;
    const found = findTrip(editId);
    if (!found) { navigate("/my-trips"); return; }
    setStartDate(found.startDate);
    setDays(found.days);
    setDayStartTime(found.dayStartTime);
    setDayEndTime(found.dayEndTime);
    setPlaces(found.places ?? []);
    try {
      const scheduleData = (found.schedule ?? []).map((d: DayBlockSerialized) => ({...d, date: new Date(d.date), items: d.items.map(it => ({...it, start: new Date(it.start), end: new Date(it.end)}))}));
      setSchedule(scheduleData);
    } catch { setSchedule([]); }
    hydratedFromTripRef.current = true;
  }, [editId, navigate]);

  useEffect(() => {
    if (editId) {
      const tripName = findTrip(editId)?.name || "編輯中的行程";
      const currentContext = { id: editId, name: tripName, startDate, days, dayStartTime, dayEndTime, places, schedule };
      window.dispatchEvent(new CustomEvent('chatbox:setContext', { detail: currentContext }));
    } else {
      window.dispatchEvent(new CustomEvent('chatbox:clearContext'));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('chatbox:clearContext'));
    };
  }, [editId, places, startDate, days, dayStartTime, dayEndTime, schedule]);

  useEffect(() => {
    if (!editId || hydratedFromTripRef.current) {
      localStorage.setItem("itinerary-v1", JSON.stringify(places));
    }
  }, [places, editId]);

  // 修正 (TS2448)：將 fitToMarkers 移至 onLoadMap 之前
  const fitToMarkers = useCallback(() => {
    if (!mapRef.current || places.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    places.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
    mapRef.current.fitBounds(bounds);
  }, [places]);

  const onLoadMap = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    if (listenerRef.current) google.maps.event.removeListener(listenerRef.current);
    setTimeout(() => {
      google.maps.event.trigger(map, "resize");
      if (places.length > 0) fitToMarkers(); else map.setCenter(mapCenter);
    }, 100);
    // 修正 (no-explicit-any)：加入 eslint-disable 註解
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listenerRef.current = map.addListener('click', (e: google.maps.MapMouseEvent | any) => {
      if (e.placeId) {
        e.stop();
        const svc = new google.maps.places.PlacesService(map);
        svc.getDetails({ placeId: e.placeId, fields: ["name", "formatted_address", "geometry", "place_id"] }, (place, status) => {
          if (status === 'OK' && place?.geometry?.location) {
            setSelectedPlace(place);
            setInfoWindowPos(place.geometry.location.toJSON());
            map.panTo(place.geometry.location);
          }
        });
      } else {
        setSelectedPlace(null);
        setInfoWindowPos(null);
      }
    });
  }, [places.length, fitToMarkers, mapCenter]); // 修正 (exhaustive-deps)：補上依賴

  // 修正 (exhaustive-deps)：使用 fitToMarkers 函式
  useEffect(() => {
    fitToMarkers();
  }, [fitToMarkers]);

  const handlePlaceChanged = useCallback(() => {
    const gPlace = auto?.getPlace();
    if (!gPlace?.geometry?.location) return;
    const loc = gPlace.geometry.location;
    const next = { id: uid(), name: gPlace.name!, address: gPlace.formatted_address, lat: loc.lat(), lng: loc.lng(), placeId: gPlace.place_id, durationMinutes: 60, day: 1 };
    setPlaces(p => [...p, next]);
    setSearchVal("");
  }, [auto]);

  const addSelectedPlaceToItinerary = useCallback(() => {
    if (!selectedPlace?.geometry?.location) return;
    const { name, formatted_address, place_id, geometry: { location } } = selectedPlace;
    const newPlace = { id: uid(), name: name!, address: formatted_address, lat: location!.lat(), lng: location!.lng(), placeId: place_id, durationMinutes: 60, day: 1 };
    setPlaces(p => [...p, newPlace]);
    setSelectedPlace(null);
  }, [selectedPlace]);
  
  const removePlace = (id: string) => setPlaces(p => p.filter(x => x.id !== id));
  const moveUp = (i: number) => { if (i > 0) setPlaces(p => { const a=[...p]; [a[i-1],a[i]]=[a[i],a[i-1]]; return a; }); };
  const moveDown = (i: number) => { if (i < places.length - 1) setPlaces(p => { const a=[...p]; [a[i+1],a[i]]=[a[i],a[i+1]]; return a; }); };

  const computeRoute = useCallback(async (optimize: boolean): Promise<{res: google.maps.DirectionsResult | null, reordered: boolean}> => {
    if (!sdkReady || places.length < 2) { 
        setDirections(null); 
        return {res: null, reordered: false}; 
    }
    const svc = new google.maps.DirectionsService();
    const origin = new google.maps.LatLng(places[0].lat, places[0].lng);
    const destination = new google.maps.LatLng(places[places.length - 1].lat, places[places.length - 1].lng);
    const waypointPlaces = places.slice(1, -1);
    const waypoints = waypointPlaces.map((p) => ({
        location: new google.maps.LatLng(p.lat, p.lng),
        stopover: true,
    }));
    const res = await svc.route({
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: optimize,
    });
    setDirections(res);
    const order = res.routes?.[0]?.waypoint_order;
    if (optimize && order && order.length > 0) {
        const isUnchanged = order.every((val, index) => val === index);
        if (!isUnchanged) {
            const newSeq = [places[0], ...order.map((i) => waypointPlaces[i]), places[places.length - 1]];
            setPlaces(newSeq);
            return { res, reordered: true };
        }
    }
    return { res, reordered: false };
  }, [sdkReady, places]);

  const handleOptimize = useCallback(async () => {
    setOptimizing(true);
    try {
      const { reordered } = await computeRoute(true);
      if (reordered) {
        alert("✅ 行程已重新排序為最順路線！");
      } else {
        alert("ℹ️ 目前的順序已經是最佳路線了。");
      }
    } catch (e) {
      console.error("Route optimization failed", e);
      alert("⚠️ 路線排序失敗，請稍後再試。");
    } finally {
      setOptimizing(false);
    }
  }, [computeRoute]);

  useEffect(() => {
    computeRoute(false);
  }, [computeRoute]);

  const buildSchedule = useCallback(async () => {
    const { res } = await computeRoute(false);
    const start = new Date(`${startDate}T${dayStartTime}:00`);
    const daysArr = Array.from({ length: days }, (_, d) => {
      const dateBase = new Date(start);
      dateBase.setDate(start.getDate() + d);
      return { date: dateBase, items: [] as DayBlock['items'] };
    });
    const routeLegs = res?.routes?.[0]?.legs || [];
    const placesByDay = Array.from({ length: days }, (): PlaceItem[] => []);
    places.forEach(p => {
      const dayIndex = Math.max(0, Math.min((p.day ?? 1) - 1, days - 1));
      placesByDay[dayIndex].push(p);
    });
    for (let d = 0; d < days; d++) {
      const dailyPlaces = placesByDay[d];
      let cursor = new Date(`${format(daysArr[d].date, "yyyy-MM-dd")}T${dayStartTime}:00`);
      for (let k = 0; k < dailyPlaces.length; k++) {
        const place = dailyPlaces[k];
        let travelMinutes = 0, distanceText;
        if (k > 0) {
          const prevPlace = dailyPlaces[k-1];
          const globalPrevIdx = places.findIndex(p => p.id === prevPlace.id);
          const leg = routeLegs[globalPrevIdx];
          if (leg) {
            travelMinutes = (leg.duration?.value || 0) / 60;
            distanceText = leg.distance?.text;
          }
        }
        cursor = new Date(cursor.getTime() + travelMinutes * 60000);
        const startTime = new Date(cursor);
        const endTime = new Date(startTime.getTime() + (place.durationMinutes || 60) * 60000);
        daysArr[d].items.push({ start: startTime, end: endTime, place, travelMinutesBefore: travelMinutes, distanceText });
        cursor = endTime;
      }
    }
    setSchedule(daysArr);
    alert("✅ 時間表已產生！");
  }, [computeRoute, startDate, dayStartTime, days, places]);

  const saveTrip = useCallback(() => {
    const isEdit = Boolean(editId);
    const defaultName = isEdit
      ? findTrip(editId ?? "")?.name || `編輯中的行程`
      : `我的行程 ${format(new Date(startDate), "MM/dd")} · ${days}天`;
    const name = prompt("請輸入行程名稱：", defaultName);
    if (!name) return;
    const trips = loadTrips();
    const serializedSchedule = schedule.map(d => ({...d, date: d.date.toISOString(), items: d.items.map(it => ({...it, start: it.start.toISOString(), end: it.end.toISOString()}))}));
    const newTrip = { id: isEdit ? editId! : uid(), createdAt: new Date().toISOString(), name, startDate, days, dayStartTime, dayEndTime, places, schedule: serializedSchedule };
    const existingIdx = isEdit ? trips.findIndex(t => t.id === editId) : -1;
    if (existingIdx > -1) { trips[existingIdx] = newTrip; } else { trips.push(newTrip); }
    saveTrips(trips);
    alert(isEdit ? "✅ 行程已更新！" : "✅ 行程已儲存！");
    navigate("/my-trips");
  }, [editId, startDate, days, dayStartTime, dayEndTime, places, schedule, navigate]);

  const addSelectedFavoritesToItinerary = useCallback(() => {
    const selectedIds = Object.keys(favSelected).filter((id) => favSelected[id]);
    if (selectedIds.length === 0) { setShowFavModal(false); return; }
    const pool = favFolders.flatMap(f => f.places);
    const placesToAdd = pool.filter(p => selectedIds.includes(p.id)).map(p => ({
        id: uid(), name: p.name, address: p.address, lat: p.lat, lng: p.lng,
        durationMinutes: 60, day: selectedDayIndex + 1,
    } as PlaceItem));
    setPlaces(prev => [...prev, ...placesToAdd]);
    setShowFavModal(false);
  }, [favSelected, favFolders, selectedDayIndex]);

  const handleAskAIForSuggestions = useCallback(() => {
    const question = prompt("你想問 AI 什麼關於這個行程的問題？", "請根據我目前的行程，為第一天下午規劃 3 個在信義區的景點。");
    if (!question) return;
    const currentItineraryContext = { startDate, days, dayStartTime, dayEndTime, places, schedule };
    const fullPrompt = `
你是一位專業的旅遊行程規劃師。
使用者的問題是：「${question}」
這是使用者目前的行程資料，供你參考：
\`\`\`json
${JSON.stringify(currentItineraryContext, null, 2)}
\`\`\`
請嚴格遵守以下規則：
1. 根據使用者的問題，提供建議的景點。
2. 你的回覆**必須是**一個 JSON 格式的陣列，其結構為 \`[{"name": "...", "reason": "...", "stayMinutes": 60}]\`。
3. 不要添加任何 JSON 以外的文字、開頭或結尾的解釋。你的回覆必須直接就是一個合法的 JSON 字串。
4. "name" 必須是該地點在 Google Maps 上的確切、可搜尋的官方名稱。

範例回覆格式：
[{"name": "台北101觀景台", "reason": "台北市的標誌性地標，可俯瞰市景。", "stayMinutes": 90}]
    `.trim();
    window.dispatchEvent(new CustomEvent('chatbox:askForJSON', {
      detail: { prompt: fullPrompt, originalQuestion: question }
    }));
  }, [startDate, days, dayStartTime, dayEndTime, places, schedule]);

  const handleApplySuggestions = useCallback(async () => {
    if (!mapRef.current || suggestedPlaces.length === 0) return;
    alert("正在為您查詢並加入建議景點，請稍候...");
    const placesService = new google.maps.places.PlacesService(mapRef.current);
    const placesPromises = suggestedPlaces.map(suggestion => 
      new Promise<PlaceItem | null>((resolve) => {
        placesService.findPlaceFromQuery({
          query: suggestion.name,
          fields: ['name', 'formatted_address', 'geometry', 'place_id']
        }, (results, status) => {
          // 修正：以局部變數搭配可選鏈結讓 TS 正確縮小型別
          const place = results && results[0];
          const loc = place?.geometry?.location ?? null;
          if (status === 'OK' && place && loc) {
            resolve({
              id: uid(),
              name: place.name!,
              address: place.formatted_address,
              lat: loc.lat(),
              lng: loc.lng(),
              placeId: place.place_id,
              durationMinutes: suggestion.stayMinutes,
              day: 1
            });
          } else {
            console.warn(`找不到地點: ${suggestion.name}`);
            resolve(null);
          }
        });
      })
    );
    const newPlaces = (await Promise.all(placesPromises)).filter(p => p !== null) as PlaceItem[];
    setPlaces(prev => [...prev, ...newPlaces]);
    setShowSuggestionModal(false);
    setSuggestedPlaces([]);
    alert(`✅ 已成功加入 ${newPlaces.length} 個建議景點！`);
  }, [suggestedPlaces]);

  const onShowSuggestions = useCallback((ev: Event) => {
    const suggestions = (ev as CustomEvent).detail as PlaceSuggestion[];
    if (suggestions && suggestions.length > 0) {
      setSuggestedPlaces(suggestions);
      setShowSuggestionModal(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('planner:showSuggestions', onShowSuggestions);
    return () => window.removeEventListener('planner:showSuggestions', onShowSuggestions);
  }, [onShowSuggestions]);
  
  if (!sdkReady) return <div className="p-6">地圖載入中...</div>;

  return (
    <div className="w-full">
      <HomeButton />
      <header className="sticky top-0 z-20 border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-2xl bg-emerald-500 text-white grid place-items-center font-bold">趣</div>
                <div><h1 className="text-lg font-semibold dark:text-white">行程規劃器</h1></div>
            </div>
            <div className="flex items-center gap-2">
                {/* 【新增】匯出 JSON 按鈕 */}
                <button 
                  className={btn}
                  onClick={() => {
                    const data = { startDate, days, dayStartTime, dayEndTime, places, schedule };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `itinerary_${startDate}.json`;
                    document.body.appendChild(a); // 確保在所有瀏覽器中都能運作
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download size={16} />
                  匯出 JSON
                </button>
                <button className={btn} onClick={saveTrip}>儲存行程</button>
            </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-4 md:grid-cols-5">
        <section className="md:col-span-2 space-y-4">
          <div className={card}>
            <h2 className="mb-3 text-base font-semibold flex items-center gap-2"><MapPinned size={18}/> 新增景點</h2>
            <div className="flex gap-2 flex-wrap">
              <Autocomplete onLoad={ac => setAuto(ac)} onPlaceChanged={handlePlaceChanged}>
                <input className="w-full flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400 dark:text-gray-100 dark:placeholder-gray-400" placeholder="搜尋景點..." value={searchVal} onChange={e => setSearchVal(e.target.value)} />
              </Autocomplete>
              <button className={btn} onClick={() => setShowFavModal(true)} title="從收藏加入"><FolderPlus size={16}/> 收藏</button>
            </div>
          </div>
          <div className={card}>
            <h2 className="mb-3 text-base font-semibold flex items-center gap-2"><Clock3 size={18}/> 行程設定</h2>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">開始日期 <input type="date" className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 dark:scheme:dark] dark:text-gray-100" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
              <label className="text-sm">天數 <input type="number" min={1} className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 dark:text-gray-100" value={days} onChange={e => setDays(parseInt(e.target.value || "1"))} /></label>
              <label className="text-sm">每日開始 <input type="time" className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 dark:-scheme:dark] dark:text-gray-100" value={dayStartTime} onChange={e => setDayStartTime(e.target.value)} /></label>
              <label className="text-sm">每日結束 <input type="time" className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 dark:-scheme:dark] dark:text-gray-100" value={dayEndTime} onChange={e => setDayEndTime(e.target.value)} /></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={btn} onClick={buildSchedule}><CalendarDays size={16}/> 產生時間表</button>
              <button className={btn} onClick={handleOptimize} disabled={optimizing || places.length < 2}><Wand2 size={16}/> {optimizing ? "排序中…" : "最順路排序"}</button>
              <button className={`${btn} bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800`} onClick={handleAskAIForSuggestions}><Bot size={16}/> AI 優化建議</button>
            </div>
          </div>
          <div className={card}>
            <h2 className="mb-3 text-base font-semibold">行程清單 ({places.length})</h2>
            <ol className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
              {places.map((p, i) => (
                <li key={p.id} className="flex items-start justify-between gap-2 rounded-xl border p-3 border-gray-200 dark:border-gray-700">
                  <div>
                    <div className="font-medium cursor-pointer" title="點擊介紹景點" onClick={() => window.dispatchEvent(new CustomEvent("chatbox:place", { detail: { name: p.name } }))}>
                      {i + 1}. {p.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{p.address}</div>
                    <div className="mt-2 text-xs flex items-center gap-2">
                      <span>停留:</span>
                      <input type="number" min={15} step={15} value={p.durationMinutes} onChange={e => { const v = parseInt(e.target.value); setPlaces(prev => prev.map(x => x.id === p.id ? {...x, durationMinutes: v} : x)); }} className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm dark:text-gray-100" />
                      <span>分</span>
                    </div>
                    <div className="mt-1 text-xs flex items-center gap-2">
                      <span>第</span>
                      <select value={p.day ?? 1} onChange={e => { const day = parseInt(e.target.value); setPlaces(prev => prev.map(x => x.id === p.id ? {...x, day} : x)); }} className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm dark:text-white">
                        {Array.from({ length: days }, (_, idx) => (<option key={idx + 1} value={idx + 1}>{idx + 1}</option>))}
                      </select>
                      <span>天</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className={iconBtn} onClick={() => moveUp(i)} title="上移"><ArrowUp size={16}/></button>
                    <button className={iconBtn} onClick={() => moveDown(i)} title="下移"><ArrowDown size={16}/></button>
                    <button className={`${iconBtn} text-red-500`} onClick={() => removePlace(p.id)} title="刪除"><Trash2 size={16}/></button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="md:col-span-3 space-y-4">
          <div className={`${card} p-0 overflow-hidden`}>
            <div ref={mapContainerRef} className="h-[420px] w-full">
              {sdkReady && containerReady && (
                <GoogleMap key={mapKey} onLoad={onLoadMap} center={mapCenter} zoom={zoom} mapContainerStyle={{ width: "100%", height: "100%" }} options={{ mapTypeControl: false, streetViewControl: false }}>
                  {places.map((p, idx) => (<Marker key={p.id} position={{ lat: p.lat, lng: p.lng }} label={`${idx + 1}`} onClick={() => window.dispatchEvent(new CustomEvent("chatbox:place", { detail: { name: p.name } }))} />))}
                  {directions && (<DirectionsRenderer directions={directions} options={{ suppressMarkers: true, polylineOptions: { strokeColor: '#10b981', strokeWeight: 5 } }} />)}
                  {infoWindowPos && selectedPlace && (
                    <InfoWindow position={infoWindowPos} onCloseClick={() => setSelectedPlace(null)}>
                      <div className="p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        <div className="font-medium">{selectedPlace.name}</div>
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => window.dispatchEvent(new CustomEvent("chatbox:place", { detail: { name: selectedPlace.name } }))} className="px-2 py-1 bg-emerald-500 text-white rounded text-xs">介紹</button>
                          <button onClick={addSelectedPlaceToItinerary} className="px-2 py-1 bg-gray-800 text-white rounded text-xs">加入行程</button>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </GoogleMap>
              )}
            </div>
          </div>
          <div className={card}>
            <h2 className="mb-3 text-base font-semibold flex items-center gap-2"><CalendarDays size={18}/> 行程時間表</h2>
            {schedule.length === 0 ? (<p className="text-sm text-gray-500 dark:text-gray-400">點擊「產生時間表」來查看。</p>) : (
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                {schedule.map((d, idx) => (
                  <div key={idx} className="rounded-xl border p-3 border-gray-200 dark:border-gray-700">
                    <div className="font-medium mb-2">第 {idx + 1} 天 · {format(d.date, "yyyy/MM/dd")}</div>
                    <ol className="space-y-2">
                      {d.items.map((it, j) => (
                        <li key={j} className="text-sm flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">{format(it.start, "HH:mm")} - {format(it.end, "HH:mm")} · {it.place.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">交通: {it.travelMinutesBefore ? `${minutesToReadable(it.travelMinutesBefore)}` : "—"}{it.distanceText ? ` (${it.distanceText})` : ""}</div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">停留 {it.place.durationMinutes} 分</div>
                        </li>
                      ))}
                      {d.items.length === 0 && (<li className="text-xs text-gray-500 dark:text-gray-400">本日無行程</li>)}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      
      {showFavModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 w-[92vw] max-w-xl rounded-2xl shadow-xl overflow-hidden">
                <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
                    <div className="font-semibold dark:text-white">從收藏加入</div>
                    <button className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300" onClick={() => setShowFavModal(false)}><X size={16} /></button>
                </div>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <div className="flex gap-2 mb-4">
                        <select value={selectedFolderId ?? ""} onChange={(e) => setSelectedFolderId(e.target.value || null)} className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-sm dark:text-white">
                            <option value="">所有資料夾</option>
                            {favFolders.map((folder) => (<option key={folder.id} value={folder.id}>{folder.name}</option>))}
                        </select>
                        <select value={selectedDayIndex} onChange={e => setSelectedDayIndex(Number(e.target.value))} className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2 text-sm dark:text-white">
                            {Array.from({length: days}, (_, i) => <option key={i} value={i}>第 {i+1} 天</option>)}
                        </select>
                    </div>
                    {(favFolders.length === 0) ? <div className="text-sm text-gray-500 dark:text-gray-400">無收藏資料</div> : (
                        <ul className="space-y-2">
                            {(favFolders.filter(f => !selectedFolderId || f.id === selectedFolderId)).flatMap(f => f.places).map(p => (
                                <li key={p.id} className="flex items-start gap-2 rounded border p-2 border-gray-200 dark:border-gray-700">
                                    <input type="checkbox" className="mt-1 rounded border-gray-300 dark:bg-gray-900 dark:border-gray-600 text-emerald-500 focus:ring-emerald-500" checked={!!favSelected[p.id]} onChange={(e) => setFavSelected((s) => ({ ...s, [p.id]: e.target.checked }))}/>
                                    <div>
                                        <div className="font-medium dark:text-white">{p.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{p.address}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div className="px-4 py-3 border-t dark:border-gray-700 flex items-center justify-end gap-2">
                    <button className={btn} onClick={() => setShowFavModal(false)}>取消</button>
                    <button className={`${btn} bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-600`} onClick={addSelectedFavoritesToItinerary}>
                        加入行程
                    </button>
                </div>
            </div>
        </div>
      )}
      
      {showSuggestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 w-[92vw] max-w-lg rounded-2xl shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b dark:border-gray-700">
              <h3 className="font-semibold dark:text-white">🤖 AI 行程建議</h3>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                AI 根據您的需求推薦了以下景點，您可以選擇將它們全部加入行程。
              </p>
              <ul className="space-y-3">
                {suggestedPlaces.map((p, i) => (
                  <li key={i} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="font-semibold text-emerald-700 dark:text-emerald-300">{p.name}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="font-medium">推薦理由：</span>{p.reason}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium">建議停留：</span>{p.stayMinutes} 分鐘
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-4 py-3 border-t dark:border-gray-700 flex items-center justify-end gap-2">
              <button className={btn} onClick={() => setShowSuggestionModal(false)}>
                取消
              </button>
              <button
                className={`${btn} bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-600`}
                onClick={handleApplySuggestions}
              >
                全部加入行程
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}