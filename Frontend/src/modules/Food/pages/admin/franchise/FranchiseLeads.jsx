import { useState, useEffect, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Filter, Phone, MessageCircle, Trash2, Eye, ChevronLeft, ChevronRight, Store, RefreshCw, X, User, Mail, MapPin, Briefcase, IndianRupee, Clock, Save } from "lucide-react"
import { toast } from "sonner"
import api from "@food/api"

const BRAND_RED = "#D51F10"
const STATUS_COLORS = {
  NEW: { bg: "bg-blue-100 dark:bg-blue-950/40", text: "text-blue-700 dark:text-blue-400" },
  CONTACTED: { bg: "bg-yellow-100 dark:bg-yellow-950/40", text: "text-yellow-700 dark:text-yellow-400" },
  FOLLOW_UP: { bg: "bg-orange-100 dark:bg-orange-950/40", text: "text-orange-700 dark:text-orange-400" },
  MEETING_SCHEDULED: { bg: "bg-purple-100 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-400" },
  PAYMENT_PENDING: { bg: "bg-cyan-100 dark:bg-cyan-950/40", text: "text-cyan-700 dark:text-cyan-400" },
  APPROVED: { bg: "bg-green-100 dark:bg-green-950/40", text: "text-green-700 dark:text-green-400" },
  REJECTED: { bg: "bg-red-100 dark:bg-red-950/40", text: "text-red-700 dark:text-red-400" },
}
const ALL_STATUSES = ["NEW", "CONTACTED", "FOLLOW_UP", "MEETING_SCHEDULED", "PAYMENT_PENDING", "APPROVED", "REJECTED"]

