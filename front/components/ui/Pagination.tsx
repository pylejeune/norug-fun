'use client'

import { useTranslations } from 'next-intl'

type PaginationProps = {
  currentPage: number
  totalPages: number
  itemsPerPage: number
  totalItems: number
  onPageChange: (page: number) => void
  onItemsPerPageChange: (itemsPerPage: number) => void
}

export function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  onPageChange,
  onItemsPerPageChange,
}: PaginationProps) {
  const t = useTranslations('Home')

  if (totalItems <= itemsPerPage) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-700">
      {/* Items Per Page Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">{t('itemsPerPage') || 'Items per page'}:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => {
            onItemsPerPageChange(Number(e.target.value))
          }}
          className="px-3 py-1 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 text-sm"
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>

      {/* Page Navigation */}
      <div className="flex items-center gap-4">
        {/* Page Info */}
        <span className="text-sm text-gray-400">
          {t('pageInfo', {
            start: (currentPage - 1) * itemsPerPage + 1,
            end: Math.min(currentPage * itemsPerPage, totalItems),
            total: totalItems,
          }) ||
            `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(
              currentPage * itemsPerPage,
              totalItems
            )} of ${totalItems}`}
        </span>

        {/* Navigation Buttons */}
        <div className="flex gap-2">
          {/* Previous Button */}
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {t('previous') || 'Previous'}
          </button>

          {/* Page Indicator */}
          <span className="px-3 py-1 bg-[#e6d3ba] text-[#1e293b] rounded-lg font-medium text-sm">
            {currentPage} / {totalPages}
          </span>

          {/* Next Button */}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {t('next') || 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
