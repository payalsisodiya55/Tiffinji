import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { MapPin, ArrowLeft, Search, Bike } from "lucide-react"
import { adminAPI } from "@food/api"
import { getGoogleMapsApiKey } from "@food/utils/googleMapsApiKey"
import { Loader } from "@googlemaps/js-api-loader"
import { subscribeDeliveryLocation } from "@food/realtimeTracking"
const debugLog = (...args) => console.log('[DeliveryBoyViewMap]', ...args)
const debugWarn = (...args) => console.warn('[DeliveryBoyViewMap]', ...args)
const debugError = (...args) => console.error('[DeliveryBoyViewMap]', ...args)


export default function DeliveryBoyViewMap() {
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const zonesPolygonsRef = useRef([])
  const infoWindowsRef = useRef([])
  const deliveryBoyMarkersRef = useRef([])
  const markersMapRef = useRef(new Map()) // Cache/Ref for active markers on map
  const rotatedIconCacheRef = useRef(new Map()) // Cache for rotated bike icons
  const directoryPartnersRef = useRef([])
  const latestRealtimeNodeRef = useRef({})
  const activeSubscriptionsRef = useRef(new Map()) // Maps deliveryId -> unsubscribe function
  const riderImageRef = useRef(null) // Pre-loaded rider image
  const hasFitBoundsRef = useRef(false)
  
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState("")
  const [mapLoading, setMapLoading] = useState(true)
  const [zones, setZones] = useState([])
  const [deliveryBoys, setDeliveryBoys] = useState([])
  const deliveryMetaByIdRef = useRef(new Map())
  const [loading, setLoading] = useState(true)
  const [locationSearch, setLocationSearch] = useState("")
  const autocompleteInputRef = useRef(null)
  const autocompleteRef = useRef(null)

  useEffect(() => {
    // Pre-load rider image for marker rendering
    const img = new Image()
    img.src = "/MapRider.png"
    img.onload = () => {
      debugLog("Image /MapRider.png loaded successfully")
      riderImageRef.current = img
      if (mapInstanceRef.current && window.google) {
        drawDeliveryBoyMarkers(window.google, mapInstanceRef.current).catch(err => {
          debugError("Error redrawing markers on image load:", err)
        })
      }
    }
    img.onerror = (e) => {
      debugError("Failed to load /MapRider.png image", e)
    }

    fetchZones()
    fetchDeliveryPartnerDirectory()
    loadGoogleMaps()

    // Periodically poll backend directory as a fallback for real-time updates when Firebase is blocked
    const pollInterval = setInterval(() => {
      fetchDeliveryPartnerDirectory()
    }, 10000)

    return () => {
      clearInterval(pollInterval)
      // Unsubscribe from all individual listeners
      activeSubscriptionsRef.current.forEach(unsub => {
        if (typeof unsub === "function") unsub()
      })
      activeSubscriptionsRef.current.clear()

      markersMapRef.current.forEach(item => {
        if (item.marker) item.marker.setMap(null)
      })
      markersMapRef.current.clear()
    }
  }, [])

  // Initialize Places Autocomplete when map is loaded
  useEffect(() => {
    if (!mapLoading && mapInstanceRef.current && autocompleteInputRef.current && window.google?.maps?.places && !autocompleteRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        componentRestrictions: { country: 'in' }
      })
      
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        if (place.geometry && place.geometry.location && mapInstanceRef.current) {
          const location = place.geometry.location
          mapInstanceRef.current.setCenter(location)
          mapInstanceRef.current.setZoom(12)
          setLocationSearch(place.formatted_address || place.name || "")
        }
      })
      
      autocompleteRef.current = autocomplete
    }
  }, [mapLoading])

  // Draw zones when map and zones are ready (bounds fit only once)
  useEffect(() => {
    if (!mapLoading && mapInstanceRef.current && window.google && zones.length > 0) {
      drawAllZonesOnMap(window.google, mapInstanceRef.current)
    }
  }, [zones, mapLoading])

  // Draw delivery boy markers when map and deliveryBoys are ready
  useEffect(() => {
    if (!mapLoading && mapInstanceRef.current && window.google) {
      drawDeliveryBoyMarkers(window.google, mapInstanceRef.current).catch(error => {
        debugError("Error drawing delivery boy markers:", error)
      })
    }
  }, [deliveryBoys, mapLoading])

  const getMergedDeliveryBoys = (realtimeNode) => {
    const nextMap = new Map()

    // 1. Populate from MongoDB directory partners
    const directoryList = directoryPartnersRef.current || []
    directoryList.forEach(boy => {
      const fullData = boy.fullData || boy
      const boyId = boy._id || boy.id || boy.deliveryId || fullData?._id || fullData?.id || fullData?.deliveryId
      if (!boyId) return

      const idString = String(boyId)
      const lat = Number(boy.lastLat ?? boy.location?.latitude ?? boy.location?.lat ?? fullData?.location?.latitude ?? fullData?.location?.lat ?? fullData?.lastLat)
      const lng = Number(boy.lastLng ?? boy.location?.longitude ?? boy.location?.lng ?? fullData?.location?.longitude ?? fullData?.location?.lng ?? fullData?.lastLng)

      const isOnlineStatus = boy.availabilityStatus === 'online' || fullData?.availabilityStatus === 'online'

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        nextMap.set(idString, {
          _id: idString,
          name: boy.name || fullData.name || "Delivery Partner",
          phone: boy.phone || fullData.phone || "N/A",
          availability: {
            isOnline: isOnlineStatus, // Fallback to backend online status
            currentLocation: {
              type: "Point",
              coordinates: [lng, lat],
              heading: 0,
              speed: 0,
              lastUpdate: boy.lastLocationAt ? new Date(boy.lastLocationAt).getTime() : null
            },
            lastLocationUpdate: boy.lastLocationAt ? new Date(boy.lastLocationAt).getTime() : null
          }
        })
      }
    })

    // 2. Overwrite / merge with real-time Firebase coordinates
    Object.entries(realtimeNode || {}).forEach(([deliveryId, payload]) => {
      const idString = String(deliveryId)
      const location = payload?.location || payload || {}
      const lat = Number(location?.lat ?? location?.latitude)
      const lng = Number(location?.lng ?? location?.longitude)
      
      const isOnline =
        location?.isOnline === true ||
        location?.status === "online" ||
        location?.status === "busy" ||
        payload?.isOnline === true ||
        payload?.status === "online" ||
        payload?.status === "busy"

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        const meta = deliveryMetaByIdRef.current.get(idString) || {}
        nextMap.set(idString, {
          _id: idString,
          name: meta.name || meta.fullName || "Delivery Partner",
          phone: meta.phone || "N/A",
          availability: {
            isOnline: Boolean(isOnline),
            currentLocation: {
              type: "Point",
              coordinates: [lng, lat],
              heading: Number(location?.heading ?? payload?.heading) || 0,
              speed: Number(location?.speed ?? payload?.speed) || 0,
              lastUpdate: Number(location?.timestamp || location?.last_updated || payload?.timestamp || payload?.last_updated) || Date.now()
            },
            lastLocationUpdate: Number(location?.timestamp || location?.last_updated || payload?.timestamp || payload?.last_updated) || Date.now()
          }
        })
      }
    })

    return Array.from(nextMap.values())
  }

  const fetchZones = async () => {
    try {
      setLoading(true)
      const response = await adminAPI.getZones({ limit: 1000 })
      if (response.data?.success && response.data.data?.zones) {
        setZones(response.data.data.zones)
      }
    } catch (error) {
      debugError("Error fetching zones:", error)
      setZones([])
    } finally {
      setLoading(false)
    }
  }

  const syncFirebaseSubscriptions = (partners) => {
    const currentIds = new Set(partners.map(p => {
      const pId = p._id || p.id || p.deliveryId || p.fullData?._id || p.fullData?.id
      return pId ? String(pId) : null
    }).filter(Boolean))

    // Unsubscribe from IDs no longer in list
    activeSubscriptionsRef.current.forEach((unsub, id) => {
      if (!currentIds.has(id)) {
        unsub()
        activeSubscriptionsRef.current.delete(id)
        
        const nextNode = { ...latestRealtimeNodeRef.current }
        delete nextNode[id]
        latestRealtimeNodeRef.current = nextNode
      }
    })

    // Subscribe to new IDs
    partners.forEach(partner => {
      const boyId = String(partner._id || partner.id || partner.deliveryId || partner.fullData?._id || partner.fullData?.id)
      if (!boyId || activeSubscriptionsRef.current.has(boyId)) return

      debugLog(`📡 Subscribing to location for delivery partner: ${boyId}`)
      
      const unsub = subscribeDeliveryLocation(
        boyId,
        (data) => {
          debugLog(`🔥 Firebase update for ${boyId}:`, JSON.stringify(data))
          
          latestRealtimeNodeRef.current = {
            ...latestRealtimeNodeRef.current,
            [boyId]: data
          }
          
          const merged = getMergedDeliveryBoys(latestRealtimeNodeRef.current)
          setDeliveryBoys(merged)
        },
        (error) => {
          const errStr = String(error?.message || error || "");
          if (errStr.includes("permission_denied") || errStr.includes("PERMISSION_DENIED")) {
            debugLog(`ℹ️ Firebase direct listener for ${boyId} restricted (permission_denied). Falling back to HTTP polling.`)
          } else {
            debugError(`🚨 Firebase listener for ${boyId} FAILED:`, error?.message || error)
          }
        }
      )

      activeSubscriptionsRef.current.set(boyId, unsub)
    })
  }

  const fetchDeliveryPartnerDirectory = async () => {
    try {
      const response = await adminAPI.getDeliveryPartners({
        limit: 1000,
        status: "approved",
        isActive: true,
        includeAvailability: false
      })

      if (response.data?.success && response.data.data?.deliveryPartners) {
        const nextMap = new Map()
        const partners = response.data.data.deliveryPartners || []
        directoryPartnersRef.current = partners
        
        debugLog('📋 API returned', partners.length, 'delivery partners')
        if (partners.length > 0) {
          debugLog('📋 Sample partner keys:', Object.keys(partners[0]))
          debugLog('📋 Sample partner data:', JSON.stringify(partners[0]).substring(0, 500))
        }

        partners.forEach((boy) => {
          const boyId =
            boy?._id ||
            boy?.id ||
            boy?.deliveryId ||
            boy?.fullData?._id ||
            boy?.fullData?.id

          if (!boyId) return

          nextMap.set(String(boyId), {
            name: boy?.name || boy?.fullData?.name || "Delivery Partner",
            fullName: boy?.fullName || boy?.fullData?.fullName || "",
            phone: boy?.phone || boy?.fullData?.phone || "N/A"
          })
        })
        deliveryMetaByIdRef.current = nextMap

        // Sync individual Firebase subscriptions
        syncFirebaseSubscriptions(partners)

        // Update list immediately when directory data returns
        const merged = getMergedDeliveryBoys(latestRealtimeNodeRef.current)
        debugLog('📋 After directory merge, delivery boys count:', merged.length)
        setDeliveryBoys(merged)
      }
    } catch (error) {
      debugError("Error fetching delivery partner directory:", error)
    }
  }
  const loadGoogleMaps = async () => {
    try {
      const apiKey = await getGoogleMapsApiKey()
      setGoogleMapsApiKey(apiKey || "loaded")
      
      if (window.google && window.google.maps) {
        initializeMap(window.google)
        return
      }

      if (apiKey) {
        const loader = new Loader({
          apiKey: apiKey,
          version: "weekly",
          libraries: ["places", "drawing", "geometry"]
        })

        const google = await loader.load()
        initializeMap(google)
      } else {
        setMapLoading(false)
      }
    } catch (error) {
      debugError("Error loading Google Maps:", error)
      setMapLoading(false)
    }
  }

  const initializeMap = (google) => {
    if (!mapRef.current) return

    const initialLocation = { lat: 20.5937, lng: 78.9629 }

    const g = google || window.google
    if (!g || !g.maps) {
      debugError("Google Maps object not found during initializeMap")
      return
    }

    const map = new g.maps.Map(mapRef.current, {
      center: initialLocation,
      zoom: 5,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: g.maps.MapTypeControlStyle?.HORIZONTAL_BAR || 1,
        position: g.maps.ControlPosition?.TOP_RIGHT || 2,
        mapTypeIds: [g.maps.MapTypeId?.ROADMAP || 'roadmap', g.maps.MapTypeId?.SATELLITE || 'satellite']
      },
      zoomControl: true,
      streetViewControl: false,
      fullscreenControl: true,
      scrollwheel: true,
      gestureHandling: 'greedy',
      disableDoubleClickZoom: false,
    })

    mapInstanceRef.current = map
    setMapLoading(false)
  }

  // Draw all zones on the map
  const drawAllZonesOnMap = (google, map) => {
    const g = google || window.google
    if (!g || !g.maps) return

    if (!zones || zones.length === 0) {
      zonesPolygonsRef.current.forEach(polygon => {
        if (polygon) polygon.setMap(null)
      })
      zonesPolygonsRef.current = []
      return
    }

    zonesPolygonsRef.current.forEach(polygon => {
      if (polygon) polygon.setMap(null)
    })
    zonesPolygonsRef.current = []

    infoWindowsRef.current.forEach(infoWindow => {
      if (infoWindow) infoWindow.close()
    })
    infoWindowsRef.current = []

    const colors = [
      "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
      "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
    ]

    const bounds = new g.maps.LatLngBounds()

    zones.forEach((zone, index) => {
      if (!zone.coordinates || zone.coordinates.length < 3) return

      const path = zone.coordinates.map(coord => {
        const lat = typeof coord === 'object' ? (coord.latitude || coord.lat) : null
        const lng = typeof coord === 'object' ? (coord.longitude || coord.lng) : null
        if (lat === null || lng === null) return null
        const latLng = new g.maps.LatLng(lat, lng)
        bounds.extend(latLng)
        return latLng
      }).filter(Boolean)

      if (path.length < 3) return

      const color = colors[index % colors.length]

      const polygon = new g.maps.Polygon({
        paths: path,
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.25,
        editable: false,
        draggable: false,
        clickable: true,
        zIndex: 1
      })

      polygon.setMap(map)
      zonesPolygonsRef.current.push(polygon)

      const infoWindow = new g.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">
              ${zone.name || 'Unnamed Zone'}
            </h3>
            <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
              <div style="margin-bottom: 4px;">
                <strong>Location:</strong> ${zone.serviceLocation || 'N/A'}
              </div>
              <div style="margin-bottom: 4px;">
                <strong>Unit:</strong> ${zone.unit || 'km'}
              </div>
              <div style="margin-bottom: 4px;">
                <strong>Points:</strong> ${zone.coordinates.length}
              </div>
              <div>
                <strong>Status:</strong> 
                <span style="color: ${zone.isActive ? '#10b981' : '#ef4444'}; font-weight: 600;">
                  ${zone.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        `
      })

      polygon.addListener('click', () => {
        infoWindowsRef.current.forEach(iw => {
          if (iw && iw !== infoWindow) iw.close()
        })
        infoWindow.setPosition(path[0])
        infoWindow.open(map)
        infoWindowsRef.current.push(infoWindow)
      })
    })

    if (zones.length > 0 && !hasFitBoundsRef.current) {
      map.fitBounds(bounds)
      const padding = { top: 50, right: 50, bottom: 50, left: 50 }
      map.fitBounds(bounds, padding)
      hasFitBoundsRef.current = true
    }
  }

  // Function to get rotated bike icon (similar to delivery app, using /MapRider.png via canvas)
  const getRotatedBikeIcon = (heading = 0, isOnline = true) => {
    const size = 60
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")

    if (!ctx) return ""

    ctx.clearRect(0, 0, size, size)

    if (riderImageRef.current) {
      ctx.save()
      ctx.translate(size / 2, size / 2)
      ctx.rotate((heading * Math.PI) / 180)
      
      try {
        if (!isOnline) {
          ctx.filter = "grayscale(100%) opacity(0.6)"
        }
      } catch (e) {
        // Fallback for browsers that don't support ctx.filter
      }

      ctx.drawImage(riderImageRef.current, -size / 2, -size / 2, size, size)
      ctx.restore()
    } else {
      // Fallback SVG representation until the image is fully loaded
      ctx.save()
      ctx.translate(size / 2, size / 2)
      ctx.rotate((heading * Math.PI) / 180)
      const strokeColor = isOnline ? "#ff8100" : "#94a3b8"
      const fillColor = isOnline ? "#ff8100" : "#94a3b8"
      const circleColor = isOnline ? "white" : "#f1f5f9"
      
      ctx.beginPath()
      ctx.arc(0, 0, 28, 0, 2 * Math.PI)
      ctx.fillStyle = circleColor
      ctx.fill()
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 4
      ctx.stroke()
      ctx.restore()
    }

    return canvas.toDataURL("image/png")
  }

  // Draw delivery boy markers (bikes) on the map
  const drawDeliveryBoyMarkers = async (google, map) => {
    const g = google || window.google
    if (!g || !g.maps) return

    debugLog('🎨 drawDeliveryBoyMarkers called with', deliveryBoys.length, 'boys')
    if (!deliveryBoys || deliveryBoys.length === 0) {
      deliveryBoyMarkersRef.current.forEach(marker => {
        if (marker) marker.setMap(null)
      })
      deliveryBoyMarkersRef.current = []
      markersMapRef.current.forEach(item => {
        if (item.marker) item.marker.setMap(null)
      })
      markersMapRef.current.clear()
      return
    }

    // Keep track of active boy IDs in this update
    const activeBoyIds = new Set()

    for (const boy of deliveryBoys) {
      const fullData = boy.fullData || boy
      const boyId = boy._id || boy.id || boy.deliveryId || fullData?._id || fullData?.id || fullData?.deliveryId
      
      if (!boyId) continue
      
      const idString = boyId.toString()
      activeBoyIds.add(idString)
      
      const availability = boy.availability || fullData?.availability
      const currentLocation = availability?.currentLocation
      
      if (!currentLocation?.coordinates) continue

      const coords = currentLocation.coordinates
      let lat, lng
      if (Array.isArray(coords) && coords.length >= 2) {
        if (coords[0] > -180 && coords[0] < 180 && coords[1] > -90 && coords[1] < 90) {
          lng = coords[0]
          lat = coords[1]
        } else {
          lat = coords[0]
          lng = coords[1]
        }
      } else {
        continue
      }

      if (!lat || !lng || isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue

      const heading = currentLocation.heading || 0
      const isOnline = availability?.isOnline !== false
      const boyName = fullData.name || "Delivery Partner"
      const boyPhone = fullData.phone || "N/A"
      const lastUpdate = availability?.lastLocationUpdate || currentLocation?.lastUpdate

      const existing = markersMapRef.current.get(idString)
      const latLng = new g.maps.LatLng(lat, lng)

      if (existing) {
        // Update position if it changed
        const currentPos = existing.marker.getPosition()
        if (!currentPos || currentPos.lat() !== lat || currentPos.lng() !== lng) {
          existing.marker.setPosition(latLng)
        }

        // Update icon if heading or status changed
        if (existing.heading !== heading || existing.isOnline !== isOnline) {
          const rotatedIconUrl = getRotatedBikeIcon(heading, isOnline)
          existing.marker.setIcon({
            url: rotatedIconUrl,
            scaledSize: new g.maps.Size(60, 60),
            anchor: new g.maps.Point(30, 30)
          })
          existing.heading = heading
          existing.isOnline = isOnline
        }

        // Update InfoWindow content
        const newContent = `
          <div style="padding: 12px; min-width: 200px; font-family: sans-serif;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">
              ${boyName}
            </h3>
            <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
              <div style="margin-bottom: 4px;">
                <strong>Phone:</strong> ${boyPhone}
              </div>
              <div style="margin-bottom: 4px;">
                <strong>Status:</strong> 
                <span style="color: ${isOnline ? '#10b981' : '#ef4444'}; font-weight: 600;">
                  ${isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              ${lastUpdate ? `
                <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">
                  Last updated: ${new Date(lastUpdate).toLocaleTimeString()}
                </div>
              ` : ''}
            </div>
          </div>
        `
        existing.infoWindow.setContent(newContent)
      } else {
        // Create new marker
        const rotatedIconUrl = getRotatedBikeIcon(heading, isOnline)
        const marker = new g.maps.Marker({
          position: latLng,
          map: map,
          icon: {
            url: rotatedIconUrl,
            scaledSize: new g.maps.Size(60, 60),
            anchor: new g.maps.Point(30, 30)
          },
          title: boyName,
          zIndex: 1000
        })

        const infoWindow = new g.maps.InfoWindow({
          content: `
            <div style="padding: 12px; min-width: 200px; font-family: sans-serif;">
              <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1e293b;">
                ${boyName}
              </h3>
              <div style="font-size: 13px; color: #64748b; line-height: 1.6;">
                <div style="margin-bottom: 4px;">
                  <strong>Phone:</strong> ${boyPhone}
                </div>
                <div style="margin-bottom: 4px;">
                  <strong>Status:</strong> 
                  <span style="color: ${isOnline ? '#10b981' : '#ef4444'}; font-weight: 600;">
                    ${isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                ${lastUpdate ? `
                  <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">
                    Last updated: ${new Date(lastUpdate).toLocaleTimeString()}
                  </div>
                ` : ''}
              </div>
            </div>
          `
        })

        marker.addListener('click', () => {
          infoWindowsRef.current.forEach(iw => {
            if (iw && iw !== infoWindow) iw.close()
          })
          infoWindow.open(map, marker)
          infoWindowsRef.current.push(infoWindow)
        })

        markersMapRef.current.set(idString, {
          marker,
          infoWindow,
          heading,
          isOnline
        })
      }
    }

    // Clean up markers for delivery boys who are no longer active/in the list
    markersMapRef.current.forEach((value, key) => {
      if (!activeBoyIds.has(key)) {
        value.marker.setMap(null)
        markersMapRef.current.delete(key)
      }
    })
  }

  const onlineCount = deliveryBoys.filter(b => b.availability?.isOnline).length
  const offlineCount = deliveryBoys.length - onlineCount

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="p-4 lg:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/admin/food/zone-setup")}
            className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Delivery Boy View</h1>
              <p className="text-sm text-slate-600">View zones and online delivery boys on map</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              ref={autocompleteInputRef}
              type="text"
              placeholder="Search location on map..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
          <div className="relative" style={{ height: "calc(100vh - 250px)", minHeight: "600px" }}>
            <div ref={mapRef} className="w-full h-full rounded-lg" />
            
            {mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading map...</p>
                </div>
              </div>
            )}

            {loading && !mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading data...</p>
                </div>
              </div>
            )}

            {!googleMapsApiKey && !mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
                <div className="text-center p-6">
                  <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-sm text-slate-600">Google Maps API key not found</p>
                </div>
              </div>
            )}

            {!loading && !mapLoading && zones.length === 0 && deliveryBoys.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-100 rounded-lg">
                <div className="text-center p-6">
                  <MapPin className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-sm text-slate-600">No zones or delivery boys found</p>
                </div>
              </div>
            )}
          </div>

          {/* Legend */}
          {!mapLoading && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Map Information</h3>
              <div className="text-xs text-slate-600 space-y-1">
                {zones.length > 0 && (
                  <p>
                    Click on any <span className="font-semibold text-blue-600">zone</span> on the map to view details. Total zones: <strong>{zones.length}</strong>
                  </p>
                )}
                {deliveryBoys.length > 0 && (
                  <p>
                    Click on any <span className="font-semibold text-slate-800">bike icon</span> to view delivery boy details. Online: <strong>{onlineCount}</strong> | Offline: <strong>{offlineCount}</strong>
                  </p>
                )}
                {deliveryBoys.length === 0 && (
                  <p className="text-amber-600">
                    No active or registered delivery boys found on map.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



