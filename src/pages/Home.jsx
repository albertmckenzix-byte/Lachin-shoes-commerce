import Hero from '../sections/Hero'
import BestSellers from '../sections/BestSellers'
import PromoBanner from '../sections/PromoBanner'
import ShopByCollection from '../sections/ShopByCollection'
import SustainabilityBanner from '../sections/SustainabilityBanner'

export default function Home() {
  return (
    <>
      <Hero />
      <BestSellers />
      <PromoBanner />
      <ShopByCollection />
      <SustainabilityBanner />
    </>
  )
}