import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { useNavigate } from "react-router-dom"
import {
  ChevronDown, ChevronRight, ArrowRight, CheckCircle2, Send, Phone, Mail, MapPin,
  TrendingDown, TrendingUp, Boxes, GraduationCap, Megaphone, Zap, Heart, Headphones,
  Cpu, Leaf, Wrench, Package, Handshake, Palette, Gift, Star, Download, Play, Menu, X,
  User, Briefcase, Award, MessageSquare, Landmark, ArrowLeft
} from "lucide-react"
import api from "@food/api"

const BRAND_RED = "#D51F10"
const GOLD = "#F4B400"

const ICON_MAP = {
  TrendingDown, TrendingUp, Boxes, GraduationCap, Megaphone, Zap, Heart, Headphones,
  Cpu, Leaf, Wrench, Package, Handshake, Palette, Gift, Star, Play,
}

const fadeUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }
const stagger = { visible: { transition: { staggerChildren: 0.1 } } }

function SectionTitle({ children, sub }) {
  return (
    <div className="text-center mb-10 md:mb-14">
      <motion.h2 variants={fadeUp} className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white mb-3">{children}</motion.h2>
      {sub && <motion.p variants={fadeUp} className="text-gray-500 dark:text-gray-400 text-sm md:text-base max-w-xl mx-auto">{sub}</motion.p>}
    </div>
  )
}

function IconByName({ name, className }) {
  const Comp = ICON_MAP[name] || Star
  return <Comp className={className} />
}

