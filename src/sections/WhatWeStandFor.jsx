import { values } from '../data/values'
import ValueCard from '../components/ValueCard'

export default function WhatWeStandFor() {
  return (
    <section className="relative z-10 bg-white px-[20px] pt-[55px] pb-[60px]" dir="rtl">
      <h2 className="text-[16px] font-normal uppercase text-black mb-[28px] text-end">WHAT WE STAND FOR</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[10px] flex-row-reverse">
        {values.map((value) => (
          <ValueCard key={value.id} value={value} index={value.id} />
        ))}
      </div>
    </section>
  )
}