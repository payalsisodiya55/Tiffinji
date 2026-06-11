import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, Phone, MessageCircle, Mail, MapPin, Briefcase, IndianRupee, Save, Trash2, User, Clock } from "lucide-react"
import { toast } from "sonner"
import api from "@food/api"

const BRAND_RED = "#D51F10"
const ALL_STATUSES = ["NEW", "CONTACTED", "FOLLOW_UP", "MEETING_SCHEDULED", "PAYMENT_PENDING", "APPROVED", "REJECTED"]
const STATUS_COLORS = {
  NEW: "bg-blue-100 text-blue-700", CONTACTED: "bg-yellow-100 text-yellow-700", FOLLOW_UP: "bg-orange-100 text-orange-700",
  MEETING_SCHEDULED: "bg-purple-100 text-purple-700", PAYMENT_PENDING: "bg-cyan-100 text-cyan-700",
  APPROVED: "bg-green-100 text-green-700", REJECTED: "bg-red-100 text-red-700",
}

export default function FranchiseLeadDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lead, setLead] = useState(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState("")
  const [remarks, setRemarks] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get(`/food/admin/franchise/${id}`).then(r => {
      if (r?.data?.data) { setLead(r.data.data); setStatus(r.data.data.status); setRemarks(r.data.data.remarks || "") }
    }).catch(() => toast.error("Lead not found")).finally(() => setLoading(false))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.patch(`/food/admin/franchise/${id}`, { status, remarks })
      toast.success("Lead updated successfully")
    } catch { toast.error("Failed to update") }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this lead permanently?")) return
    try { await api.delete(`/food/admin/franchise/${id}`); toast.success("Lead deleted"); navigate("/admin/food/franchise") }
    catch { toast.error("Failed to delete") }
  }

  if (loading) return <div className="p-12 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: BRAND_RED }} /></div>
  if (!lead) return <div className="p-12 text-center text-gray-400">Lead not found</div>

  const InfoRow = ({ icon: Icon, label, value, color }) => value ? (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50 last:border-0">
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: color || "#9ca3af" }} />
      <div><p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{label}</p><p className="text-sm font-medium text-gray-900 dark:text-white">{value}</p></div>
    </div>
  ) : null

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/food/franchise")} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><ChevronLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{lead.name}</h1>
          <p className="text-xs text-gray-400">Lead #{lead._id?.slice(-8)}</p>
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${STATUS_COLORS[lead.status] || ""}`}>{lead.status?.replace(/_/g, " ")}</span>
      </div>

      {/* Contact Info */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Contact Information</h2>
        <InfoRow icon={User} label="Full Name" value={lead.name} color={BRAND_RED} />
        <InfoRow icon={Phone} label="Phone" value={lead.phone} color="#22c55e" />
        <InfoRow icon={Mail} label="Email" value={lead.email} color="#3b82f6" />
        <InfoRow icon={MapPin} label="City / State" value={`${lead.city}, ${lead.state}`} color="#f97316" />
        <InfoRow icon={MapPin} label="Preferred Location" value={lead.preferredLocation} color="#a855f7" />
        <InfoRow icon={IndianRupee} label="Budget" value={lead.budget} color={BRAND_RED} />
        <InfoRow icon={Briefcase} label="Occupation" value={lead.occupation} />
        <InfoRow icon={Briefcase} label="Experience" value={lead.experience} />
        <InfoRow icon={Clock} label="Applied On" value={new Date(lead.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} />
        {lead.message && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold mb-1">Message</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{lead.message}</p>
          </div>
        )}
      </div>

      {/* Status & Remarks */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Status & Remarks</h2>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-sm font-bold focus:ring-2 focus:ring-[#D51F10] outline-none">
            {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1.5 block">Remarks / Notes</label>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} placeholder="Add internal notes..." className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0a0a0a] text-sm focus:ring-2 focus:ring-[#D51F10] outline-none resize-none" />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleSave} disabled={saving} className="flex-1 sm:flex-none px-6 h-11 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: BRAND_RED }}>
          {saving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-4 w-4" />} Save
        </button>
        <a href={`https://wa.me/${lead.phone?.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="px-5 h-11 rounded-xl border border-gray-200 dark:border-gray-700 font-bold flex items-center gap-2 text-green-500 hover:bg-green-50 dark:hover:bg-green-950/20">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </a>
        <button onClick={handleDelete} className="px-5 h-11 rounded-xl border border-red-200 dark:border-red-800 font-bold flex items-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>
    </div>
  )
}
