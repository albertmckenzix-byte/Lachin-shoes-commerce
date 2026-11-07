import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ChevronDown, ChevronUp, Link2 } from 'lucide-react'
import { faqs } from '../data/faqs'

const FacebookIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#333]">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
)

const TwitterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#333]">
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
  </svg>
)

const LinkedinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#333]">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
)

export default function FAQ() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('general')
  const [openIndex, setOpenIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // Get tab labels from translation
  const tabs = [
    { key: 'general', label: t('faq.tabs.general') },
    { key: 'setup', label: t('faq.tabs.setup') },
  ]

  // Transform faqs data to use translated strings
  const translatedFaqs = useMemo(() => {
    const result = {}
    Object.entries(faqs).forEach(([tab, queries]) => {
      result[tab] = queries.map((item) => ({
        question: t(item.questionKey),
        answer: t(item.answerKey),
      }))
    })
    return result
  }, [t])

  const filteredQuestions = useMemo(() => {
    const queries = translatedFaqs[activeTab] || []
    if (!searchQuery.trim()) return queries
    const q = searchQuery.toLowerCase()
    return queries.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
    )
  }, [activeTab, searchQuery, translatedFaqs])

  const allFilteredResults = useMemo(() => {
    const result = {}
    let firstTabWithResults = null
    Object.entries(translatedFaqs).forEach(([tab, queries]) => {
      if (!searchQuery.trim()) {
        result[tab] = queries
        if (!firstTabWithResults) firstTabWithResults = tab
        return
      }
      const q = searchQuery.toLowerCase()
      const filtered = queries.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q)
      )
      if (filtered.length > 0) {
        result[tab] = filtered
        if (!firstTabWithResults) firstTabWithResults = tab
      }
    })
    return { results: result, firstTabWithResults }
  }, [searchQuery, translatedFaqs])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    if (value.trim()) {
      const { firstTabWithResults } = allFilteredResults
      if (firstTabWithResults && firstTabWithResults !== activeTab) {
        setActiveTab(firstTabWithResults)
      }
      setOpenIndex(0)
    } else {
      setOpenIndex(0)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
  }

  const currentQuestions = filteredQuestions

  return (
    <section className="relative z-10 bg-white px-[27px] pt-[80px] pb-[90px]" dir="rtl">
      <div className="max-w-[763px] w-full ms-auto">
        {/* Header row - search on left, title on right */}
        <div className="flex items-end justify-between gap-4 flex-row-reverse">
          <div className="relative w-[233px] flex-shrink-0">
            <input
              type="text"
              placeholder={t('faq.searchPlaceholder')}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full h-[28px] bg-transparent border-none border-b border-black text-[13px] font-normal text-black placeholder:text-[13px] placeholder:text-black outline-none ps-6 text-start"
            />
            <Search size={16} strokeWidth={1.5} className="absolute start-0 bottom-0 text-black" />
          </div>
          <h2 className="text-[28px] font-normal text-black text-end">{t('faq.title')}</h2>
        </div>

        {/* Tabs - start from right */}
        <div className="mt-[30px]">
          <div className="flex gap-[4px] border-b border-[#E5E5E5] flex-row-reverse">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key)
                  setOpenIndex(0)
                }}
                className={`text-[13px] font-normal text-black py-[6px] ps-[23px] pe-[23px] border-b-2 transition-colors ${
                  activeTab === tab.key ? 'border-black' : 'border-transparent hover:text-[#666]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion */}
        <div className="mt-[28px]">
          {currentQuestions.length === 0 ? (
            <p className="text-[13px] text-gray-500 text-end">{t('faq.noResults')}</p>
          ) : (
            <div className="space-y-[10px]">
              {currentQuestions.map((item, index) => {
                const isOpen = openIndex === index
                return (
                  <div
                    key={index}
                    className="border border-[#B8B8B8] overflow-hidden"
                    style={{ borderRadius: 0 }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(isOpen ? -1 : index)}
                      className="w-full flex items-center justify-between h-[62px] ps-[21px] pe-[21px] bg-white transition-all duration-250"
                      style={{ borderRadius: 0 }}
                    >
                      {isOpen ? (
                        <ChevronUp size={16} strokeWidth={1.5} className="text-black flex-shrink-0 ps-4" />
                      ) : (
                        <ChevronDown size={16} strokeWidth={1.5} className="text-black flex-shrink-0 ps-4" />
                      )}
                      <span className="text-[13px] font-normal text-black text-start">{item.question}</span>
                    </button>
                    <div
                      className="overflow-hidden transition-all duration-250 ease-out"
                      style={{
                        maxHeight: isOpen ? '500px' : '0',
                        opacity: isOpen ? 1 : 0,
                      }}
                    >
                      <div className="ps-[21px] pe-[21px] pb-[24px]">
                        <p className="text-[11px] font-normal leading-[17px] text-[#3a4252] text-start">
                          {item.answer}
                        </p>
                        <div className="mt-[16px] flex items-center gap-[16px] justify-end">
                          <Link2 size={14} strokeWidth={1.5} className="text-[#333] cursor-pointer" onClick={copyLink} />
                          <LinkedinIcon />
                          <TwitterIcon />
                          <FacebookIcon />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}