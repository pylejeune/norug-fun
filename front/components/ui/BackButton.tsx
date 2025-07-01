'use client'

import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { Button } from './button'

export default function BackButton() {
  const t = useTranslations()
  const router = useRouter()

  return (
    <Button
      variant="ghost"
      onClick={() => router.back()}
      className="text-gray-400 hover:text-white transition-colors p-0 h-auto"
    >
      <ArrowLeft className="w-5 h-5 mr-2" />
      {t('backButton')}
    </Button>
  )
}
