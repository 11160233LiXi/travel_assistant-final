import React, { useEffect, useState, useCallback } from "react";
import HomeButton from "./components/HomeButton";

interface PlaceItem { id: string; name: string; address?: string; lat: number; lng: number; }
interface Folder { id: string; name: string; category: "親子" | "約會" | "拍照" | "運動" | "體驗"; places: PlaceItem[]; }
const STORAGE_KEY = "favorites-v1";

export default function Favorites() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderCategory, setNewFolderCategory] = useState<Folder["category"]>("親子");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const makeInit = () => {
      const init: Folder[] = [ { id: Date.now().toString(), name: "我的收藏", category: "親子", places: [] } ];
      setFolders(init);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ folders: init }));
      setExpanded(Object.fromEntries(init.map((f) => [f.id, true])));
    };

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.folders) && parsed.folders.length > 0) {
          setFolders(parsed.folders);
          setExpanded(Object.fromEntries(parsed.folders.map((f: Folder) => [f.id, false])));
        } else { makeInit(); }
      } catch { makeInit(); }
    } else { makeInit(); }
  }, []);

  const persist = (next: Folder[]) => {
    setFolders(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ folders: next }));
  };

  const addFolder = () => {
    const name = newFolderName.trim();
    if (!name) return;
    if (folders.some((f) => f.name === name)) { alert("已存在相同名稱的資料夾"); return; }
    const next: Folder = { id: Date.now().toString(), name, category: newFolderCategory, places: [] };
    persist([...folders, next]);
    setNewFolderName("");
    setNewFolderCategory("親子");
    setShowModal(false);
  };

  const deleteFolder = (id: string) => {
    if (!confirm("確定要刪除此資料夾？")) return;
    persist(folders.filter((f) => f.id !== id));
  };

  const removePlace = (folderId: string, placeId: string) => {
    persist(folders.map((f) => f.id === folderId ? { ...f, places: f.places.filter((p) => p.id !== placeId) } : f ));
  };

  const clearAll = () => {
    if (!confirm("確定要清空所有收藏與資料夾？此操作無法復原！")) return;
    persist([]);
  };

  const toggleFolder = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }));

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen">
      <HomeButton />

      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">我的收藏</h2>

      <div className="mb-4 flex flex-wrap gap-2">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜尋資料夾名稱"
          className="border p-2 rounded flex-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-gray-900 dark:text-gray-100"
        />
        <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition">
          新增資料夾
        </button>
        <button onClick={clearAll} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">
          清空全部
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="font-bold mb-4 text-lg dark:text-white">新增資料夾</h3>
            <input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="輸入資料夾名稱"
              className="border p-2 rounded w-full mb-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            />
            <select
              value={newFolderCategory}
              onChange={(e) => setNewFolderCategory(e.target.value as Folder["category"])}
              className="border p-2 rounded w-full mb-4 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100"
            >
              <option value="親子">親子</option>
              <option value="約會">約會</option>
              <option value="拍照">拍照</option>
              <option value="運動">運動</option>
              <option value="體驗">體驗</option>
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded">
                取消
              </button>
              <button onClick={addFolder} className="px-3 py-1 bg-emerald-500 text-white rounded">
                確認
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {folders.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase())).map((folder) => (
            <div key={folder.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleFolder(folder.id)}>
                <div className="flex items-center gap-3">
                  <div className="p-1 text-gray-500 dark:text-gray-400">
                    <svg className={`w-4 h-4 transform transition-transform ${ expanded[folder.id] ? "rotate-90" : "" }`} viewBox="0 0 20 20" fill="currentColor"><path d="M6 4L14 10L6 16V4Z" /></svg>
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2 text-gray-900 dark:text-white">
                      <span>{folder.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">{folder.category}</span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {folder.places.length} 筆收藏
                    </div>
                  </div>
                </div>
                <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { const name = prompt("請輸入新的資料夾名稱", folder.name)?.trim(); if (name) persist(folders.map((f) => f.id === folder.id ? { ...f, name } : f)); }} className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded">
                    命名
                  </button>
                  <button onClick={() => deleteFolder(folder.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded">
                    刪除
                  </button>
                </div>
              </div>

              {expanded[folder.id] && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  {folder.places.length === 0 ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">此資料夾尚無收藏</div>
                  ) : (
                    folder.places.map((p) => (
                      <div key={p.id} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md flex justify-between items-center">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                          {p.address && ( <div className="text-sm text-gray-500 dark:text-gray-400">{p.address}</div> )}
                        </div>
                        <button onClick={() => removePlace(folder.id, p.id)} className="px-3 py-1 text-sm bg-red-500 text-white rounded">
                          移除
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}