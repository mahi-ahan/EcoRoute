import React, { useEffect, useRef, useState, FormEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { WasteReport } from "../types";
import { Settings, Info, Navigation, Search, Loader2 } from "lucide-react";

interface ReportMapProps {
  reports: WasteReport[];
  selectedReportId?: string | null;
  onMapClick?: (lat: number, lng: number) => void;
  newReportCoords?: { lat: number; lng: number } | null;
  readOnly?: boolean;
}

// Fix Leaflet marker icons in React bundling environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function ReportMap({
  reports,
  selectedReportId,
  onMapClick,
  newReportCoords,
  readOnly = false,
}: ReportMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const newMarkerRef = useRef<L.Marker | null>(null);

  // Address search query state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center SF
    const defaultCenter: [number, number] = [37.7749, -122.4194];
    const defaultZoom = 13;

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Elegant, highly detailed OpenStreetMap tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Map click handler for pinning
    if (!readOnly && onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onMapClick(lat, lng);
      });
    }

    mapRef.current = map;

    // Trigger standard Leaflet size adjustment after container mount
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (e) {
          console.error("Error removing map instance:", e);
        }
        mapRef.current = null;
      }
      markersRef.current = {};
      newMarkerRef.current = null;
    };
  }, [readOnly, onMapClick]);

  // Handle ResizeObserver to automatically adjust leaflet map canvas
  useEffect(() => {
    if (!mapRef.current || !mapContainerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(mapContainerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Sync / Render Active reported issue markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove all existing markers
    Object.keys(markersRef.current).forEach((id) => {
      try {
        if (markersRef.current[id]) {
          map.removeLayer(markersRef.current[id]);
        }
      } catch (e) {
        console.warn("Soft handling: Leaflet marker remove error:", e);
      }
    });
    markersRef.current = {};

    // Add current reports markers
    reports.forEach((report) => {
      if (!report.location || typeof report.location.lat !== "number" || typeof report.location.lng !== "number") return;

      const { lat, lng } = report.location;

      // Severity colors
      let color = "#22c55e"; // green
      if (report.severity === "Critical") color = "#ef4444"; // red
      else if (report.severity === "High") color = "#f97316"; // orange
      else if (report.severity === "Medium") color = "#eab308"; // yellow

      // Create a beautiful custom SVG pin icon
      const customHtmlIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            ${report.id === selectedReportId ? `<span style="position: absolute; display: inline-flex; height: 40px; width: 40px; border-radius: 50%; opacity: 0.45; background-color: ${color}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>` : ""}
            <div style="position: relative; display: flex; height: 32px; width: 32px; align-items: center; justify-content: center; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); background-color: ${color}; transform: scale(${report.id === selectedReportId ? "1.15" : "1"}); transition: transform 0.2s;">
              <svg xmlns="http://www.w3.org/2000/svg" style="height: 16px; width: 16px; color: white;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18],
      });

      try {
        // Create new marker
        const marker = L.marker([lat, lng], { icon: customHtmlIcon }).addTo(map);

        // Bind interactive popup details
        const badgeClass =
          report.severity === "Critical"
            ? "bg-rose-100 text-rose-800"
            : report.severity === "High"
            ? "bg-orange-100 text-orange-800"
            : report.severity === "Medium"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-emerald-100 text-emerald-800";

        const popupHtml = `
          <div style="font-family: sans-serif; padding: 4px; max-width: 180px;">
            <div style="font-weight: 700; color: #1e293b; font-size: 13px; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${report.wasteType}</div>
            <div style="display: flex; gap: 4px; align-items: center; margin-bottom: 6px;">
              <span class="${badgeClass}" style="font-size: 9px; font-weight: 700; padding: 1px 6px; border-radius: 9999px;">
                ${report.severity}
              </span>
              <span style="font-size: 9px; font-weight: 600; color: #64748b; background-color: #f1f5f9; padding: 1px 4px; border-radius: 4px;">
                ${report.status}
              </span>
            </div>
            ${
              report.imageUrl
                ? `<img src="${report.imageUrl}" alt="${report.wasteType}" style="width: 100%; height: 75px; object-fit: cover; border-radius: 6px; margin-bottom: 6px; border: 1px solid #f1f5f9;" />`
                : ""
            }
            <p style="font-size: 10px; color: #475569; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">${
              report.description || "Community waste report."
            }</p>
            <div style="font-size: 9px; color: #94a3b8; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Loc: ${
              report.location.address || "Community Coordinates"
            }</div>
          </div>
        `;

        marker.bindPopup(popupHtml, {
          closeButton: true,
          className: "custom-leaflet-popup",
        });

        // Click interaction
        marker.on("click", () => {
          try {
            marker.openPopup();
          } catch (e) {
            console.warn("Soft handling: openPopup click error:", e);
          }
        });

        markersRef.current[report.id] = marker;
      } catch (e) {
        console.warn("Soft handling: Leaflet add marker error:", e);
      }
    });

    return () => {
      Object.keys(markersRef.current).forEach((id) => {
        try {
          if (markersRef.current[id] && mapRef.current) {
            mapRef.current.removeLayer(markersRef.current[id]);
          }
        } catch (e) {
          console.warn("Soft handling: Leaflet marker remove error in cleanup:", e);
        }
      });
      markersRef.current = {};
    };
  }, [reports, selectedReportId]);

  // Sync / Render New report location pin placement
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (newReportCoords) {
      const { lat, lng } = newReportCoords;

      const newHtmlIcon = L.divIcon({
        className: "new-report-pin",
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
            <span style="position: absolute; display: inline-flex; height: 44px; width: 44px; border-radius: 50%; background-color: #10b981; opacity: 0.55; animation: ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
            <div style="position: relative; display: flex; height: 34px; width: 34px; align-items: center; justify-content: center; border-radius: 50%; background-color: #059669; border: 2px solid white; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);">
              <svg xmlns="http://www.w3.org/2000/svg" style="height: 18px; width: 18px; color: white;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      if (newMarkerRef.current) {
        try {
          newMarkerRef.current.setLatLng([lat, lng]);
        } catch (e) {
          console.warn("Soft handling: Leaflet update newMarker error:", e);
        }
      } else {
        try {
          newMarkerRef.current = L.marker([lat, lng], { icon: newHtmlIcon }).addTo(map);
        } catch (e) {
          console.warn("Soft handling: Leaflet add newMarker error:", e);
        }
      }

      // Smooth fly to new coordinate
      try {
        map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
      } catch (e) {
        console.warn("Soft handling: map flyTo error:", e);
      }
    } else {
      if (newMarkerRef.current) {
        try {
          map.removeLayer(newMarkerRef.current);
        } catch (e) {
          console.warn("Soft handling: Leaflet remove newMarker error:", e);
        }
        newMarkerRef.current = null;
      }
    }

    return () => {
      if (newMarkerRef.current && mapRef.current) {
        try {
          mapRef.current.removeLayer(newMarkerRef.current);
        } catch (e) {
          console.warn("Soft handling: cleanup remove newMarker error:", e);
        }
        newMarkerRef.current = null;
      }
    };
  }, [newReportCoords]);


  // Handle selected report programmatic panning
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedReportId || newReportCoords) return;

    const selectedReport = reports.find((r) => r.id === selectedReportId);
    if (selectedReport && selectedReport.location) {
      const { lat, lng } = selectedReport.location;
      try {
        map.flyTo([lat, lng], 16, { animate: true, duration: 1.2 });
      } catch (e) {
        console.warn("Soft handling: flyTo error:", e);
      }

      // Automatically open the corresponding marker popup
      const marker = markersRef.current[selectedReportId];
      if (marker) {
        setTimeout(() => {
          try {
            marker.openPopup();
          } catch (e) {
            console.warn("Soft handling: openPopup timeout error:", e);
          }
        }, 1200);
      }
    }
  }, [selectedReportId, reports, newReportCoords]);

  // Free OpenStreetMap Forward Geocoder
  const handleAddressSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapRef.current) return;

    setSearching(true);
    setSearchError(null);

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      searchQuery
    )}&limit=1`;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "EcoRouteWasteReportingPortal/1.0",
        },
      });
      if (!res.ok) throw new Error("Search service error");
      const results = await res.json();

      if (results && results.length > 0) {
        const { lat, lon, display_name } = results[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);

        // Center map to searched location
        try {
          mapRef.current.flyTo([latitude, longitude], 15, { animate: true, duration: 1.5 });
        } catch (e) {
          console.warn("Soft handling: search flyTo error:", e);
        }

        // Trigger parent callback to pin selection if interactive
        if (!readOnly && onMapClick) {
          onMapClick(latitude, longitude);
        }

        setSearchQuery("");
      } else {
        setSearchError("No location found matching that address. Try adding city/state.");
      }
    } catch (err) {
      console.error("Geocoding search error:", err);
      setSearchError("Failed to look up address. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  // Geolocate user's current location free
  const handleGeolocate = () => {
    if (!mapRef.current) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          mapRef.current?.flyTo([latitude, longitude], 16, { animate: true, duration: 1.5 });
        } catch (e) {
          console.warn("Soft handling: geolocate flyTo error:", e);
        }

        if (!readOnly && onMapClick) {
          onMapClick(latitude, longitude);
        }
      },
      (err) => {
        console.warn("Geolocation permission declined or unavailable.", err);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex flex-col" style={{ minHeight: "400px" }}>
      {/* Search Bar / Geocoder Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2 pointer-events-none">
        <form
          onSubmit={handleAddressSearch}
          className="flex-1 max-w-sm flex items-center bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-slate-150 p-1 pointer-events-auto"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search neighborhood, city, state..."
            className="flex-1 text-xs px-3 py-2 bg-transparent focus:outline-none font-medium text-slate-800"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Search address"
          >
            {searching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          </button>
        </form>

        <button
          onClick={handleGeolocate}
          className="bg-white/95 backdrop-blur-md hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 p-2.5 rounded-xl shadow-lg border border-slate-150 pointer-events-auto transition-colors flex items-center justify-center shrink-0 cursor-pointer"
          title="Pan to my current location"
        >
          <Navigation className="h-4 w-4" />
        </button>
      </div>

      {searchError && (
        <div className="absolute top-16 left-3 right-3 z-[1000] max-w-sm bg-rose-50 border border-rose-100 text-rose-800 rounded-xl p-2.5 text-[11px] shadow-md flex items-center gap-2">
          <span className="font-semibold">{searchError}</span>
          <button onClick={() => setSearchError(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-auto px-1">×</button>
        </div>
      )}

      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-[1]" style={{ minHeight: "350px" }} />

      {/* Map Guidelines overlay */}
      {!readOnly && !newReportCoords && (
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-emerald-100 text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5 pointer-events-none z-[1000]">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Click / tap map to set cleanup coordinates
        </div>
      )}

      {/* Animation/Keyframe injection to support the pulse ring effect */}
      <style>{`
        @keyframes ping {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          70%, 100% {
            transform: scale(2.2);
            opacity: 0;
          }
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px !important;
          padding: 4px !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) !important;
        }
        .leaflet-popup-tip {
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1) !important;
        }
      `}</style>
    </div>
  );
}
