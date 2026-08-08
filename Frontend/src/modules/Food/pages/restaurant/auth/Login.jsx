import { useEffect, useRef, useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, Utensils, Star, Heart, ArrowRight, Loader2, Store, ShieldQuestion } from "lucide-react"
import { Button } from "@food/components/ui/button"
import { toast } from "sonner"
import { restaurantAPI } from "@food/api"
import logoNew from "@/assets/logo.png"

const DEFAULT_COUNTRY_CODE = "+91"

export default function RestaurantLogin() {
  const navigate = useNavigate()
  const phoneInputRef = useRef(null)
  const [phone, setPhone] = useState(() => sessionStorage.getItem("restaurantLoginPhone") || "")
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)

  const validatePhone = (num) => {
    const digits = num.replace(/\D/g, "")
    if (digits.length !== 10) return false
    return ["6", "7", "8", "9"].includes(digits[0])
  }

  const handleSendOTP = async (e) => {
    if (e) e.preventDefault()
    if (!validatePhone(phone)) {
      toast.error("Please enter a valid 10-digit mobile number")
      return
    }
    if (submitting.current) return
    submitting.current = true
    setLoading(true)

    const fullPhone = `${DEFAULT_COUNTRY_CODE} ${phone}`.trim()

    try {
      await restaurantAPI.sendOTP(fullPhone, "login")
      const authData = {
        method: "phone",
        phone: fullPhone,
        isSignUp: false,
        module: "restaurant",
      }
      sessionStorage.setItem("restaurantAuthData", JSON.stringify(authData))
      sessionStorage.setItem("restaurantLoginPhone", phone)
      toast.success("Verification code sent!")
      navigate("/food/restaurant/otp")
    } catch (apiErr) {
      const msg = apiErr?.response?.data?.message || apiErr?.message || "Failed to send OTP."
      toast.error(msg)
    } finally {
      setLoading(false)
      submitting.current = false
    }
  }

  const primaryColor = "#f59e0b"

  return (
    <div className="min-h-screen bg-[#FFFBF5] dark:bg-[#0a0a0a] flex flex-col relative overflow-hidden font-['Outfit']">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Content */}
      <div className="absolute top-6 right-6 z-20">
        <Link to="/restaurant/auth/support">
          <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:text-amber-500 font-semibold flex items-center gap-2 font-['Outfit']">
            <ShieldQuestion className="w-5 h-5 text-amber-500" />
            Support
          </Button>
        </Link>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-[440px]"
        >
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative w-64 h-24 mx-auto mb-4 flex items-center justify-center"
            >
              <img
                src={logoNew}
                alt="Tiffinji Logo"
                className="w-full h-full object-contain"
              />
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-amber-600 dark:text-amber-400 font-bold text-[13px] uppercase tracking-[0.25em] font-['Outfit']"
            >
              RESTAURANT PARTNER
            </motion.p>
          </div>

          {/* Login Card */}
          <div className="bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-2xl rounded-[3rem] p-8 sm:p-10 shadow-[0_40px_80px_-20px_rgba(245,158,11,0.2)] dark:shadow-none border border-white/40 dark:border-gray-800 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500" />

            <div className="mb-8 text-center sm:text-left">
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2 font-['Outfit'] tracking-tight">
                Partner Login
              </h2>
              <div className="h-1.5 w-12 bg-amber-500 rounded-full mb-3 hidden sm:block" />
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                Enter your registered mobile number to manage your restaurant
              </p>
            </div>

            <form onSubmit={handleSendOTP} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] ml-1">Mobile Number</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <span className="text-sm font-bold text-amber-500 border-r border-gray-200 dark:border-gray-800 pr-3">+91</span>
                  </div>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    required
                    autoFocus
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    maxLength={10}
                    className="block w-full pl-16 pr-6 py-4 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white border-2 border-transparent focus:border-amber-500/50 rounded-2xl outline-none transition-all placeholder:text-gray-300 font-bold text-lg shadow-sm"
                    placeholder="00000 00000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full py-4 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white rounded-2xl font-bold text-lg shadow-xl shadow-amber-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group overflow-hidden relative"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>Get Started</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
                <motion.div
                  className="absolute inset-0 bg-white/20 translate-x-[-100%]"
                  whileHover={{ translateX: "100%" }}
                  transition={{ duration: 0.6 }}
                />
              </button>
            </form>

            {/* Registration CTA Section */}
            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-3">
                Don't have a restaurant partner account yet?
              </p>
              <Link to="/food/restaurant/signup">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-3.5 border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-sm rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <Store className="w-4.5 h-4.5 text-amber-500" />
                  <span>Register as Restaurant Partner</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[11px] text-gray-400 font-medium leading-relaxed max-w-[320px] mx-auto">
              By continuing, you agree to Tiffinji's <br />
              <Link to="/food/restaurant/profile/terms" className="text-gray-900 dark:text-white font-bold hover:text-amber-500 transition-colors">Terms of Service</Link> & <Link to="/food/restaurant/profile/privacy" className="text-gray-900 dark:text-white font-bold hover:text-amber-500 transition-colors">Privacy Policy</Link>
            </p>
          </div>

          <div className="mt-10 flex justify-center items-center gap-6 opacity-40 grayscale hover:opacity-70 transition-opacity">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Business Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">Partner Success</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
