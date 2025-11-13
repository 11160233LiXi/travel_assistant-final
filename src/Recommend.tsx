// src/Recommend.tsx (最終修正版)

import React, { useCallback, useState, useRef, useEffect } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import HomeButton from "./components/HomeButton";
import { useTheme } from "./ThemeContext";

type Place = google.maps.places.PlaceResult;

// 修正 1：(來自 image_5c72f1.png) 新增 FavPlace 型別
type FavPlace = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  place_id?: string;
};
// 修正 1：(來自 image_5c72f1.png) 使用 FavPlace[] 而不是 any[]
interface Folder { id: string; name: string; places: FavPlace[]; }

const Recommend: React.FC = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 25.033964, lng: 121.564468 });
  const [places, setPlaces] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("tourist_attraction");
  const mapRef = useRef<google.maps.Map | null>(null);
  // 修正 2：(來自 image_5c72f1.png) 修正 (window as any)
  const [sdkReady, setSdkReady] = useState<boolean>(() => typeof (window as Window & { google?: unknown }).google !== "undefined");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [favoriteFolderId, setFavoriteFolderId] = useState<string>("");
  const { theme } = useTheme(); // 獲取當前主題

  useEffect(() => {
    if (sdkReady) return;
    // 修正 3：(來自 image_5c72f1.png) 修正 (window as any)
    const iv = setInterval(() => { if (typeof (window as Window & { google?: unknown }).google !== "undefined") { setSdkReady(true); clearInterval(iv); } }, 100);
    return () => clearInterval(iv);
  }, [sdkReady]);

  const onLoadMap = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    // 設定地圖樣式以適應深色模式
    if (theme === 'dark') {
      map.setOptions({ styles: [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
        { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
        { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
        { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
        { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
        { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
        { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
      ]});
    }
  }, [theme]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("favorites-v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.folders)) {
          setFolders(parsed.folders);
          if (parsed.folders.length > 0 && !favoriteFolderId) {
            setFavoriteFolderId(parsed.folders[0].id);
          }
        }
      }
    } catch (e) { console.error("Failed to load favorites:", e); }
  }, [favoriteFolderId]);
  
  useEffect(() => {
    if (mapRef.current && places.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      places.forEach(place => { if (place.geometry?.location) bounds.extend(place.geometry.location); });
      mapRef.current.fitBounds(bounds);
    }
  }, [places]);

  const fetchNearby = (location: google.maps.LatLng, type: string) => {
    if (!mapRef.current) return;
    const service = new google.maps.places.PlacesService(mapRef.current);
    const request = { location, radius: 2000, type };
    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPlaces(results as Place[]);
      } else {
        setPlaces([]);
      }
    });
  };

  const handleSearch = () => {
    if (!search || !mapRef.current) return;
    const service = new google.maps.places.PlacesService(mapRef.current);
    const request = { query: search, fields: ['name', 'geometry'] };
    service.findPlaceFromQuery(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0]?.geometry?.location) {
        const location = results[0].geometry.location;
        setCenter({ lat: location.lat(), lng: location.lng() });
        fetchNearby(location, category);
      } else {
        setMessage("⚠️ 找不到地點，請嘗試其他關鍵字");
        setTimeout(() => setMessage(null), 2500);
      }
    });
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const location = e.latLng;
      setCenter({ lat: location.lat(), lng: location.lng() });
      fetchNearby(location, category);
    }
  };

  const handleAddToFavorites = (place: Place) => {
    let currentFolders = [...folders];
    let currentFolderId = favoriteFolderId;
    
    if (currentFolders.length === 0) {
        const newFolderId = Date.now().toString();
        const newFolder = { id: newFolderId, name: "我的收藏", places: [] };
        currentFolders = [newFolder];
        currentFolderId = newFolderId;
        setFolders(currentFolders);
        setFavoriteFolderId(newFolderId);
    }
    
    if (!currentFolderId && currentFolders.length > 0) {
        currentFolderId = currentFolders[0].id;
        setFavoriteFolderId(currentFolderId);
    }
    
    const targetFolderIndex = currentFolders.findIndex(f => f.id === currentFolderId);
    if (targetFolderIndex === -1) {
        setMessage("⚠️ 請選擇要加入的資料夾");
        setTimeout(() => setMessage(null), 2000);
        return;
    }

    const newPlace: FavPlace = { id: uid(), name: place.name ?? "未知", address: place.vicinity, lat: place.geometry?.location?.lat(), lng: place.geometry?.location?.lng(), place_id: place.place_id };
    const targetFolder = currentFolders[targetFolderIndex];
    const isDuplicate = targetFolder.places.some(p => p.place_id === newPlace.place_id);

    if (!isDuplicate) {
      const updatedFolder = { ...targetFolder, places: [...targetFolder.places, newPlace] };
      const nextFolders = currentFolders.map((f, index) => index === targetFolderIndex ? updatedFolder : f);
      localStorage.setItem("favorites-v1", JSON.stringify({ folders: nextFolders }));
      setFolders(nextFolders);
      setMessage(`🌟 ${newPlace.name} 已加入 ${targetFolder.name}`);
    } else {
      setMessage(`⚠️ ${newPlace.name} 已在 ${targetFolder.name} 中`);
    }

    setTimeout(() => setMessage(null), 2000);
  };
  function uid() { return Math.random().toString(36).substring(2, 9); }

  const handlePlaceItemClick = (place: Place) => {
    setSelected(place);
    if (place.geometry?.location) mapRef.current?.panTo(place.geometry.location);
  };

  const triggerPlaceIntroduction = (placeName?: string) => {
    if (placeName) window.dispatchEvent(new CustomEvent("chatbox:place", { detail: { name: placeName } }));
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen transition-colors duration-300">
      <HomeButton />

      {message && ( <div className={`fixed top-20 right-4 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300 ${message.startsWith('⚠️') ? 'bg-red-500' : 'bg-green-600'}`}> {message} </div> )}

      <h2 className="text-3xl font-extrabold mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600 dark:from-teal-400 dark:to-blue-500">
        景點推薦
      </h2>

      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-4 flex flex-wrap gap-3 mb-6 max-w-4xl mx-auto border border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="輸入地點，例如：淡水老街"
          className="border p-3 flex-1 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none min-w-[200px] bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border p-3 rounded-lg focus:ring-2 focus:ring-teal-400 focus:outline-none bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
        >
          <option value="tourist_attraction">景點</option>
          <option value="restaurant">餐廳</option>
          <option value="parking">停車場</option>
          <option value="gas_station">加油站</option>
        </select>
        <button
          onClick={handleSearch}
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white px-6 py-3 rounded-lg shadow hover:opacity-90 transition"
        >
          搜尋
        </button>
      </div>
      
      {folders.length > 0 && (
        <div className="mb-6 max-w-4xl mx-auto bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <label className="mr-2 font-medium">加入收藏 → 選擇資料夾：</label>
          <select
            value={favoriteFolderId}
            onChange={(e) => setFavoriteFolderId(e.target.value)}
            className="border p-2 rounded bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
          >
            {folders.map((f) => ( <option key={f.id} value={f.id}>{f.name}</option> ))}
          </select>
        </div>
      )}

      <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="w-full h-[420px] bg-gray-100 dark:bg-gray-800">
          {sdkReady && (
            <GoogleMap
              onLoad={onLoadMap}
              center={center}
              zoom={14}
              mapContainerStyle={{ width: "100%", height: "100%" }}
              options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false, clickableIcons: true }}
              onClick={handleMapClick}
            >
              {places.map((p) => ( p.geometry?.location && <Marker key={p.place_id} position={p.geometry.location} onClick={() => setSelected(p)} /> ))}
              {selected && selected.geometry?.location && (
                <InfoWindow position={selected.geometry.location} onCloseClick={() => setSelected(null)}>
                  <div className="p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                    <h3 className="font-bold text-blue-600 dark:text-blue-400">{selected.name}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-2">{selected.vicinity}</p>
                    <div className="flex gap-2">
                        <button onClick={() => triggerPlaceIntroduction(selected.name)} className="flex-1 px-3 py-1 text-xs bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 transition"> 介紹 </button>
                        <button onClick={() => handleAddToFavorites(selected)} className="flex-1 px-3 py-1 text-xs bg-yellow-500 text-white rounded-lg shadow hover:bg-yellow-600 transition"> 收藏 </button>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>
      </div>

      <div className="mt-6 max-w-6xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-4 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700">
        {places.length > 0 ? (
          places.map((place) => (
            <div
              key={place.place_id}
              onClick={() => handlePlaceItemClick(place)}
              className="p-3 border-b dark:border-gray-700 hover:bg-teal-50 dark:hover:bg-gray-700/50 cursor-pointer transition flex justify-between items-center gap-2"
            >
              <div className="flex-1">
                <div className="font-semibold text-gray-800 dark:text-gray-100">{place.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{place.vicinity}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={(e) => { e.stopPropagation(); triggerPlaceIntroduction(place.name); }} className="px-3 py-1 text-sm bg-emerald-500 text-white rounded-lg shadow hover:bg-emerald-600 transition"> 介紹 </button>
                <button onClick={(e) => { e.stopPropagation(); handleAddToFavorites(place); }} className="px-3 py-1 text-sm bg-yellow-500 text-white rounded-lg shadow hover:bg-yellow-600 transition"> 收藏 </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-6">
            尚未有資料，請輸入地點並選擇分類搜尋
          </p>
        )}
      </div>
    </div>
  );
};

export default Recommend;