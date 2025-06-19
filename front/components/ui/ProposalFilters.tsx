import { useIsMobile } from '@/hooks/use-mobile'
import { Filter, Grid, List, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'

type ProposalFiltersProps = {
  search: string
  onSearchChange: (search: string) => void
  viewMode: 'list' | 'grid'
  onViewModeChange: (viewMode: 'list' | 'grid') => void
  onOpenFilters: () => void
  showViewModeToggle?: boolean
}

export function ProposalFilters({
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onOpenFilters,
  showViewModeToggle = true,
}: ProposalFiltersProps) {
  const t = useTranslations('Home')
  const isMobile = useIsMobile()

  return (
    <div className="flex items-center gap-2 w-full sm:w-auto">
      {/* View Mode Toggle (Hidden on mobile or when disabled) */}
      {showViewModeToggle && (
        <div className={`flex gap-1 ${isMobile ? 'hidden' : ''}`}>
          <button
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' ? 'bg-[#e6d3ba] text-[#1e293b]' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => onViewModeChange('grid')}
            aria-label="Grid View"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-[#e6d3ba] text-[#1e293b]' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => onViewModeChange('list')}
            aria-label="List View"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="relative w-full max-w-xs mx-2">
        <input
          type="text"
          placeholder={t('searchPlaceholder') || 'Search...'}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e6d3ba]"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
      </div>

      {/* Filters Button */}
      <button
        className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 flex-shrink-0"
        onClick={onOpenFilters}
        aria-label="Open Filters"
      >
        <Filter className="w-5 h-5" />
      </button>
    </div>
  )
}
