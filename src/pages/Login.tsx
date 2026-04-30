import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, LogIn, User, Lock, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) return;

    try {
      await login(username.trim(), usePassword ? password : undefined);
      navigate("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "登录失败";
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-pink-200">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">甲油胶仓库</h1>
          <p className="text-sm text-gray-500">你的色彩收藏夹</p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="text-center mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">欢迎</h2>
            <p className="text-sm text-gray-500">输入昵称即可开始使用</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                昵称
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="你的昵称"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            {/* 密码（可选） */}
            {usePassword && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="可选"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-transparent transition-all"
                    autoComplete="current-password"
                  />
                </div>
              </div>
            )}

            {/* 使用密码切换 */}
            <button
              type="button"
              onClick={() => {
                setUsePassword(!usePassword);
                setError("");
              }}
              className="text-xs text-pink-500 hover:text-pink-600 transition-colors"
            >
              {usePassword ? "不用密码，简单使用" : "加个密码保护数据"}
            </button>

            {/* 错误提示 */}
            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pink-500 text-white rounded-xl text-sm font-medium hover:bg-pink-600 active:bg-pink-700 disabled:opacity-50 transition-colors shadow-sm shadow-pink-200"
            >
              <LogIn className="w-4 h-4" />
              {isLoading ? "登录中..." : "开始使用"}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            {usePassword
              ? "密码可选，用于保护你的数据"
              : "不设置密码的话任何人用这个昵称都能访问你的数据"}
          </p>
        </div>

        {/* 功能介绍 */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: "订单识别", desc: "截图自动提取" },
            { label: "色系统计", desc: "一目了然" },
            { label: "试色生成", desc: "统一甲片样式" },
          ].map((item) => (
            <div
              key={item.label}
              className="text-center p-3 bg-white rounded-xl border border-gray-100"
            >
              <p className="text-xs font-semibold text-gray-700">
                {item.label}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* 返回首页 */}
        <button
          onClick={() => navigate("/")}
          className="w-full mt-4 flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          先逛逛
        </button>
      </div>
    </div>
  );
}