export default function FranchiseLeads() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 })

  // Modal states
  const [selectedLeadId, setSelectedLeadId] = useState(null)
  const [modalLead, setModalLead] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalStatus, setModalStatus] = useState("")
  const [modalRemarks, setModalRemarks] = useState("")
  const [modalSaving, setModalSaving] = useState(false)

  const fetchStats = useCallback(async () => {
    try { const r = await api.get("/food/admin/franchise/stats"); if (r?.data?.data) setStats(r.data.data) } catch {}
  }, [])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: 15 }
      if (statusFilter !== "ALL") params.status = statusFilter
      if (search.trim()) params.search = search.trim()
      const r = await api.get("/food/admin/franchise", { params })
      if (r?.data?.success) { setLeads(r.data.data || []); setPagination(r.data.pagination || {}) }
    } catch { toast.error("Failed to fetch leads") }
    finally { setLoading(false) }
  }, [page, statusFilter, search])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchLeads() }, [fetchLeads])

  // Fetch lead details for modal
  useEffect(() => {
    if (!selectedLeadId) {
      setModalLead(null)
      return
    }
    setModalLoading(true)
    api.get(`/food/admin/franchise/${selectedLeadId}`)
      .then(r => {
        if (r?.data?.data) {
          setModalLead(r.data.data)
          setModalStatus(r.data.data.status)
          setModalRemarks(r.data.data.remarks || "")
        }
      })
      .catch(() => {
        toast.error("Lead details could not be loaded")
        setSelectedLeadId(null)
      })
      .finally(() => setModalLoading(false))
  }, [selectedLeadId])

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/food/admin/franchise/${id}`, { status })
      toast.success(`Status updated to ${status}`)
      fetchLeads(); fetchStats()
    } catch { toast.error("Failed to update") }
  }

  const deleteLead = async (id) => {
    if (!confirm("Delete this lead permanently?")) return
    try { await api.delete(`/food/admin/franchise/${id}`); toast.success("Lead deleted"); fetchLeads(); fetchStats() }
    catch { toast.error("Failed to delete") }
  }

  const handleModalSave = async () => {
    if (!modalLead) return
    setModalSaving(true)
    try {
      await api.patch(`/food/admin/franchise/${modalLead._id}`, { status: modalStatus, remarks: modalRemarks })
      toast.success("Lead updated successfully")
      fetchLeads()
      fetchStats()
      setSelectedLeadId(null)
    } catch {
      toast.error("Failed to update lead")
    } finally {
      setModalSaving(false)
    }
  }

  const handleModalDelete = async () => {
    if (!modalLead) return
    if (!confirm("Delete this lead permanently?")) return
    try {
      await api.delete(`/food/admin/franchise/${modalLead._id}`)
      toast.success("Lead deleted")
      fetchLeads()
      fetchStats()
      setSelectedLeadId(null)
    } catch {
      toast.error("Failed to delete lead")
    }
  }

  const statCards = [
    { label: "Total", value: stats.total || 0, color: "#6b7280" },
    { label: "New", value: stats.new || 0, color: "#3b82f6" },
    { label: "Contacted", value: stats.contacted || 0, color: "#eab308" },
    { label: "Follow Up", value: stats.followUp || 0, color: "#f97316" },
    { label: "Meeting", value: stats.meetingScheduled || 0, color: "#a855f7" },
    { label: "Approved", value: stats.approved || 0, color: "#22c55e" },
    { label: "Rejected", value: stats.rejected || 0, color: "#ef4444" },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${BRAND_RED}15` }}>
            <Store className="h-5 w-5" style={{ color: BRAND_RED }} />
          </div>
          <div><h1 className="text-xl font-bold text-gray-900 dark:text-white">Franchise Leads</h1><p className="text-xs text-gray-500">Manage franchise applications</p></div>
        </div>
        <button onClick={() => { fetchLeads(); fetchStats() }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {statCards.map(s => (
          <div key={s.label} className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl p-3 text-center">
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search by name, phone, email, city..." className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-sm focus:ring-2 focus:ring-[#D51F10] outline-none" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }} className="h-10 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a1a1a] text-sm font-medium">
          <option value="ALL">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: BRAND_RED }} /></div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center text-gray-400"><Store className="h-12 w-12 mx-auto mb-2 opacity-30" /><p>No leads found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <th className="text-left p-3 font-bold text-gray-500 text-xs uppercase">Name</th>
                <th className="text-left p-3 font-bold text-gray-500 text-xs uppercase hidden sm:table-cell">Phone</th>
                <th className="text-left p-3 font-bold text-gray-500 text-xs uppercase hidden md:table-cell">City</th>
                <th className="text-left p-3 font-bold text-gray-500 text-xs uppercase hidden lg:table-cell">Budget</th>
                <th className="text-left p-3 font-bold text-gray-500 text-xs uppercase">Status</th>
                <th className="text-left p-3 font-bold text-gray-500 text-xs uppercase">Actions</th>
              </tr></thead>
              <tbody>
                {leads.map(lead => {
                  const sc = STATUS_COLORS[lead.status] || STATUS_COLORS.NEW
                  return (
                    <tr key={lead._id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                      <td className="p-3 max-w-[180px] md:max-w-[240px]">
                        <p className="font-bold text-gray-900 dark:text-white break-all whitespace-normal leading-tight">{lead.name}</p>
                        <p className="text-xs text-gray-400 sm:hidden">{lead.phone}</p>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-gray-600 dark:text-gray-400">{lead.phone}</td>
                      <td className="p-3 hidden md:table-cell text-gray-600 dark:text-gray-400">{lead.city}</td>
                      <td className="p-3 hidden lg:table-cell"><span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-xs font-bold">{lead.budget}</span></td>
                      <td className="p-3">
                        <select value={lead.status} onChange={e => updateStatus(lead._id, e.target.value)} className={`text-xs font-bold px-2 py-1 rounded-lg border-none outline-none cursor-pointer ${sc.bg} ${sc.text}`}>
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setSelectedLeadId(lead._id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="View"><Eye className="h-4 w-4 text-gray-500" /></button>
                          <a href={`https://wa.me/${lead.phone?.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="WhatsApp"><MessageCircle className="h-4 w-4 text-green-500" /></a>
                          <button onClick={() => deleteLead(lead._id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30" title="Delete"><Trash2 className="h-4 w-4 text-red-500" /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-400">Page {page} of {pagination.totalPages} ({pagination.total} total)</p>
            <div className="flex gap-1">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal Pop-up */}
      {selectedLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">Franchise Lead Details</h3>
                {modalLead && <p className="text-xs text-gray-400">Lead #{modalLead._id?.slice(-8)}</p>}
              </div>
              <button 
                onClick={() => setSelectedLeadId(null)} 
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {modalLoading ? (
                <div className="py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{ borderColor: BRAND_RED }} />
                </div>
              ) : modalLead ? (
                <>
                  {/* Contact Information */}
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Contact Information</h4>
                    
                    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                      <User className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: BRAND_RED }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Full Name</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{modalLead.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                      <Phone className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Phone</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{modalLead.phone}</p>
                      </div>
                    </div>

                    {modalLead.email && (
                      <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                        <Mail className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Email</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white break-all">{modalLead.email}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">City / State</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{modalLead.city}, {modalLead.state}</p>
                      </div>
                    </div>

                    {modalLead.preferredLocation && (
                      <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Preferred Location</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{modalLead.preferredLocation}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                      <IndianRupee className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: BRAND_RED }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Budget</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{modalLead.budget}</p>
                      </div>
                    </div>

                    {modalLead.occupation && (
                      <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                        <Briefcase className="h-4 w-4 mt-0.5 flex-shrink-0 text-neutral-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Occupation</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{modalLead.occupation}</p>
                        </div>
                      </div>
                    )}

                    {modalLead.experience && (
                      <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                        <Briefcase className="h-4 w-4 mt-0.5 flex-shrink-0 text-neutral-400" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Experience</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">{modalLead.experience}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-gray-800/50">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0 text-neutral-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Applied On</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {new Date(modalLead.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {modalLead.message && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 font-black mb-1">Message</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{modalLead.message}</p>
                    </div>
                  )}

                  {/* Status & Remarks Form */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Status & Remarks</h4>
                    <div>
                      <span className="text-xs font-bold text-gray-500 mb-1.5 block">Status</span>
                      <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg ${STATUS_COLORS[modalLead.status]?.bg || STATUS_COLORS.NEW.bg} ${STATUS_COLORS[modalLead.status]?.text || STATUS_COLORS.NEW.text}`}>
                        {modalLead.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500 mb-1.5 block">Remarks / Notes</label>
                      <textarea 
                        value={modalRemarks} 
                        onChange={e => setModalRemarks(e.target.value)} 
                        rows={3} 
                        placeholder="Add internal notes..." 
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0c0c0c] text-sm focus:ring-2 focus:ring-[#D51F10] outline-none resize-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-gray-400">Lead not found</div>
              )}
            </div>

            {/* Modal Footer */}
            {modalLead && !modalLoading && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30 rounded-b-2xl flex justify-end">
                <button 
                  onClick={handleModalSave} 
                  disabled={modalSaving} 
                  className="w-full sm:w-auto px-6 h-11 rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95" 
                  style={{ background: BRAND_RED }}
                >
                  {modalSaving ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save className="h-4 w-4" />} Save
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
