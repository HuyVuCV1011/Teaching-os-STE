'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion' // Dùng motion để tạo hiệu ứng
import { ArrowUp } from 'lucide-react'

const ScrollToTopButton = () => {
  const [isVisible, setIsVisible] = useState(false)

  // Hiển thị nút khi cuộn xuống quá 300px
  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true)
    } else {
      setIsVisible(false)
    }
  }

  // Cuộn mượt về đầu trang
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  return (
    <motion.button
      onClick={scrollToTop}
      className="fixed bottom-10 right-10 z-50 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-gray-950 transition duration-300"
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.3 }}
      style={{ display: isVisible ? 'block' : 'none' }}
    >
      <ArrowUp />
    </motion.button>
  )
}

export default ScrollToTopButton
