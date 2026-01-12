// app/page.tsx
import { HeroSection } from '@/components/sections/HeroSection'
import { USP } from '@/components/sections/USP'
import { SocialProof } from '@/components/sections/SocialProof'
import { Features } from '@/components/sections/Features'
import { CTA } from '@/components/sections/CTA'
import { FormSection } from '@/components/sections/FormSection'
import { Pricing } from '@/components/sections/Pricing'
import { FAQ } from '@/components/sections/FAQ'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <HeroSection />
      <USP />
      <SocialProof />
      <Features />
      <CTA />
      <FormSection />
      <Pricing />
      <FAQ />
    </main>
  )
}