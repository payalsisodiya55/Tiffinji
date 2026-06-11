import { useState, useEffect, useRef } from "react"
import { Save, Plus, Trash2, Settings2, Image, HelpCircle, Package, Layout, Type, Phone, ChevronLeft, Upload, Loader2, FileText } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { adminAPI, uploadAPI } from "@food/api"

const BRAND_RED = "#D51F10"
const TABS = [
  { key: "branding", label: "Branding", icon: Layout },
  { key: "hero", label: "Hero", icon: Image },
  { key: "whyChoose", label: "Why Choose", icon: Type },
  { key: "packages", label: "Packages", icon: Package },
  { key: "timeline", label: "Timeline", icon: Settings2 },
  { key: "investment", label: "Investment", icon: Settings2 },
  { key: "gallery", label: "Gallery", icon: Image },
  { key: "faq", label: "FAQ", icon: HelpCircle },
  { key: "form", label: "Form", icon: Type },
  { key: "contact", label: "Contact", icon: Phone },
]

function Field({ label, value, onChange, type = "text", placeholder, rows, required, maxLength }) {
  const cls = "w-full px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-sm focus:ring-2 focus:ring-[#D51F10] outline-none"
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 mb-1.5 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {rows ? <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={rows} placeholder={placeholder} maxLength={maxLength} className={`${cls} py-2 resize-none`} />
        : <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} className={`${cls} h-10`} />}
    </div>
  )
}

