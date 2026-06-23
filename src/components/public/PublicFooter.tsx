import { MapPin, Phone } from 'lucide-react'
import { publicFooterConfig } from '@/config/publicFooter'
import { useLocale } from '@/i18n/LocaleProvider'

export default function PublicFooter({ settings }: { settings?: { whatsapp?: string | null } }) {
  const { t } = useLocale()
  const phone = publicFooterConfig.phone || settings?.whatsapp || ''
  
  return (
    <footer className="bg-[#fbf9f7] pt-10 pb-6 px-4 border-t border-brand-border/50 text-center flex flex-col items-center mt-auto">
      {/* Social Links */}
      <div className="flex gap-3 justify-center items-center mb-6">
        {publicFooterConfig.instagramUrl && (
          <a href={publicFooterConfig.instagramUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-brand-cream border border-brand-border rounded-full flex items-center justify-center text-brand-burgundy hover:bg-brand-beige transition-colors shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
          </a>
        )}
        {publicFooterConfig.facebookUrl && (
          <a href={publicFooterConfig.facebookUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-brand-cream border border-brand-border rounded-full flex items-center justify-center text-brand-burgundy hover:bg-brand-beige transition-colors shadow-sm">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
            </svg>
          </a>
        )}
        {publicFooterConfig.snapchatUrl && (
          <a href={publicFooterConfig.snapchatUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-brand-cream border border-brand-border rounded-full flex items-center justify-center text-brand-burgundy hover:bg-brand-beige transition-colors shadow-sm">
            <span className="font-bold text-[10px] uppercase">Snap</span>
          </a>
        )}
        {publicFooterConfig.tiktokUrl && (
          <a href={publicFooterConfig.tiktokUrl} target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-brand-cream border border-brand-border rounded-full flex items-center justify-center text-brand-burgundy hover:bg-brand-beige transition-colors shadow-sm">
            <span className="font-bold text-[10px] uppercase">TikTok</span>
          </a>
        )}
      </div>

      {/* Info Lines */}
      {publicFooterConfig.address && (
        <div className="flex items-center gap-1.5 text-brand-brown mb-3 text-[14px] font-medium justify-center">
          <MapPin className="w-4 h-4 shrink-0 text-brand-gold" />
          <span>{publicFooterConfig.address}</span>
        </div>
      )}
      
      {phone && (
        <div className="flex items-center gap-1.5 text-brand-brown mb-5 text-[14px] font-medium justify-center">
          <Phone className="w-4 h-4 shrink-0 text-brand-gold" />
          <span dir="ltr">{phone}</span>
        </div>
      )}

      {/* Slogan */}
      <p className="text-brand-burgundy font-bold text-[15px] mb-6">
        {t('restaurantSlogan')}
      </p>

      {/* Copyright */}
      <div className="text-[12px] text-brand-brown/70 space-y-1.5">
        <p>{t('copyright')}</p>
        <p>{t('madeByPower')}</p>
      </div>
    </footer>
  )
}
