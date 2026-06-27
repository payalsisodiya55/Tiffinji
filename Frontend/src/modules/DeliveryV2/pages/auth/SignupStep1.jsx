import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import useDeliveryBackNavigation from "../../hooks/useDeliveryBackNavigation"
import { EMAIL_REGEX } from "@/shared/utils/emailValidation"
const debugLog = (...args) => {}
const debugWarn = (...args) => {}
const debugError = (...args) => {}


export default function SignupStep1() {
  const navigate = useNavigate()
  const goBack = useDeliveryBackNavigation()
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem("deliverySignupDetails")
    const base = {
      name: "",
      phone: "",
      countryCode: "+91",
      ref: "",
      email: "",
      address: "",
      city: "",
      state: "",
      vehicleType: "bike",
      vehicleName: "",
      vehicleNumber: "",
      drivingLicenseNumber: "",
      panNumber: "",
      aadharNumber: ""
    }
    if (saved) {
      try {
        return { ...base, ...JSON.parse(saved) }
      } catch (e) {
        debugError("Error parsing saved details:", e)
      }
    }
    return base
  })
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sanitizeLocationValue = (value) =>
    value.replace(/[^A-Za-z\s.-]/g, "").replace(/\s{2,}/g, " ")

  const sanitizeNameValue = (value) =>
    value.replace(/[^A-Za-z\s]/g, "").replace(/\s{2,}/g, " ")

  const isValidLocationValue = (value) =>
    /^[A-Za-z][A-Za-z\s.-]*[A-Za-z.]$/.test(value.trim())

  const isValidNameValue = (value) =>
    /^[A-Za-z][A-Za-z\s]*[A-Za-z]$/.test(value.trim())

  const isValidEmailValue = (value) => {
    const normalizedValue = value.trim()
    return EMAIL_REGEX.test(normalizedValue)
  }

  const sanitizeEmailValue = (value) =>
    value.replace(/\s/g, "").toLowerCase()

  const validateDrivingLicense = (val) => {
    if (!val.trim()) return "Driving license number is required"
    if (!/^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/.test(val)) {
      return "Invalid DL format (e.g., MH1220110012345)"
    }
    return ""
  }

  const validatePAN = (val) => {
    if (!val.trim()) return "PAN number is required"
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val)) {
      return "Invalid PAN format (e.g., ABCDE1234F)"
    }
    return ""
  }

  const validateAadhar = (val) => {
    if (!val.trim()) return "Aadhar number is required"
    if (!/^\d{12}$/.test(val.replace(/\s/g, ""))) {
      return "Aadhar number must be 12 digits"
    }
    return ""
  }

  // Save data to session storage whenever formData changes
  useEffect(() => {
    sessionStorage.setItem("deliverySignupDetails", JSON.stringify(formData))
  }, [formData])

  const handleBlur = (e) => {
    const { name, value } = e.target
    if (formData.vehicleType === "bicycle" && (name === "drivingLicenseNumber" || name === "vehicleNumber" || name === "vehicleName")) {
      return
    }

    let errorMsg = ""
    if (name === "drivingLicenseNumber") {
      errorMsg = validateDrivingLicense(value)
    } else if (name === "panNumber") {
      errorMsg = validatePAN(value)
    } else if (name === "aadharNumber") {
      errorMsg = validateAadhar(value)
    } else if (name === "vehicleNumber") {
      if (!value.trim()) {
        errorMsg = "Vehicle number is required"
      } else if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/.test(value)) {
        errorMsg = "Invalid Indian vehicle number format (e.g., MH12AB1234)"
      }
    } else if (name === "name") {
      if (!value.trim()) {
        errorMsg = "Name is required"
      } else if (!isValidNameValue(value)) {
        errorMsg = "Name can contain letters only"
      }
    } else if (name === "email") {
      if (!value.trim()) {
        errorMsg = "Email is required"
      } else if (!isValidEmailValue(value)) {
        errorMsg = "Please enter a valid email address (e.g., aaa@gmail.com)"
      }
    } else if (name === "address") {
      if (!value.trim()) {
        errorMsg = "Address is required"
      }
    } else if (name === "city") {
      if (!value.trim()) {
        errorMsg = "City is required"
      } else if (!isValidLocationValue(value)) {
        errorMsg = "City can contain letters only"
      }
    } else if (name === "state") {
      if (!value.trim()) {
        errorMsg = "State is required"
      } else if (!isValidLocationValue(value)) {
        errorMsg = "State can contain letters only"
      }
    }

    setErrors(prev => ({
      ...prev,
      [name]: errorMsg
    }))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    let updatedValue = value

    // Auto-uppercase for Vehicle, DL and PAN numbers
    if (name === "vehicleNumber" || name === "panNumber" || name === "drivingLicenseNumber") {
      updatedValue = value.toUpperCase()
    }

    if (name === "name") {
      updatedValue = sanitizeNameValue(value)
    }

    if (name === "vehicleNumber") {
      updatedValue = updatedValue.slice(0, 10)
    }

    if (name === "drivingLicenseNumber") {
      updatedValue = updatedValue.replace(/[^A-Z0-9]/g, "").slice(0, 15)
    }

    if (name === "panNumber") {
      updatedValue = updatedValue.replace(/[^A-Z0-9]/g, "").slice(0, 10)
    }

    // Restrict Aadhaar to numeric only
    if (name === "aadharNumber") {
      updatedValue = value.replace(/\D/g, "").slice(0, 12)
    }

    if (name === "city" || name === "state") {
      updatedValue = sanitizeLocationValue(value)
    }

    if (name === "email") {
      updatedValue = sanitizeEmailValue(value)
      // Real-time validation for email
      if (updatedValue && !isValidEmailValue(updatedValue)) {
        setErrors(prev => ({ ...prev, email: "Please enter a valid email address (e.g., aaa@gmail.com)" }))
      } else if (!updatedValue) {
        setErrors(prev => ({ ...prev, email: "Email is required" }))
      } else {
        setErrors(prev => ({ ...prev, email: "" }))
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: updatedValue
    }))

    // Reset vehicle fields if bicycle is selected
    if (name === "vehicleType" && updatedValue === "bicycle") {
      setFormData(prev => ({
        ...prev,
        vehicleType: "bicycle",
        vehicleName: "",
        vehicleNumber: "",
        drivingLicenseNumber: ""
      }))
      setErrors(prev => {
        const next = { ...prev }
        delete next.vehicleNumber
        delete next.drivingLicenseNumber
        return next
      })
    }

    // Real-time validation if error already exists or if it's a field we want to keep clean
    if (errors[name]) {
      let errorMsg = ""
      if (name === "drivingLicenseNumber") {
        errorMsg = validateDrivingLicense(updatedValue)
      } else if (name === "panNumber") {
        errorMsg = validatePAN(updatedValue)
      } else if (name === "aadharNumber") {
        errorMsg = validateAadhar(updatedValue)
      } else if (name === "vehicleNumber") {
        if (!updatedValue.trim()) {
          errorMsg = "Vehicle number is required"
        } else if (/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/.test(updatedValue)) {
          errorMsg = ""
        } else {
          errorMsg = "Invalid Indian vehicle number format (e.g., MH12AB1234)"
        }
      } else if (name === "name") {
        if (!updatedValue.trim()) {
          errorMsg = "Name is required"
        } else if (isValidNameValue(updatedValue)) {
          errorMsg = ""
        } else {
          errorMsg = "Name can contain letters only"
        }
      } else if (name === "city") {
        if (!updatedValue.trim()) {
          errorMsg = "City is required"
        } else if (isValidLocationValue(updatedValue)) {
          errorMsg = ""
        } else {
          errorMsg = "City can contain letters only"
        }
      } else if (name === "state") {
        if (!updatedValue.trim()) {
          errorMsg = "State is required"
        } else if (isValidLocationValue(updatedValue)) {
          errorMsg = ""
        } else {
          errorMsg = "State can contain letters only"
        }
      }

      setErrors(prev => ({
        ...prev,
        [name]: errorMsg
      }))
    } else {
      if (name !== "email" && name !== "vehicleType") {
        setErrors(prev => ({
          ...prev,
          [name]: ""
        }))
      }
    }
  }

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    } else if (!isValidNameValue(formData.name)) {
      newErrors.name = "Name can contain letters only"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!isValidEmailValue(formData.email)) {
      newErrors.email = "Please enter a valid email address (e.g., aaa@gmail.com)"
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required"
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required"
    } else if (!isValidLocationValue(formData.city)) {
      newErrors.city = "City can contain letters only"
    }

    if (!formData.state.trim()) {
      newErrors.state = "State is required"
    } else if (!isValidLocationValue(formData.state)) {
      newErrors.state = "State can contain letters only"
    }

    if (formData.vehicleType !== "bicycle") {
      if (!formData.vehicleNumber.trim()) {
        newErrors.vehicleNumber = "Vehicle number is required"
      } else if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4}$/.test(formData.vehicleNumber)) {
        newErrors.vehicleNumber = "Invalid Indian vehicle number format (e.g., MH12AB1234)"
      }

      if (!formData.drivingLicenseNumber.trim()) {
        newErrors.drivingLicenseNumber = "Driving license number is required"
      } else if (!/^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/.test(formData.drivingLicenseNumber)) {
        newErrors.drivingLicenseNumber = "Invalid DL format (e.g., MH1220110012345)"
      }
    }

    const panErr = validatePAN(formData.panNumber)
    if (panErr) newErrors.panNumber = panErr

    const aadharErr = validateAadhar(formData.aadharNumber)
    if (aadharErr) newErrors.aadharNumber = aadharErr

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      toast.error("Please fill all required fields correctly")
      return
    }

    setIsSubmitting(true)

    try {
      const details = {
        name: formData.name.trim(),
        phone: String(formData.phone || "").replace(/\D/g, "").slice(0, 15),
        countryCode: formData.countryCode || "+91",
        ref: String(formData.ref || "").trim() || "",
        email: formData.email?.trim() || "",
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        vehicleType: formData.vehicleType || "bike",
        vehicleName: formData.vehicleType === "bicycle" ? "" : (formData.vehicleName?.trim() || ""),
        vehicleNumber: formData.vehicleType === "bicycle" ? "" : formData.vehicleNumber.trim(),
        drivingLicenseNumber: formData.vehicleType === "bicycle" ? "" : formData.drivingLicenseNumber.trim().toUpperCase(),
        panNumber: formData.panNumber.trim().toUpperCase(),
        aadharNumber: formData.aadharNumber.replace(/\s/g, "")
      }
      sessionStorage.setItem("deliverySignupDetails", JSON.stringify(details))
      toast.success("Details saved")
      navigate("/food/delivery/signup/documents")
    } catch (error) {
      debugError("Error saving details:", error)
      toast.error("Failed to save. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-white px-4 py-3 flex items-center gap-4 border-b border-gray-200 shadow-sm">
        <button
          onClick={goBack}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-medium">Complete Your Profile</h1>
      </div>

      {/* Content */}
      <div className="px-4 pt-20 pb-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Basic Details</h2>
          <p className="text-sm text-gray-600">Please provide your information to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              onBlur={handleBlur}
              inputMode="text"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.name ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              inputMode="email"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.email ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Enter your email"
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={3}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.address ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="Enter your address"
            />
            {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
          </div>

          {/* City and State */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.city ? "border-red-500" : "border-gray-300"
                  }`}
                placeholder="City"
              />
              {errors.city && <p className="text-red-500 text-sm mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.state ? "border-red-500" : "border-gray-300"
                  }`}
                placeholder="State"
              />
              {errors.state && <p className="text-red-500 text-sm mt-1">{errors.state}</p>}
            </div>
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vehicle Type <span className="text-red-500">*</span>
            </label>
            <select
              name="vehicleType"
              value={formData.vehicleType}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="bike">Bike</option>
              <option value="scooter">Scooter</option>
              <option value="bicycle">Bicycle</option>
              <option value="car">Car</option>
            </select>
          </div>

          {formData.vehicleType !== "bicycle" && (
            <>
              {/* Vehicle Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Name/Model (Optional)
                </label>
                <input
                  type="text"
                  name="vehicleName"
                  value={formData.vehicleName}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., Honda Activa"
                />
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={10}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.vehicleNumber ? "border-red-500" : "border-gray-300"
                    }`}
                  placeholder="e.g., MH12AB1234"
                />
                {errors.vehicleNumber && <p className="text-red-500 text-sm mt-1">{errors.vehicleNumber}</p>}
              </div>

              {/* Driving License Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Driving License Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="drivingLicenseNumber"
                  value={formData.drivingLicenseNumber}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  maxLength={15}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 uppercase ${errors.drivingLicenseNumber ? "border-red-500" : "border-gray-300"
                    }`}
                  placeholder="e.g., MH1220110012345"
                />
                {errors.drivingLicenseNumber && <p className="text-red-500 text-sm mt-1">{errors.drivingLicenseNumber}</p>}
              </div>
            </>
          )}

          {/* PAN Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PAN Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="panNumber"
              value={formData.panNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={10}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 uppercase ${errors.panNumber ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="ABCDE1234F"
            />
            {errors.panNumber && <p className="text-red-500 text-sm mt-1">{errors.panNumber}</p>}
          </div>

          {/* Aadhar Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aadhar Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="aadharNumber"
              value={formData.aadharNumber}
              onChange={handleChange}
              onBlur={handleBlur}
              maxLength={12}
              inputMode="numeric"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${errors.aadharNumber ? "border-red-500" : "border-gray-300"
                }`}
              placeholder="123456789012"
            />
            {errors.aadharNumber && <p className="text-red-500 text-sm mt-1">{errors.aadharNumber}</p>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !formData.email || !isValidEmailValue(formData.email) || Object.values(errors).some(error => error !== "")}
            className={`w-full py-4 rounded-lg font-bold text-white text-base transition-colors mt-6 ${isSubmitting || !formData.email || !isValidEmailValue(formData.email) || Object.values(errors).some(error => error !== "")
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#00B761] hover:bg-[#00A055]"
              }`}
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  )
}


