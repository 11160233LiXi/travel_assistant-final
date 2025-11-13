import { Link } from "react-router-dom";

function HomeButton() {
  return (
    <Link
      to="/"
      aria-label="返回首頁"
      className="absolute top-4 left-4 z-50 inline-flex items-center gap-2 rounded-2xl border 
                 border-gray-600 bg-gray-800/95 px-3 py-2 text-sm font-medium text-gray-200 
                 hover:bg-gray-700 hover:border-emerald-500 hover:text-emerald-300 
                 shadow-md backdrop-blur transition active:scale-[0.97] dark:bg-gray-800 
                 dark:text-gray-200"
    >
      ← 返回首頁
    </Link>
  );
}

export default HomeButton;
