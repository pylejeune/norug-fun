'use client'

import { useTranslations } from 'next-intl'
import { Button } from './button'

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

  // Don't render pagination if there's only one page or no items
  if (totalPages <= 1 || totalItems === 0) {
    return null
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-800">
      {/* Items per page selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">{t('itemsPerPage') || 'Items per page'}:</span>
        <select
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="px-3 py-1 rounded-lg bg-gray-800 border border-gray-700 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#e6d3ba]"
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700 disabled:opacity-50"
          >
            {t('previous') || 'Previous'}
          </Button>

          {/* Page Indicator */}
          <span className="px-3 py-1 bg-[#e6d3ba] text-[#1e293b] rounded-lg font-medium text-sm flex items-center">
            {currentPage} / {totalPages}
          </span>

          {/* Next Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700 disabled:opacity-50"
          >
            {t('next') || 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
