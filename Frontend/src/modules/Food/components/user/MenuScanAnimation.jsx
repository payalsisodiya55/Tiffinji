import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import tiffinIcon from "@/assets/tiffin_icon.png"

export default function MenuScanAnimation({ onComplete, duration = 3000 }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const hideTimer = setTimeout(() => {
      setVisible(false)
    }, duration - 400) // start fade out

    const doneTimer = setTimeout(() => {
      onComplete?.()
    }, duration)

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(doneTimer)
    }
  }, [duration, onComplete])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white"
        >
          {/* Main Card Container with Rotation */}
          <div className="relative rotate-[-8deg] mb-8">
            {/* Animated Border Wrapper */}
            <div className="relative p-[3px] rounded-[24px] overflow-hidden shadow-2xl">
              {/* Spinning gradient for border */}
              <div 
                className="absolute inset-[-100%] z-0"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 70%, #f39c12 100%)',
                  animation: 'spin-border 0.8s linear infinite'
                }}
              />
              
              {/* Inner Card (White background to mask the center, displaying tiffin_icon) */}
              <div className="relative z-10 w-[140px] h-[140px] bg-white rounded-[18px] flex items-center justify-center p-3">
                <img src={tiffinIcon} alt="Tiffinji Logo" className="w-[85%] h-[85%] object-contain" />
              </div>
            </div>
          </div>

          {/* Text Below */}
          <div className="text-center mt-6">
            <h1 className="text-2xl font-black text-[#f39c12] uppercase tracking-wide leading-tight">
              Tiffinji Menu<br />
              Price Matched
            </h1>
          </div>

          <style>{`
            @keyframes spin-border {
              100% {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
