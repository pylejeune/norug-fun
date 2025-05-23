// Basic loading skeleton for the How It Works page

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col items-center mb-12 md:mb-16">
        <div className="w-24 h-24 bg-gray-700 rounded-full mb-4"></div>
        <div className="h-8 bg-gray-700 rounded w-3/4 md:w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2 md:w-1/3"></div>
      </div>

      {/* Phase 1 Skeleton */}
      <div className="mb-12 md:mb-16">
        <div className="h-8 bg-gray-700 rounded w-1/2 mx-auto mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column Skeleton */}
          <div className="border border-gray-700 p-6 rounded-lg space-y-4">
            <div className="h-6 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-10 bg-gray-700 rounded w-1/3 mt-6"></div>
          </div>
          {/* Right Column Skeleton */}
          <div className="border border-gray-700 p-6 rounded-lg space-y-4">
            <div className="h-6 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6"></div>
            <div className="h-10 bg-gray-700 rounded w-1/3 mt-6"></div>
          </div>
        </div>
      </div>

      {/* Phase 2 Skeleton */}
      <div className="text-center">
        <div className="h-8 bg-gray-700 rounded w-1/3 mx-auto mb-6"></div>
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="h-5 bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-700 rounded w-4/5 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
