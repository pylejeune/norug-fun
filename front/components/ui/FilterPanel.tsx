'use client'

import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect } from 'react'

export type SortBy = 'sol' | 'date' | 'name'
export type SortOrder = 'asc' | 'desc'

type FilterPanelProps = {
  isOpen: boolean
  onClose: () => void
  sortBy: SortBy
  sortOrder: SortOrder
  pendingSortBy: SortBy
  pendingSortOrder: SortOrder
  onPendingSortByChange: (value: SortBy) => void
  onPendingSortOrderChange: (value: SortOrder) => void
  onApply: () => void
  onReset: () => void
}

export function FilterPanel({
  isOpen,
  onClose,
  sortBy,
  sortOrder,
  pendingSortBy,
  pendingSortOrder,
  onPendingSortByChange,
  onPendingSortOrderChange,
  onApply,
  onReset,
}: FilterPanelProps) {
  const t = useTranslations('Home')

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60" onClick={onClose} tabIndex={-1} aria-label="Close filters" />

      {/* Filters Panel */}
      <div className="ml-auto w-full max-w-xs sm:max-w-sm h-full bg-[#181c23] shadow-xl p-6 flex flex-col z-10">
        {/* Panel Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-bold text-[#e6d3ba]">{t('filters') || 'Filters'}</span>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Filter Options */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Sort By */}
          <div>
            <label className="block text-sm font-semibold text-[#e6d3ba] mb-2">{t('sortBy') || 'Sort by'}</label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-gray-800/50 text-gray-200 border border-gray-700"
              value={pendingSortBy}
              onChange={(e) => onPendingSortByChange(e.target.value as SortBy)}
            >
              <option value="sol">{t('sortBySolana') || 'Sol Raised'}</option>
              <option value="date">{t('sortByDate') || 'Date'}</option>
              <option value="name">{t('sortByName') || 'Name'}</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-semibold text-[#e6d3ba] mb-2">{t('sortOrder') || 'Order'}</label>
            <select
              className="w-full px-3 py-2 rounded-lg bg-gray-800/50 text-gray-200 border border-gray-700"
              value={pendingSortOrder}
              onChange={(e) => onPendingSortOrderChange(e.target.value as SortOrder)}
            >
              <option value="desc">{t('sortByDesc') || 'Descending'}</option>
              <option value="asc">{t('sortByAsc') || 'Ascending'}</option>
            </select>
          </div>
        </div>

        {/* Panel Actions */}
        <div className="mt-8 flex gap-2">
          <button className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600" onClick={onReset}>
            Reset
          </button>
          <button
            className="flex-1 py-2 rounded-lg bg-[#e6d3ba] text-[#1e293b] font-bold hover:bg-[#d6c3a0]"
            onClick={onApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
