'use client'

import { ChevronDown, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { Button } from './button'

export type SortBy = 'sol' | 'date' | 'name' | 'marketcap' | 'volume' | 'holders' | 'lasttrade'
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
  phase?: 'phase1' | 'phase2'
}

type CustomSelectProps = {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}

function CustomSelect({ label, value, options, onChange }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-[#e6d3ba] mb-3">{label}</label>

      {/* Custom Select Button */}
      <button
        className="w-full bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-lg p-3 text-left text-gray-200 hover:border-[#e6d3ba]/50 transition-all duration-300 focus:ring-2 focus:ring-[#e6d3ba]/30 focus:border-[#e6d3ba] flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <>
          {/* Backdrop to close dropdown */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Options Container */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700/50 rounded-lg shadow-xl z-20 overflow-hidden">
            {options.map((option) => (
              <button
                key={option.value}
                className={`w-full px-3 py-3 text-left transition-all duration-200 hover:bg-[#e6d3ba]/10 hover:text-[#e6d3ba] cursor-pointer ${
                  value === option.value
                    ? 'bg-[#e6d3ba]/20 text-[#e6d3ba] border-l-2 border-[#e6d3ba]'
                    : 'text-gray-200'
                }`}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
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
  phase = 'phase1',
}: FilterPanelProps) {
  const t = useTranslations('Home')
  const [isAnimating, setIsAnimating] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)

  // Handle opening animation
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      // Small delay to ensure DOM is ready before starting animation
      setTimeout(() => setIsAnimating(true), 10)
    } else {
      setIsAnimating(false)
      // Wait for animation to complete before unmounting
      setTimeout(() => setShouldRender(false), 300)
    }
  }, [isOpen])

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

  // Handle close with animation
  const handleClose = () => {
    setIsAnimating(false)
    setTimeout(() => onClose(), 300)
  }

  if (!shouldRender) return null

  // Conditional sorting options based on phase
  const sortByOptions =
    phase === 'phase1'
      ? [
          { value: 'sol', label: t('sortBySolana') || 'Trier par SOL levés' },
          { value: 'date', label: t('sortByDate') || 'Trier par date' },
          { value: 'name', label: t('sortByName') || 'Trier par nom' },
        ]
      : [
          { value: 'sol', label: t('sortBySolana') || 'Trier par SOL levés' },
          { value: 'date', label: t('sortByDate') || 'Trier par date' },
          { value: 'name', label: t('sortByName') || 'Trier par nom' },
          { value: 'marketcap', label: t('sortByMarketCap') || 'Trier par Market Cap' },
          { value: 'volume', label: t('sortByVolume') || 'Trier par Volume' },
          { value: 'holders', label: t('sortByHolders') || 'Trier par Holders' },
          { value: 'lasttrade', label: t('sortByLastTrade') || 'Trier par Last Trade' },
        ]

  const sortOrderOptions = [
    { value: 'desc', label: t('sortByDesc') || 'Plus élevé' },
    { value: 'asc', label: t('sortByAsc') || 'Plus bas' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay with fade animation */}
      <div
        className={`fixed inset-0 bg-black/60 transition-opacity duration-300 ease-out ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
        tabIndex={-1}
        aria-label="Close filters"
      />

      {/* Filters Panel with slide animation */}
      <div
        className={`ml-auto w-full max-w-xs sm:max-w-sm h-full bg-[#181c23] shadow-xl p-6 flex flex-col z-10 transition-transform duration-300 ease-out ${
          isAnimating ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-lg font-bold text-[#e6d3ba]">{t('filters') || 'Filtres'}</span>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-700/50 transition-all duration-200 hover:scale-110 cursor-pointer"
          >
            <X className="w-6 h-6 text-gray-400 hover:text-[#e6d3ba] transition-colors" />
          </button>
        </div>

        {/* Filter Options */}
        <div className="flex-1 flex flex-col gap-8">
          {/* Sort By */}
          <CustomSelect
            label={t('sortBy') || 'Trier par'}
            value={pendingSortBy}
            options={sortByOptions}
            onChange={(value) => onPendingSortByChange(value as SortBy)}
          />

          {/* Sort Order */}
          <CustomSelect
            label={t('sortOrder') || 'Ordre'}
            value={pendingSortOrder}
            options={sortOrderOptions}
            onChange={(value) => onPendingSortOrderChange(value as SortOrder)}
          />
        </div>

        {/* Panel Actions */}
        <div className="mt-8 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 py-3 bg-gray-800/50 backdrop-blur-sm border-gray-700/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600/50 hover:text-gray-200"
            onClick={onReset}
          >
            Reset
          </Button>
          <Button
            className="flex-1 py-3 bg-gradient-to-r from-[#e6d3ba] to-[#d6c3a0] text-[#1e293b] font-bold hover:from-[#d6c3a0] hover:to-[#c6b390] shadow-lg hover:shadow-xl"
            onClick={onApply}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