function ImageUploadField({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload PNG, JPG, JPEG, or WEBP.")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit.")
      return
    }

    setUploading(true)
    try {
      const uploadRes = await uploadAPI.uploadMedia(file, { folder: "appzeto/franchise" })
      const payload = uploadRes?.data?.data || uploadRes?.data
      const url = payload?.url
      if (url) {
        onChange(url)
        toast.success("Image uploaded successfully!")
      } else {
        toast.error("Failed to get image URL from response")
      }
    } catch (err) {
      toast.error("Upload failed")
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 block">{label}</label>
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/10 rounded-xl border border-gray-100 dark:border-gray-800/80">
        {value ? (
          <div className="relative h-16 w-24 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] flex-shrink-0">
            <img src={value} alt={label} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-16 w-24 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 text-xs font-medium bg-white dark:bg-[#0a0a0a] flex-shrink-0">
            No Image
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {value ? "Change Image" : "Upload Image"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="p-2.5 rounded-lg border border-red-100 dark:border-red-950/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                title="Remove image"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400">Max size 5MB. PNG, JPG, JPEG, WEBP.</p>
        </div>
      </div>
    </div>
  )
}

function PdfUploadField({ label, value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== "application/pdf") {
      toast.error("Invalid file type. Please upload a PDF brochure.")
      return
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15MB limit.")
      return
    }

    setUploading(true)
    try {
      const uploadRes = await uploadAPI.uploadFile(file, { folder: "appzeto/franchise/brochure" })
      const payload = uploadRes?.data?.data || uploadRes?.data
      const url = payload?.url
      if (url) {
        onChange(url)
        toast.success("PDF uploaded successfully!")
      } else {
        toast.error("Failed to get file URL from response")
      }
    } catch (err) {
      toast.error("Upload failed")
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 block">{label}</label>
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/10 rounded-xl border border-gray-100 dark:border-gray-800/80">
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="h-16 w-24 rounded-lg border border-red-200 dark:border-red-950/30 bg-red-50/50 dark:bg-red-950/10 flex flex-col items-center justify-center text-red-500 text-[10px] font-bold gap-1 hover:bg-red-100/50 transition-colors flex-shrink-0"
          >
            <FileText className="h-5 w-5" />
            <span>View PDF</span>
          </a>
        ) : (
          <div className="h-16 w-24 rounded-lg border border-dashed border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-400 text-xs font-medium bg-white dark:bg-[#0a0a0a] flex-shrink-0">
            No PDF
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 h-9 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {value ? "Change PDF" : "Upload PDF"}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="p-2.5 rounded-lg border border-red-100 dark:border-red-950/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                title="Remove brochure"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400">Max size 15MB. PDF format only.</p>
        </div>
      </div>
    </div>
  )
}

export default function FranchiseSettings() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState("branding")

  useEffect(() => {
    adminAPI.getFranchiseSettings().then(r => { if (r?.data?.data) setSettings(r.data.data) })
      .catch(() => toast.error("Failed to load settings")).finally(() => setLoading(false))
  }, [])

  const update = (key, val) => setSettings(p => ({ ...p, [key]: val }))

  const save = async () => {
    // 1. Contact Number required check
    if (!settings.contactNumber || !settings.contactNumber.trim()) {
      toast.error("Contact Number is required")
      setTab("contact")
      return
    }

    // 2. Contact Number validation (must be exactly 10 digits)
    const cleanPhone = settings.contactNumber.replace(/\D/g, "")
    if (cleanPhone.length !== 10) {
      toast.error("Contact Number must be exactly 10 digits")
      setTab("contact")
      return
    }

    // 3. WhatsApp Number validation (optional, but must be exactly 10 digits if present)
    if (settings.whatsappNumber) {
      const cleanWA = settings.whatsappNumber.replace(/\D/g, "")
      if (cleanWA.length !== 10) {
        toast.error("WhatsApp Number must be exactly 10 digits")
        setTab("contact")
        return
      }
    }

    // 4. Email validation (optional, but must be valid if present)
    if (settings.contactEmail) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) {
        toast.error("Please enter a valid email address")
        setTab("contact")
        return
      }
    }

    setSaving(true)
    try {
      const payload = { ...settings }; delete payload._id; delete payload.__v; delete payload.createdAt; delete payload.updatedAt
      const res = await adminAPI.updateFranchiseSettings(payload)
      if (res?.data?.success) {
        toast.success("Settings saved!")
      } else {
        toast.error(res?.data?.message || "Failed to save")
      }
    } catch (err) {
      console.error("Save error:", err)
      toast.error(err?.response?.data?.message || err?.message || "Failed to save")
    }
    finally { setSaving(false) }
  }

  if (loading || !settings) return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: BRAND_RED }} /></div>

  const s = settings

  // Array helpers
  const addItem = (key, item) => update(key, [...(s[key] || []), { ...item, sortOrder: (s[key]?.length || 0) + 1 }])
  const removeItem = (key, i) => update(key, (s[key] || []).filter((_, idx) => idx !== i))
  const updateItem = (key, i, field, val) => { const arr = [...(s[key] || [])]; arr[i] = { ...arr[i], [field]: val }; update(key, arr) }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/food/franchise")} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex-1"><h1 className="text-xl font-bold text-gray-900 dark:text-white">Franchise Settings</h1><p className="text-xs text-gray-400">Manage franchise page content</p></div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-colors ${tab === t.key ? "text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"}`} style={tab === t.key ? { background: BRAND_RED } : {}}>
            <t.icon className="h-3.5 w-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl p-5 space-y-4">

        {tab === "branding" && <>
          <Field label="Brand Name" value={s.brandName} onChange={v => update("brandName", v)} />
          <Field label="Tagline" value={s.tagline} onChange={v => update("tagline", v)} />
          <ImageUploadField label="Logo" value={s.logoUrl} onChange={v => update("logoUrl", v)} />
        </>}

        {tab === "hero" && <>
          <Field label="Hero Title" value={s.heroTitle} onChange={v => update("heroTitle", v)} />
          <Field label="Hero Subtitle" value={s.heroSubtitle} onChange={v => update("heroSubtitle", v)} />
          <Field label="CTA Button Text" value={s.heroCTAText} onChange={v => update("heroCTAText", v)} />
          <ImageUploadField label="Background Image" value={s.heroBgImageUrl} onChange={v => update("heroBgImageUrl", v)} />
        </>}

        {tab === "whyChoose" && <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Feature Cards</p>
            <button onClick={() => addItem("whyChooseUs", { title: "", description: "", icon: "Star" })} className="text-xs font-bold flex items-center gap-1" style={{ color: BRAND_RED }}><Plus className="h-3.5 w-3.5" /> Add Card</button>
          </div>
          {(s.whyChooseUs || []).map((c, i) => (
            <div key={i} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
              <div className="flex-1 space-y-2">
                <input value={c.title || ""} onChange={e => updateItem("whyChooseUs", i, "title", e.target.value)} placeholder="Title" className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-sm outline-none" />
                <input value={c.description || ""} onChange={e => updateItem("whyChooseUs", i, "description", e.target.value)} placeholder="Description" className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-sm outline-none" />
                <input value={c.icon || ""} onChange={e => updateItem("whyChooseUs", i, "icon", e.target.value)} placeholder="Icon name (e.g. Star)" className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-xs outline-none" />
              </div>
              <button onClick={() => removeItem("whyChooseUs", i)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </>}

        {tab === "packages" && <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Package Categories</p>
            <button onClick={() => addItem("packages", { categoryName: "", icon: "Package", items: [] })} className="text-xs font-bold flex items-center gap-1" style={{ color: BRAND_RED }}><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
          {(s.packages || []).map((pkg, i) => (
            <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl space-y-2">
              <div className="flex gap-2">
                <input value={pkg.categoryName || ""} onChange={e => updateItem("packages", i, "categoryName", e.target.value)} placeholder="Category name" className="flex-1 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-sm outline-none" />
                <input value={pkg.icon || ""} onChange={e => updateItem("packages", i, "icon", e.target.value)} placeholder="Icon" className="w-24 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-xs outline-none" />
                <button onClick={() => removeItem("packages", i)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              </div>
              <textarea value={(pkg.items || []).join("\n")} onChange={e => updateItem("packages", i, "items", e.target.value.split("\n").filter(Boolean))} placeholder="One item per line" rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-xs outline-none resize-none" />
            </div>
          ))}
        </>}

        {tab === "timeline" && <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Timeline Steps</p>
            <button onClick={() => addItem("timelineSteps", { title: "", description: "" })} className="text-xs font-bold flex items-center gap-1" style={{ color: BRAND_RED }}><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
          {(s.timelineSteps || []).map((step, i) => (
            <div key={i} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
              <div className="flex-1 space-y-2">
                <input value={step.title || ""} onChange={e => updateItem("timelineSteps", i, "title", e.target.value)} placeholder="Step title" className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-sm outline-none" />
                <input value={step.description || ""} onChange={e => updateItem("timelineSteps", i, "description", e.target.value)} placeholder="Description" className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-sm outline-none" />
              </div>
              <button onClick={() => removeItem("timelineSteps", i)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </>}

        {tab === "investment" && <>
          <Field label="Investment Price" value={s.investmentPrice} onChange={v => update("investmentPrice", v)} placeholder="₹1,29,000" />
          <ImageUploadField label="Background Image" value={s.investmentBgImageUrl} onChange={v => update("investmentBgImageUrl", v)} />
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block">What's Included (one per line)</label>
            <textarea value={(s.investmentIncludes || []).join("\n")} onChange={e => update("investmentIncludes", e.target.value.split("\n").filter(Boolean))} rows={5} placeholder="Equipment&#10;Training&#10;Branding" className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-sm outline-none resize-none" />
          </div>
        </>}

        {tab === "gallery" && <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Gallery Images</p>
            <button onClick={() => addItem("galleryImages", { url: "", caption: "" })} className="text-xs font-bold flex items-center gap-1" style={{ color: BRAND_RED }}><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
          {(s.galleryImages || []).map((img, i) => (
            <GalleryItem
              key={i}
              img={img}
              onUpdate={(field, val) => updateItem("galleryImages", i, field, val)}
              onRemove={() => removeItem("galleryImages", i)}
            />
          ))}
        </>}

        {tab === "faq" && <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">FAQ Items</p>
            <button onClick={() => addItem("faqs", { question: "", answer: "" })} className="text-xs font-bold flex items-center gap-1" style={{ color: BRAND_RED }}><Plus className="h-3.5 w-3.5" /> Add</button>
          </div>
          {(s.faqs || []).map((faq, i) => (
            <div key={i} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
              <div className="flex-1 space-y-2">
                <input value={faq.question || ""} onChange={e => updateItem("faqs", i, "question", e.target.value)} placeholder="Question" className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-sm outline-none" />
                <textarea value={faq.answer || ""} onChange={e => updateItem("faqs", i, "answer", e.target.value)} placeholder="Answer" rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-xs outline-none resize-none" />
              </div>
              <button onClick={() => removeItem("faqs", i)} className="p-2 text-red-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </>}

        {tab === "form" && <>
          <Field label="Submit Button Text" value={s.formSettings?.buttonText} onChange={v => update("formSettings", { ...s.formSettings, buttonText: v })} />
          <p className="text-xs text-gray-400 mt-2">Field configuration is managed via the schema defaults. Contact dev team for changes.</p>
        </>}

        {tab === "contact" && <>
          <Field label="Contact Number" value={s.contactNumber} onChange={v => update("contactNumber", v.replace(/\D/g, ""))} required maxLength={10} />
          <Field label="WhatsApp Number" value={s.whatsappNumber} onChange={v => update("whatsappNumber", v.replace(/\D/g, ""))} maxLength={10} />
          <Field label="Email" value={s.contactEmail} onChange={v => update("contactEmail", v)} type="email" maxLength={100} />
          <PdfUploadField label="Brochure PDF" value={s.brochureUrl} onChange={v => update("brochureUrl", v)} />
        </>}
      </div>

      {/* Bottom Save */}
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="px-8 h-11 rounded-xl text-white font-bold flex items-center gap-2 disabled:opacity-50" style={{ background: BRAND_RED }}>
          {saving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-4 w-4" />} Save All Changes
        </button>
      </div>
    </div>
  )
}

function GalleryItem({ img, onUpdate, onRemove }) {
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const uploadRes = await uploadAPI.uploadMedia(file, { folder: "appzeto/franchise/gallery" })
      const payload = uploadRes?.data?.data || uploadRes?.data
      if (payload?.url) {
        onUpdate("url", payload.url)
        toast.success("Gallery image uploaded!")
      }
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800/30 rounded-xl items-center border border-gray-100 dark:border-gray-800/80">
      <div className="w-20 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center border border-gray-250">
        {img.url ? (
          <img src={img.url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Image className="h-5 w-5 text-gray-400" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-lg border border-gray-200 dark:border-gray-800 text-xs font-semibold bg-white dark:bg-[#0a0a0a] hover:bg-gray-50 text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {img.url ? "Change Image" : "Upload Image"}
          </button>
          {img.url && <span className="text-[10px] text-gray-400 truncate max-w-[120px]">{img.url.split("/").pop()}</span>}
        </div>
        <input value={img.caption || ""} onChange={e => onUpdate("caption", e.target.value)} placeholder="Caption (e.g. Dining Area)" className="w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-xs outline-none" />
      </div>
      <button onClick={onRemove} className="p-2 text-red-400 hover:text-red-600 flex-shrink-0"><Trash2 className="h-4 w-4" /></button>
    </div>
  )
}
