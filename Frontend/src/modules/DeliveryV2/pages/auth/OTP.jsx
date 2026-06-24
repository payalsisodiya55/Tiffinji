import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Loader2, ShieldCheck, Timer, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import AnimatedPage from "@food/components/user/AnimatedPage"
import { Input } from "@food/components/ui/input"
import { Button } from "@food/components/ui/button"
import { deliveryAPI } from "@food/api"
import { setAuthData as storeAuthData } from "@food/utils/auth"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function DeliveryOTP() {
  const navigate = useNavigate()
  const [otp, setOtp] = useState(["", "", "", ""])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [authData, setAuthData] = useState(null)
  const [showNameInput, setShowNameInput] = useState(false)
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState("")
  const [verifiedOtp, setVerifiedOtp] = useState("")
  const [pendingMessage, setPendingMessage] = useState("")
  const [isRejected, setIsRejected] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const [deviceToken, setDeviceToken] = useState(null)
  const [activePlatform, setActivePlatform] = useState("web")
  const inputRefs = useRef([])
  const [focusedIndex, setFocusedIndex] = useState(null)
  const isOtpComplete = otp.every((digit) => digit !== "")

  useEffect(() => {
    // Get auth data from sessionStorage (delivery module key)
    const stored = sessionStorage.getItem("deliveryAuthData")
    if (stored) {
      const data = JSON.parse(stored)
      setAuthData(data)
    } else {
      // No active OTP flow: if already authenticated, go to delivery home
      const token = localStorage.getItem("delivery_accessToken")
      const authenticated = localStorage.getItem("delivery_authenticated") === "true"
      if (token && authenticated) {
        try {
          const parts = token.split('.')
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
            const now = Math.floor(Date.now() / 1000)
            if (payload.exp && payload.exp > now) {
              navigate("/food/delivery", { replace: true })
              return
            }
          }
        } catch (e) {
          // Ignore token parse errors and continue to sign-in redirect
        }
      }

      // No auth data, redirect to sign in
      navigate("/food/delivery/login", { replace: true })
      return
    }

    // OTP field should be empty - delivery boy needs to enter it manually
    // No auto-fill for delivery OTP

    // Start resend timer (60 seconds)
    setResendTimer(60)
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Don't auto-focus - let user manually enter OTP
    // Focus first input only if all fields are empty (small delay to ensure inputs are rendered)
    if (inputRefs.current[0] && otp.every(digit => digit === "")) {
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
    }
  }, [otp])

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return
    }

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)
    setError("")

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 4 digits are entered and we are in OTP step
    if (!showNameInput && newOtp.every((digit) => digit !== "") && newOtp.length === 4) {
      handleVerify(newOtp.join(""))
    }
  }

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === "Backspace") {
      if (otp[index]) {
        // If current input has value, clear it
        const newOtp = [...otp]
        newOtp[index] = ""
        setOtp(newOtp)
      } else if (index > 0) {
        // If current input is empty, move to previous and clear it
        inputRefs.current[index - 1]?.focus()
        const newOtp = [...otp]
        newOtp[index - 1] = ""
        setOtp(newOtp)
      }
    }
    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      navigator.clipboard.readText().then((text) => {
        const digits = text.replace(/\D/g, "").slice(0, 4).split("")
        const newOtp = [...otp]
        digits.forEach((digit, i) => {
          if (i < 4) {
            newOtp[i] = digit
          }
        })
        setOtp(newOtp)
        if (digits.length === 4) {
          handleVerify(newOtp.join(""))
        } else {
          inputRefs.current[digits.length]?.focus()
        }
      })
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text")
    const digits = pastedData.replace(/\D/g, "").slice(0, 4).split("")
    const newOtp = [...otp]
    digits.forEach((digit, i) => {
      if (i < 4) {
        newOtp[i] = digit
      }
    })
    setOtp(newOtp)
    if (!showNameInput && digits.length === 4) {
      handleVerify(newOtp.join(""))
      return
    }
    inputRefs.current[digits.length]?.focus()
  }

  const handleVerify = async (otpValue = null) => {
    if (showNameInput) {
      // In name collection step, ignore OTP auto-submit
      return
    }

    const code = otpValue || otp.join("")

    if (code.length !== 4) {
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const phone = authData?.phone
      const purpose = authData?.purpose || "login"
      const providedName = authData?.isSignUp ? authData?.name || null : null
      if (!phone) {
        setError("Phone number not found. Please try again.")
        setIsLoading(false)
        return
      }

      // Try to get FCM token before verifying OTP
      let fcmToken = null;
      let platform = "web";
      try {
        if (typeof window !== "undefined") {
          if (window.flutter_inappwebview) {
            platform = "mobile";
            const handlerNames = ["getFcmToken", "getFCMToken", "getPushToken", "getFirebaseToken"];
            for (const handlerName of handlerNames) {
              try {
                const t = await window.flutter_inappwebview.callHandler(handlerName, { module: "delivery" });
                if (t && typeof t === "string" && t.length > 20) {
                  fcmToken = t.trim();
                  break;
                }
              } catch (e) {}
            }
          } else {
            fcmToken = localStorage.getItem("fcm_web_registered_token_delivery") || null;
          }
        }
      } catch (e) {
        debugWarn("Failed to get FCM token during login", e);
      }

      setDeviceToken(fcmToken);
      setActivePlatform(platform);

      // Backend: POST /auth/delivery/verify-otp returns either:
      // - { needsRegistration: true } when no partner exists yet
      // - or { accessToken, refreshToken, user } for existing partners
      const response = await deliveryAPI.verifyOTP(phone, code, purpose, providedName, fcmToken, platform)
      debugLog("Delivery OTP Response:", response)
      const data = response?.data?.data || response?.data || {}
      debugLog("Parsed Delivery OTP Data:", data)

      if (data.pendingApproval === true) {
        sessionStorage.removeItem("deliveryAuthData")
        setIsLoading(false)
        setError("")
        setPendingMessage(data.message || "Your account is pending admin verification. You will be notified once approved.")
        setIsRejected(data.isRejected || false)
        setRejectionReason(data.rejectionReason || "")
        return
      }

      const needsRegistration = data.needsRegistration === true

      if (needsRegistration) {
        // No DB record yet; redirect to registration details page WITHOUT creating anything in DB.
        sessionStorage.removeItem("deliveryAuthData")
        sessionStorage.setItem("deliveryNeedsRegistration", "true")
        const digits = String(phone || "").replace(/\D/g, "")
        const details = {
          name: "",
          phone: digits.slice(-10),
          countryCode: "+91",
        }
        sessionStorage.setItem("deliverySignupDetails", JSON.stringify(details))
        setIsLoading(false)
        navigate("/food/delivery/signup/details", { replace: true })
        return
      }

      const accessToken = data.accessToken
      const refreshToken = data.refreshToken || null
      const user = data.user

      if (!accessToken || !user) {
        throw new Error("Invalid response from server")
      }

      sessionStorage.removeItem("deliveryAuthData")

      try {
        debugLog("Storing auth data for delivery:", { hasToken: !!accessToken, hasUser: !!user })
        storeAuthData("delivery", accessToken, user, refreshToken)
        debugLog("Auth data stored successfully")
      } catch (storageError) {
        debugError("Failed to store authentication data:", storageError)
        setError("Failed to save authentication. Please try again or clear your browser storage.")
        setIsLoading(false)
        return
      }

      window.dispatchEvent(new Event("deliveryAuthChanged"))

      setSuccess(true)
      setIsLoading(false)

      let retryCount = 0
      const maxRetries = 10
      const verifyAndNavigate = () => {
        const storedToken = localStorage.getItem("delivery_accessToken")
        const storedAuth = localStorage.getItem("delivery_authenticated")

        if (storedToken && storedAuth === "true") {
          navigate("/food/delivery", { replace: true })
        } else if (retryCount < maxRetries) {
          retryCount++
          setTimeout(verifyAndNavigate, 100)
        } else {
          setError("Failed to save authentication. Please try again.")
          setIsLoading(false)
        }
      }
      setTimeout(verifyAndNavigate, 200)
    } catch (err) {
      debugError("OTP Verification Error:", err)
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to verify OTP. Please try again."
      setError(message)
      setIsLoading(false)
    }
  }

  const handleSubmitName = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError("Name is required")
      return
    }

    if (!verifiedOtp) {
      setError("OTP verification step missing. Please request a new OTP.")
      return
    }

    setIsLoading(true)
    setError("")
    setNameError("")

    try {
      const phone = authData?.phone
      const purpose = authData?.purpose || "login"
      if (!phone) {
        setError("Phone number not found. Please try again.")
        return
      }

      // Second call with name to auto-register and login
      const response = await deliveryAPI.verifyOTP(phone, verifiedOtp, purpose, trimmedName, deviceToken, activePlatform)
      const data = response?.data?.data || response?.data || {}

      const accessToken = data.accessToken
      const refreshToken = data.refreshToken || null
      const user = data.user

      if (!accessToken || !user) {
        throw new Error("Invalid response from server")
      }

      // Clear auth data from sessionStorage
      sessionStorage.removeItem("deliveryAuthData")

      // Store auth data using utility function to ensure proper role handling
      // The setAuthData function includes error handling and verification
      try {
        debugLog("Storing auth data for delivery (with name):", { hasToken: !!accessToken, hasUser: !!user })
        storeAuthData("delivery", accessToken, user, refreshToken)
        debugLog("Auth data stored successfully")
      } catch (storageError) {
        debugError("Failed to store authentication data:", storageError)
        setError("Failed to save authentication. Please try again or clear your browser storage.")
        setIsLoading(false)
        return
      }

      // Dispatch custom event for same-tab updates
      window.dispatchEvent(new Event("deliveryAuthChanged"))

      setSuccess(true)
      setIsLoading(false)

      // Verify token is stored and then navigate
      let retryCount = 0
      const maxRetries = 10
      const verifyAndNavigate = () => {
        const storedToken = localStorage.getItem("delivery_accessToken")
        const storedAuth = localStorage.getItem("delivery_authenticated")

        debugLog("Verifying token storage (with name):", { hasToken: !!storedToken, authenticated: storedAuth, retryCount })

        if (storedToken && storedAuth === "true") {
          // Token is stored, navigate to delivery home
          debugLog("Token verified, navigating to /delivery")
          navigate("/food/delivery", { replace: true })
        } else if (retryCount < maxRetries) {
          // Token not stored yet, retry after short delay
          retryCount++
          setTimeout(verifyAndNavigate, 100)
        } else {
          // Max retries reached, show error
          debugError("Token storage verification failed after max retries")
          setError("Failed to save authentication. Please try again.")
          setIsLoading(false)
        }
      }

      // Start verification after a small delay
      setTimeout(verifyAndNavigate, 200)
    } catch (err) {
      debugError("Name Submission Error:", err)
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to complete registration. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendTimer > 0) return

    setIsLoading(true)
    setError("")

    try {
      const phone = authData?.phone
      const purpose = authData?.purpose || "login"
      if (!phone) {
        setError("Phone number not found. Please go back and try again.")
        return
      }

      // Call backend to resend OTP
      await deliveryAPI.sendOTP(phone, purpose)
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to resend OTP. Please try again."
      setError(message)
    } finally {
      setIsLoading(false)
    }

    // Reset timer to 60 seconds
    setResendTimer(60)
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    setOtp(["", "", "", ""])
    setShowNameInput(false)
    setName("")
    setNameError("")
    setVerifiedOtp("")
    inputRefs.current[0]?.focus()
  }

  const getPhoneNumber = () => {
    if (!authData) return ""
    if (authData.method === "phone") {
      // Format phone number as +91-9098569620
      const phone = authData.phone || ""
      // Remove spaces and format
      const cleaned = phone.replace(/\s/g, "")
      // Add hyphen after country code if not present
      if (cleaned.startsWith("+91") && cleaned.length > 3) {
        return cleaned.slice(0, 3) + "-" + cleaned.slice(3)
      }
      return cleaned
    }
    return authData.email || ""
  }

  if (!authData) {
    return null
  }

  return (
    <AnimatedPage className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col relative overflow-hidden font-['Poppins']">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#7e3866]/10 via-[#7e3866]/5 to-transparent pointer-events-none" />
      <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-[#7e3866]/5 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-[#7e3866]/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Header / Back */}
      <div className="relative z-20 px-6 py-8 flex items-center">
        <motion.button
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/food/delivery/login")}
          className="p-3 bg-white dark:bg-[#1a1a1a] shadow-xl shadow-[#7e3866]/10 rounded-2xl text-[#7e3866] border border-[#7e3866]/5 outline-none"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px]"
        >
          {/* Icon & Title */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 bg-[#7e3866] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-[#7e3866]/30 relative"
            >
              <ShieldCheck className="text-white w-10 h-10" />
            </motion.div>
            
            <h1 className="text-4xl font-black text-[#7e3866] font-['Outfit'] tracking-tight mb-3">
              Verify Account
            </h1>
            <div className="text-gray-500 dark:text-gray-400 font-medium">
              {showNameInput
                ? "You're almost done! Please tell us your name to complete registration."
                : "We have sent a 4-digit code to"}
              {!showNameInput && (
                <>
                  <br />
                  <span className="text-[#7e3866] font-bold">{getPhoneNumber()}</span>
                  <br />
                  <button
                    type="button"
                    onClick={() => navigate("/food/delivery/login")}
                    className="text-xs text-[#7e3866] hover:text-[#6a2f56] font-semibold underline mt-1"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </div>

          {/* OTP Input Card */}
          <div className="bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-2xl rounded-[3rem] p-10 shadow-[0_40px_80px_-20px_rgba(126,56,102,0.2)] border border-white/20 dark:border-gray-800">
            
            {/* Pending approval message */}
            {pendingMessage && (
              <div className={`rounded-2xl border p-5 text-center space-y-4 shadow-sm mb-6 ${isRejected ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
                <div className="space-y-2">
                  <p className={`text-sm font-semibold ${isRejected ? "text-red-800" : "text-amber-800"}`}>
                    {isRejected ? "Application Rejected" : "Pending Verification"}
                  </p>
                  <p className={`text-sm leading-relaxed ${isRejected ? "text-red-700" : "text-amber-700"}`}>
                    {pendingMessage}
                  </p>
                  {isRejected && rejectionReason && (
                    <div className="mt-2 p-3 bg-white/50 rounded-lg border border-red-200">
                      <p className="text-xs font-medium text-red-600 uppercase tracking-wider mb-1">Reason</p>
                      <p className="text-sm text-red-800 italic">"{rejectionReason}"</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  {isRejected && (
                    <button
                      type="button"
                      onClick={() => {
                        const phone = authData?.phone
                        const digits = String(phone || "").replace(/\D/g, "")
                        sessionStorage.setItem("deliveryNeedsRegistration", "true")
                        const details = {
                          name: "",
                          phone: digits.slice(-10),
                          countryCode: "+91",
                        }
                        sessionStorage.setItem("deliverySignupDetails", JSON.stringify(details))
                        navigate("/food/delivery/signup/details", { replace: true })
                      }}
                      className="w-full py-3 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 shadow-md transition-all active:scale-95"
                    >
                      Re-apply Now
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => navigate("/food/delivery/login", { replace: true })}
                    className={`text-sm font-medium underline transition-colors ${isRejected ? "text-red-600 hover:text-red-800" : "text-amber-700 hover:text-amber-900"}`}
                  >
                    Back to login
                  </button>
                </div>
              </div>
            )}

            {/* Error message */}
            {error && (
              <p className="text-sm text-red-500 text-center mb-6">
                {error}
              </p>
            )}

            {/* OTP Inputs */}
            {!showNameInput && !pendingMessage && (
              <>
                <div className="grid grid-cols-4 gap-4 mb-10">
                  {otp.map((digit, index) => (
                    <div key={index} className="relative group">
                      <input
                        ref={(el) => (inputRefs.current[index] = el)}
                        type="tel"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={index === 0 ? handlePaste : undefined}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        disabled={isLoading}
                        className={`w-full aspect-square bg-gray-100 dark:bg-gray-800/50 text-center text-3xl font-black text-[#7e3866] border-2 border-gray-200 dark:border-gray-700 rounded-2xl outline-none transition-all ${
                          focusedIndex === index 
                            ? "border-[#7e3866] bg-white dark:bg-gray-900 scale-105 shadow-[0_10px_30px_rgba(126,56,102,0.1)]" 
                            : "hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      />
                      <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full transition-all duration-300 ${focusedIndex === index ? "bg-[#7e3866] opacity-100" : "bg-gray-200 opacity-0"}`} />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleVerify()}
                  disabled={isLoading || !isOtpComplete}
                  className="w-full py-4.5 bg-[#7e3866] hover:bg-[#6a2f56] disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white rounded-2xl font-bold text-lg shadow-xl shadow-[#7e3866]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-8"
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "Verify & Continue"}
                </button>

                {/* Resend Section */}
                <div className="text-center">
                  {resendTimer > 0 ? (
                    <p className="text-sm text-gray-400 font-medium flex items-center justify-center gap-2 tracking-wide uppercase text-[10px] font-black">
                      <Timer className="w-3.5 h-3.5 text-[#7e3866]" />
                      Resend code in <span className="text-[#7e3866] font-bold">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      disabled={isLoading}
                      className="text-xs text-[#7e3866] font-black uppercase tracking-widest hover:underline underline-offset-4 flex items-center justify-center gap-2 mx-auto"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Resend OTP Code
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Name Input */}
            {showNameInput && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#7e3866] uppercase tracking-[0.2em] ml-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value)
                      if (nameError) setNameError("")
                    }}
                    disabled={isLoading}
                    placeholder="Enter your name"
                    className={`block w-full px-6 py-4 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white border-2 border-transparent focus:border-[#7e3866]/50 rounded-2xl outline-none transition-all placeholder:text-gray-300 font-bold text-lg shadow-sm ${
                      nameError ? "border-red-500 focus:border-red-500" : ""
                    }`}
                  />
                  {nameError && (
                    <p className="text-xs text-red-500 ml-1">
                      {nameError}
                    </p>
                  )}
                </div>

                <button
                  onClick={handleSubmitName}
                  disabled={isLoading}
                  className="w-full py-4.5 bg-[#7e3866] hover:bg-[#6a2f56] disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white rounded-2xl font-bold text-lg shadow-xl shadow-[#7e3866]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {isLoading ? "Continuing..." : "Continue"}
                </button>
              </div>
            )}

          </div>

          <p className="mt-12 text-[10px] font-black text-gray-300 dark:text-gray-600 text-center uppercase tracking-[0.3em]">
            Secure Verification &bull; Foodelo Partner
          </p>
        </motion.div>
      </div>

    </AnimatedPage>
  )
}