export default function FranchisePage() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ name: "", phone: "", email: "", city: "", state: "", preferredLocation: "", budget: "", occupation: "", experience: "", message: "" })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(() => {
    const lastSubmit = localStorage.getItem("franchise_submitted_time");
    if (lastSubmit) {
      const diff = Date.now() - parseInt(lastSubmit, 10);
      return diff < 24 * 60 * 60 * 1000;
    }
    return false;
  })
  const [openFaq, setOpenFaq] = useState(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState("")
  const formRef = useRef(null)

  useEffect(() => {
    api.get("/food/franchise/settings/public").then(res => {
      if (res?.data?.data) setSettings(res.data.data)
    }).catch(() => toast.error("Failed to load franchise info")).finally(() => setLoading(false))
  }, [])

  const scrollToSection = (id) => {
    setMobileMenuOpen(false)
    const element = document.getElementById(id);
    if (element) {
      const offset = 72; // height of the sticky navbar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  }

  const scrollToForm = () => scrollToSection("franchise-form")

  useEffect(() => {
    if (loading || !settings) return

    const sections = ["why-choose-us", "what-you-get", "business-model", "gallery", "faqs", "franchise-form", "contact-us"]
    const observerOptions = {
      root: null,
      rootMargin: "-100px 0px -50% 0px",
      threshold: 0
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id)
        }
      })
    }, observerOptions)

    sections.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [loading, settings])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const req = settings?.formSettings?.requiredFields || ["name", "phone", "email", "city", "state", "preferredLocation", "budget"]
    for (const f of req) { if (!formData[f]?.trim()) { toast.error(`Please fill the ${f.replace(/([A-Z])/g, " $1").toLowerCase()} field`); return } }

    const trimmedName = formData.name.trim()
    if (trimmedName.length < 3) {
      toast.error("Full Name must be at least 3 characters long");
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(trimmedName)) {
      toast.error("Full Name can only contain letters and spaces");
      return;
    }

    const trimmedPhone = formData.phone.trim()
    if (trimmedPhone.length !== 10 || !/^\d{10}$/.test(trimmedPhone)) {
      toast.error("Phone Number must be a valid 10-digit number");
      return;
    }

    const trimmedEmail = formData.email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }

    const trimmedCity = formData.city.trim()
    if (!/^[a-zA-Z\s]+$/.test(trimmedCity)) {
      toast.error("City can only contain letters and spaces");
      return;
    }
    const trimmedState = formData.state.trim()
    if (!/^[a-zA-Z\s]+$/.test(trimmedState)) {
      toast.error("State can only contain letters and spaces");
      return;
    }

    setSubmitting(true)
    try {
      const res = await api.post("/food/franchise/apply", {
        ...formData,
        name: trimmedName,
        phone: trimmedPhone,
        email: trimmedEmail,
        city: trimmedCity,
        state: trimmedState,
        preferredLocation: formData.preferredLocation.trim(),
        occupation: (formData.occupation || "").trim(),
        experience: (formData.experience || "").trim(),
        message: (formData.message || "").trim(),
      })
      if (res?.data?.success) { 
        toast.success(res.data.message || "Application submitted!"); 
        localStorage.setItem("franchise_submitted_time", Date.now().toString());
        setSubmitted(true); 
        setFormData({ name: "", phone: "", email: "", city: "", state: "", preferredLocation: "", budget: "", occupation: "", experience: "", message: "" }) 
      }
      else {
        toast.error(res?.data?.message || "Submission failed")
      }
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (err?.response?.status === 409 || msg?.includes("already submitted")) {
        toast.info(msg || "You have already submitted an application recently.");
        localStorage.setItem("franchise_submitted_time", Date.now().toString());
        setSubmitted(true);
      } else {
        toast.error(msg || "Something went wrong");
      }
    }
    finally { setSubmitting(false) }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: BRAND_RED }} />
    </div>
  )

  const s = settings || {}
  const whyCards = [...(s.whyChooseUs || [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const packages = [...(s.packages || [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const timeline = [...(s.timelineSteps || [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const faqs = [...(s.faqs || [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const gallery = [...(s.galleryImages || [])].sort((a, b) => a.sortOrder - b.sortOrder)
  const includes = s.investmentIncludes || []
  const budgetOptions = ["Under 1L", "1-2L", "2-5L", "5-10L", "10L+"]

  const navItems = [
    { id: "why-choose-us", label: "Why Choose Us", show: whyCards.length > 0 },
    { id: "what-you-get", label: "What You Get", show: packages.length > 0 },
    { id: "business-model", label: "Business Model", show: timeline.length > 0 },
    { id: "gallery", label: "Gallery", show: gallery.length > 0 },
    { id: "faqs", label: "FAQs", show: faqs.length > 0 },
    { id: "contact-us", label: "Contact Us", show: !!(s.contactNumber || s.whatsappNumber || s.contactEmail) },
  ]

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* ─── Navbar ─── */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-900/80 shadow-sm transition-all duration-300">
        
        {/* Corner Left Back Button */}
        <div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors text-gray-600 dark:text-gray-400 shadow-sm"
            title="Go Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pl-16 md:pl-20 lg:pl-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              {s.logoUrl ? (
                <img src={s.logoUrl} alt={s.brandName} className="h-14 md:h-20 w-auto object-contain mix-blend-multiply hover:scale-105 transition-transform duration-200" />
              ) : (
                <span className="text-xl md:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-1 hover:opacity-90 transition-opacity">
                  {s.brandName ? (
                    <>
                      <span style={{ color: BRAND_RED }}>{s.brandName.split(" ")[0]}</span>
                      {s.brandName.split(" ").slice(1).join(" ") && (
                        <span className="text-gray-900 dark:text-white"> {s.brandName.split(" ").slice(1).join(" ")}</span>
                      )}
                    </>
                  ) : (
                    "Tiffinji"
                  )}
                </span>
              )}
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              {navItems.filter(item => item.show).map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`text-sm font-bold tracking-wide transition-all duration-200 relative py-1 hover:text-[#D51F10] border-b-2 ${
                    activeSection === item.id 
                      ? "text-[#D51F10] border-[#D51F10]" 
                      : "text-gray-500 dark:text-gray-400 border-transparent"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => scrollToSection("franchise-form")}
                className="px-6 py-2.5 rounded-full font-bold text-white shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 text-sm"
                style={{ background: BRAND_RED }}
              >
                Apply Now
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 outline-none"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-100 dark:border-gray-900/80 bg-white dark:bg-[#0a0a0a]"
            >
              <div className="px-4 py-4 space-y-3 shadow-inner">
                {navItems.filter(item => item.show).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`block w-full text-left py-2 text-sm font-bold transition-colors ${
                      activeSection === item.id 
                        ? "text-[#D51F10]" 
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  onClick={() => scrollToSection("franchise-form")}
                  className="w-full py-3 mt-2 rounded-xl font-bold text-white shadow-md text-sm text-center block"
                  style={{ background: BRAND_RED }}
                >
                  Apply Now
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <div className="overflow-x-hidden">
      {/* ─── Hero ─── */}
      <section className="relative h-[calc(100vh-64px)] lg:h-[calc(100vh-80px)] min-h-[550px] md:min-h-[600px] flex items-center justify-center overflow-hidden bg-black">
        {s.heroBgImageUrl && (
          <>
            <motion.img 
              src={s.heroBgImageUrl} 
              alt="" 
              initial={{ scale: 1.05 }}
              animate={{ scale: 1.15 }}
              transition={{ 
                duration: 25, 
                repeat: Infinity, 
                repeatType: "reverse", 
                ease: "linear" 
              }}
              className="absolute inset-0 w-full h-full object-cover opacity-85" 
            />
            {/* Multi-layered premium gradient overlay for maximum legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/55 to-black/75" />
            <div className="absolute inset-0 bg-radial-gradient" style={{ background: "radial-gradient(circle at center, transparent 20%, rgba(0,0,0,0.4) 80%)" }} />
          </>
        )}
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #D51F1030 0%, transparent 50%), radial-gradient(circle at 80% 20%, #F4B40020 0%, transparent 40%)" }} />
        
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto flex flex-col items-center justify-center h-full">
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: false }}
            transition={{ duration: 0.7, ease: "easeOut" }} 
            className="text-4xl md:text-7xl font-black text-white mb-2 tracking-tight"
            style={{ textShadow: "0 4px 15px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.6)" }}
          >
            {s.brandName || "Franchise"}
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: false }}
            transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }} 
            className="text-xl md:text-3xl font-extrabold mb-2"
            style={{ color: GOLD, textShadow: "0 3px 10px rgba(0,0,0,0.9), 0 1px 3px rgba(0,0,0,0.7)" }}
          >
            {s.heroTitle || "Franchise Opportunity"}
          </motion.p>
          
          <motion.p 
            initial={{ opacity: 0, y: 15 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: false }}
            transition={{ delay: 0.35, duration: 0.5 }} 
            className="text-white/90 mb-8 text-sm md:text-xl font-semibold max-w-lg mx-auto"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}
          >
            {s.heroSubtitle}
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 25 }} 
            whileInView={{ opacity: 1, y: 0 }} 
            viewport={{ once: false }}
            transition={{ delay: 0.5, type: "spring", stiffness: 90 }} 
            className="inline-block bg-black/55 backdrop-blur-xl border border-white/15 rounded-3xl px-12 py-5 mb-8 max-w-xs w-full shadow-[0_10px_35px_-5px_rgba(0,0,0,0.6)]"
          >
            <p className="text-white/70 text-[10px] md:text-xs uppercase tracking-widest font-black mb-2" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>Investment Starting From</p>
            <p className="text-3xl md:text-5xl font-black tracking-tight" style={{ color: GOLD, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>{s.investmentPrice || "₹1,29,000"}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center w-full max-w-md"
          >
            <motion.button 
              whileHover={{ scale: 1.04, boxShadow: "0 10px 25px -5px rgba(213,31,16,0.5)" }} 
              whileTap={{ scale: 0.97 }} 
              onClick={scrollToForm} 
              className="px-8 py-4 rounded-xl font-bold text-white shadow-lg text-base flex-1 transition-all duration-200" 
              style={{ background: BRAND_RED }}
            >
              {s.heroCTAText || "Apply Now"} <ArrowRight className="inline h-4 w-4 ml-1" />
            </motion.button>
            {s.brochureUrl && (
              <motion.a 
                whileHover={{ scale: 1.04, backgroundColor: "rgba(255,255,255,0.12)" }}
                whileTap={{ scale: 0.97 }}
                href={s.brochureUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-8 py-4 rounded-xl font-bold text-white border border-white/20 bg-white/5 backdrop-blur-sm transition-all text-base flex-1 flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" /> Download Brochure
              </motion.a>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─── Why Choose Us ─── */}
      {whyCards.length > 0 && (
        <motion.section id="why-choose-us" initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger} className="pt-8 pb-16 md:pt-12 md:pb-24 px-4 max-w-6xl mx-auto">
          <SectionTitle sub="Everything you need to succeed in the food business">Why Choose {s.brandName || "Us"}?</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {whyCards.map((c, i) => (
              <motion.div key={i} variants={fadeUp} whileHover={{ y: -4, boxShadow: "0 12px 40px rgba(213,31,16,0.12)" }} className="bg-white dark:bg-[#141414] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 md:p-6 text-center transition-all group">
                <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: `${BRAND_RED}12` }}>
                  <IconByName name={c.icon} className="h-6 w-6" style={{ color: BRAND_RED }} />
                </div>
                <h3 className="font-bold text-sm md:text-base text-gray-900 dark:text-white mb-1">{c.title}</h3>
                {c.description && <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{c.description}</p>}
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ─── Packages ─── */}
      {packages.length > 0 && (
        <motion.section id="what-you-get" initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger} className="pt-8 pb-16 md:pt-12 md:pb-24 px-4 bg-gray-50 dark:bg-[#0f0f0f]">
          <div className="max-w-6xl mx-auto">
            <SectionTitle sub="Complete franchise kit delivered to your doorstep">What You Get</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {packages.map((pkg, i) => (
                <motion.div key={i} variants={fadeUp} className="h-full min-h-[250px] md:min-h-[260px] bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-xl transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BRAND_RED}15` }}>
                      <IconByName name={pkg.icon} className="h-5 w-5" style={{ color: BRAND_RED }} />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{pkg.categoryName}</h3>
                  </div>
                  <ul className="space-y-2">
                    {(pkg.items || []).map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: BRAND_RED }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ─── Business Timeline ─── */}
      {timeline.length > 0 && (
        <motion.section id="business-model" initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger} className="pt-8 pb-16 md:pt-12 md:pb-24 px-4 max-w-5xl mx-auto">
          <SectionTitle sub="From application to grand opening in 6 simple steps">Business Model</SectionTitle>
          <div className="relative max-w-4xl mx-auto">
            {/* Center line on desktop, left line on mobile (Animates drawing downward) */}
            <motion.div 
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 1.0, ease: "easeOut" }}
              style={{ originY: 0 }}
              className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-0.5 -translate-x-[1px] bg-gray-200/80 dark:bg-gray-800/80" 
            />
            
            <div className="space-y-10 md:space-y-14">
              {timeline.map((step, i) => {
                const isEven = i % 2 === 0;
                return (
                  <motion.div 
                    key={i} 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: false, margin: "-120px" }}
                    className={`flex flex-col md:flex-row items-start md:items-center relative ${
                      isEven ? '' : 'md:flex-row-reverse'
                    }`}
                  >
                    {/* Text Block (Slides in from the left/right side) */}
                    <motion.div 
                      variants={{
                        hidden: { opacity: 0, x: isEven ? -40 : 40, y: 15 },
                        visible: { opacity: 1, x: 0, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                      }}
                      className={`w-full md:w-1/2 pl-12 md:pl-0 ${
                        isEven ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'
                      }`}
                    >
                      <h3 className="font-extrabold text-lg md:text-xl mb-1.5 leading-snug" style={{ color: BRAND_RED }}>
                        {step.title}
                      </h3>
                      {step.description && (
                        <p className="text-sm md:text-base text-gray-500 dark:text-gray-400 font-medium leading-relaxed max-w-sm md:max-w-none ml-0 mr-auto md:mx-0 inline-block">
                          {step.description}
                        </p>
                      )}
                    </motion.div>
                    
                    {/* Circle Badge (Pops out using a spring physical scale) */}
                    <motion.div 
                      variants={{
                        hidden: { opacity: 0, scale: 0.3 },
                        visible: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 140, damping: 12, delay: 0.15 } }
                      }}
                      className="absolute left-[20px] md:left-1/2 top-1 md:top-1/2 md:-translate-y-1/2 -translate-x-1/2 z-10"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md transition-transform duration-300 hover:scale-110" style={{ background: BRAND_RED }}>
                        {i + 1}
                      </div>
                    </motion.div>
                    
                    {/* Empty spacer for desktop side */}
                    <div className="hidden md:block w-1/2" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>
      )}

      {/* ─── Investment ─── */}
      <motion.section 
        initial="hidden" 
        whileInView="visible" 
        viewport={{ once: false, margin: "-80px" }} 
        variants={stagger} 
        className="relative py-16 md:py-24 px-4 overflow-hidden bg-black"
      >
        {/* Background Image & Overlay */}
        <div className="absolute inset-0">
          <img 
            src={s.investmentBgImageUrl || "/food/franchise/investment_bg.png"} 
            alt="" 
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-black/35" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-black/60 backdrop-blur-md border border-white/10 rounded-3xl p-6 md:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            
            {/* Left Column: Investment Headline and Stats */}
            <div className="lg:col-span-7 text-left space-y-4">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#D51F10]/20 text-[#ff4e3e] border border-[#D51F10]/30">
                Franchise Blueprint
              </span>
              <h3 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                Launch Your Franchise For High-Profit Growth
              </h3>
              <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-xl">
                Get everything you need to start, run, and scale a successful outlet. Our fully integrated support model handles setup, training, supply chains, and digital marketing.
              </p>
              <div className="pt-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Franchise Investment</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-5xl font-black tracking-tight" style={{ color: GOLD }}>
                    {s.investmentPrice || "₹1,29,000"}
                  </span>
                  <span className="text-xs text-gray-400 font-medium">(All-inclusive setup package)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Inclusions Checklist & Button */}
            <div className="lg:col-span-5 w-full">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/10 pb-3">
                  What's Included:
                </h4>
                {includes.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                    {includes.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors p-2.5 rounded-xl border border-white/5">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
                        <span className="text-white font-semibold text-xs md:text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
                <motion.button 
                  whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(213, 31, 16, 0.4)" }} 
                  whileTap={{ scale: 0.98 }} 
                  onClick={scrollToForm} 
                  className="w-full mt-4 py-3.5 rounded-xl text-white font-bold text-base shadow-lg transition-all" 
                  style={{ background: `linear-gradient(135deg, ${BRAND_RED}, #ff3b2f)` }}
                >
                  {s.heroCTAText || "Apply Now"} <ArrowRight className="inline h-4 w-4 ml-1" />
                </motion.button>
              </div>
            </div>

          </div>
        </div>
      </motion.section>

      {/* ─── Gallery ─── */}
      {gallery.length > 0 && (
        <motion.section id="gallery" initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger} className="pt-8 pb-16 md:pt-12 md:pb-24 px-4 max-w-6xl mx-auto">
          <SectionTitle>Gallery</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            {gallery.map((img, i) => (
              <motion.div key={i} variants={fadeUp} className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img src={img.url} alt={img.caption || ""} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ─── FAQ ─── */}
      {faqs.length > 0 && (
        <motion.section id="faqs" initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger} className="pt-8 pb-8 md:pt-12 md:pb-12 px-4 bg-gray-50 dark:bg-[#0f0f0f]">
          <div className="max-w-2xl mx-auto">
            <SectionTitle>Frequently Asked Questions</SectionTitle>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <motion.div key={i} variants={fadeUp} className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 md:p-5 text-left font-bold text-gray-900 dark:text-white text-sm md:text-base">
                    {faq.question}
                    <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                        <p className="px-4 md:px-5 pb-4 md:pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.section>
      )}

      {/* ─── Application Form ─── */}
      <motion.section ref={formRef} initial="hidden" whileInView="visible" viewport={{ once: false, margin: "-80px" }} variants={stagger} className="pt-8 pb-16 md:pt-12 md:pb-24 px-4 max-w-2xl mx-auto" id="franchise-form">
        <SectionTitle sub="Fill in your details and our team will contact you">Franchise Application</SectionTitle>
        {submitted ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-16 px-6 bg-green-50/50 dark:bg-green-950/10 rounded-3xl border border-green-200 dark:border-green-900 max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Application Submitted!</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base leading-relaxed">Our franchise team will contact you within 24 hours.</p>
          </motion.div>
        ) : (
          <div className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-gray-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-3xl p-6 md:p-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              {[
                { key: "name", label: "Full Name", type: "text", placeholder: "Your full name", maxLength: 50, icon: User },
                { key: "phone", label: "Phone Number", type: "tel", placeholder: "10-digit mobile number", maxLength: 10, icon: Phone },
                { key: "email", label: "Email Address", type: "email", placeholder: "your@email.com", maxLength: 80, icon: Mail },
              ].map(f => {
                const Icon = f.icon
                return (
                  <div key={f.key} className="space-y-1 group">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{f.label} *</label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#D51F10] transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <input 
                        type={f.type} 
                        value={formData[f.key] || ""} 
                        onChange={e => {
                          let val = e.target.value;
                          if (f.key === "phone") val = val.replace(/\D/g, "");
                          if (f.key === "name") val = val.replace(/[^a-zA-Z\s]/g, "");
                          setFormData(p => ({ ...p, [f.key]: val }));
                        }} 
                        placeholder={f.placeholder} 
                        maxLength={f.maxLength}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-400/80 focus:ring-2 focus:ring-[#D51F10]/20 focus:border-[#D51F10] outline-none transition-all" 
                        required 
                      />
                    </div>
                  </div>
                )
              })}
              
              <div className="grid grid-cols-2 gap-4">
                {[{ key: "city", label: "City", maxLength: 50, placeholder: "e.g. Mumbai" }, { key: "state", label: "State", maxLength: 50, placeholder: "e.g. Maharashtra" }].map(f => (
                  <div key={f.key} className="space-y-1 group">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{f.label} *</label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#D51F10] transition-colors">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <input 
                        type="text" 
                        value={formData[f.key] || ""} 
                        onChange={e => {
                          const val = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                          setFormData(p => ({ ...p, [f.key]: val }));
                        }} 
                        placeholder={f.placeholder}
                        maxLength={f.maxLength}
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-400/80 focus:ring-2 focus:ring-[#D51F10]/20 focus:border-[#D51F10] outline-none transition-all" 
                        required 
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 group">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Preferred Franchise Location *</label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#D51F10] transition-colors">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <input 
                    type="text" 
                    value={formData.preferredLocation || ""} 
                    onChange={e => setFormData(p => ({ ...p, preferredLocation: e.target.value }))} 
                    placeholder="Area or locality" 
                    maxLength={100} 
                    className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-400/80 focus:ring-2 focus:ring-[#D51F10]/20 focus:border-[#D51F10] outline-none transition-all" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1 group">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Investment Budget *</label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#D51F10] transition-colors">
                    <Landmark className="h-5 w-5" />
                  </div>
                  <select 
                    value={formData.budget || ""} 
                    onChange={e => setFormData(p => ({ ...p, budget: e.target.value }))} 
                    className="w-full h-12 pl-11 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white focus:ring-2 focus:ring-[#D51F10]/20 focus:border-[#D51F10] outline-none appearance-none transition-all cursor-pointer" 
                    required
                  >
                    <option value="">Select budget range</option>
                    {budgetOptions.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#D51F10]">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {[{ key: "occupation", label: "Current Occupation", maxLength: 60, icon: Briefcase, placeholder: "Your current profession" }, { key: "experience", label: "Business Experience", maxLength: 100, icon: Award, placeholder: "e.g. 2 years in retail" }].map(f => {
                const Icon = f.icon
                return (
                  <div key={f.key} className="space-y-1 group">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{f.label}</label>
                    <div className="relative rounded-xl">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#D51F10] transition-colors">
                        <Icon className="h-5 w-5" />
                      </div>
                      <input 
                        type="text" 
                        value={formData[f.key] || ""} 
                        onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))} 
                        placeholder={f.placeholder}
                        maxLength={f.maxLength} 
                        className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-400/80 focus:ring-2 focus:ring-[#D51F10]/20 focus:border-[#D51F10] outline-none transition-all" 
                      />
                    </div>
                  </div>
                )
              })}

              <div className="space-y-1 group">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Message</label>
                <div className="relative rounded-xl">
                  <div className="absolute left-4 top-3.5 pointer-events-none text-gray-400 group-focus-within:text-[#D51F10] transition-colors">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <textarea 
                    value={formData.message || ""} 
                    onChange={e => setFormData(p => ({ ...p, message: e.target.value }))} 
                    rows={3} 
                    maxLength={500} 
                    placeholder="Any additional messages or queries..." 
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white placeholder-gray-400/80 focus:ring-2 focus:ring-[#D51F10]/20 focus:border-[#D51F10] outline-none resize-none transition-all" 
                  />
                </div>
                <div className="text-right text-xs text-gray-400 mt-1">{(formData.message || "").length}/500</div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }} 
                type="submit" 
                disabled={submitting} 
                className="w-full h-14 rounded-xl text-white font-bold text-lg shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all" 
                style={{ background: BRAND_RED }}
              >
                {submitting ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <><Send className="h-5 w-5" />{s.formSettings?.buttonText || "Become Franchise Partner"}</>}
              </motion.button>
            </form>
          </div>
        )}
      </motion.section>

      {/* ─── Contact Us Section ─── */}
      {(s.contactNumber || s.whatsappNumber || s.contactEmail) && (
        <motion.section 
          id="contact-us"
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: false, margin: "-80px" }} 
          variants={stagger} 
          className="py-12 md:py-16 px-4 bg-gray-50 dark:bg-gray-900/20 border-t border-b border-gray-100 dark:border-gray-900/50"
        >
          <div className="max-w-4xl mx-auto">
            <SectionTitle sub="Have questions? Get in touch with our franchise support team directly">Contact Us</SectionTitle>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {s.contactNumber && (
                <motion.a 
                  href={`tel:${s.contactNumber}`}
                  variants={fadeUp}
                  whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.05)" }}
                  className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center flex flex-col items-center group transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/20 flex items-center justify-center mb-4 text-[#D51F10]">
                    <Phone className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-gray-950 dark:text-white mb-1">Call Us</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-[#D51F10] transition-colors font-semibold">{s.contactNumber}</p>
                </motion.a>
              )}

              {s.whatsappNumber && (
                <motion.a 
                  href={`https://wa.me/${s.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variants={fadeUp}
                  whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.05)" }}
                  className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center flex flex-col items-center group transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-950/20 flex items-center justify-center mb-4 text-green-600">
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.118-2.91-6.993-1.88-1.875-4.379-2.907-7.022-2.907-5.445 0-9.87 4.426-9.875 9.87-.001 1.716.463 3.39 1.34 4.873l-.905 3.3 3.39-.89zm12.39-4.883c-.328-.165-1.94-.959-2.242-1.07-.302-.11-.522-.165-.74.165-.219.329-.85 1.07-1.041 1.289-.193.22-.386.248-.713.083-.328-.165-1.385-.51-2.637-1.63-1.002-.89-1.677-1.99-1.874-2.32-.197-.329-.02-.507.144-.671.148-.147.329-.385.493-.578.164-.193.219-.33.329-.55.11-.219.055-.412-.028-.577-.08-.165-.74-1.785-1.013-2.443-.267-.643-.538-.553-.74-.564-.19-.01-.408-.012-.625-.012-.218 0-.571.082-.87.41-.3.327-1.14 1.111-1.14 2.709 0 1.597 1.16 3.136 1.32 3.356.16.22 2.284 3.49 5.533 4.892.772.333 1.376.531 1.846.68.777.247 1.485.212 2.043.129.622-.092 1.94-.795 2.215-1.564.275-.77.275-1.43.193-1.564-.083-.13-.302-.212-.63-.377z"/>
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-950 dark:text-white mb-1">WhatsApp Us</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-green-600 transition-colors font-semibold">Message Support</p>
                </motion.a>
              )}

              {s.contactEmail && (
                <motion.a 
                  href={`mailto:${s.contactEmail}`}
                  variants={fadeUp}
                  whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.05)" }}
                  className="bg-white dark:bg-[#111111] border border-gray-100 dark:border-gray-800 rounded-2xl p-6 text-center flex flex-col items-center group transition-all"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center mb-4 text-blue-500">
                    <Mail className="h-5 w-5" />
                  </div>
                  <h4 className="font-bold text-gray-950 dark:text-white mb-1">Email Us</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 group-hover:text-blue-500 transition-colors font-semibold break-all">{s.contactEmail}</p>
                </motion.a>
              )}
            </div>
          </div>
        </motion.section>
      )}

      {/* ─── Footer CTA ─── */}
      <section className="py-12 md:py-16 px-4 text-center" style={{ background: BRAND_RED }}>
        <h2 className="text-2xl md:text-3xl font-black text-white mb-3">Ready to Start Your Business?</h2>
        <p className="text-white/70 text-sm mb-6 max-w-md mx-auto">Join hundreds of successful franchise partners. Take the first step today.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <button onClick={scrollToForm} className="px-8 py-3 rounded-xl bg-white font-bold shadow-lg hover:shadow-xl transition-all" style={{ color: BRAND_RED }}>
            Apply Now <ArrowRight className="inline h-4 w-4 ml-1" />
          </button>
        </div>
      </section>
      </div>
    </div>
  )
}
