export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafbfc]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-violet-600"></div>
        </div>
        <p className="text-sm text-slate-500 font-medium animate-pulse">Loading...</p>
      </div>
    </div>
  );
}
