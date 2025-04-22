type ViewMode = "active" | "previous";

type ViewModeToggleProps = {
  viewMode: ViewMode;
  onChangeMode: (mode: ViewMode) => void;
};

export function ViewModeToggle({
  viewMode,
  onChangeMode,
}: ViewModeToggleProps) {
  return (
    <div className="bg-gray-800/50 p-1 rounded-full">
      <div className="relative flex">
        <button
          onClick={() => onChangeMode("active")}
          className={`relative z-10 px-6 py-2 rounded-full transition-all duration-200 ${
            viewMode === "active"
              ? "text-white font-medium"
              : "text-gray-300 hover:text-white"
          }`}
        >
          Active Proposals
        </button>
        <button
          onClick={() => onChangeMode("previous")}
          className={`relative z-10 px-6 py-2 rounded-full transition-all duration-200 ${
            viewMode === "previous"
              ? "text-white font-medium"
              : "text-gray-300 hover:text-white"
          }`}
        >
          Previous Epochs
        </button>
        <div
          className="absolute inset-y-0 w-1/2 bg-green-600/90 rounded-full transition-transform duration-200 shadow-lg"
          style={{
            transform: `translateX(${viewMode === "previous" ? "100%" : "0"})`,
          }}
        />
      </div>
    </div>
  );
}
