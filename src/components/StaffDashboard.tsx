import { useState, useRef, useEffect, ChangeEvent } from "react";
import {
  CheckCircle2, Clock, PlayCircle, Shield, MapPin, AlertTriangle, Calendar, Filter, User,
  BarChart2, ListFilter, Camera, Trash2, Send, Sparkles, Loader2, Check,
  Volume2, VolumeX, Share2, Copy, ExternalLink
} from "lucide-react";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { SeverityType, WasteReport, ReportStatus } from "../types";
import StaffStats from "./StaffStats";

interface StaffDashboardProps {
  reports: WasteReport[];
  selectedReportId: string | null;
  onSelectReport: (id: string) => void;
  onReportUpdated: (updatedReport: WasteReport) => void;
  language?: "EN" | "ES" | "FR" | "HI";
}

export default function StaffDashboard({
  reports,
  selectedReportId,
  onSelectReport,
  onReportUpdated,
  language = "EN",
}: StaffDashboardProps) {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<"registry" | "statistics">("registry");

  // Filters
  const [statusFilter, setStatusFilter] = useState<"All" | ReportStatus>("All");
  const [severityFilter, setSeverityFilter] = useState<"All" | SeverityType>("All");
  const [radiusFilter, setRadiusFilter] = useState<"All" | number>(20); // Default to 20 km radius
  const [staffCoords, setStaffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Resolution Accountability states
  const [isResolving, setIsResolving] = useState(false);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [compressingAfter, setCompressingAfter] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gemini AI Advisor states
  const [staffQuestion, setStaffQuestion] = useState("");
  const [staffAiResponse, setStaffAiResponse] = useState("");
  const [loadingStaffAi, setLoadingStaffAi] = useState(false);

  // AI Voice and Sharing states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  // Stop reading if selected report changes or language changes
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [selectedReportId, language]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Text To Speech implementation
  const handleToggleSpeech = () => {
    if (!selectedReport) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    let speechText = "";
    let voiceLang = "en-IN";

    if (language === "HI") {
      voiceLang = "hi-IN";
      speechText = `कर्मचारी कचरा विश्लेषण रिपोर्ट। कचरे का प्रकार है: ${selectedReport.wasteType}। गंभीरता स्तर: ${selectedReport.severity}। विवरण: ${selectedReport.description}। सुरक्षा और निपटान निर्देश: ${selectedReport.handlingInstructions || "कोई विशेष निर्देश उपलब्ध नहीं है।"}`;
    } else {
      voiceLang = "en-IN";
      speechText = `Municipal staff waste analysis. Waste type is ${selectedReport.wasteType}. Severity level is ${selectedReport.severity}. Description: ${selectedReport.description}. Recommended AI safety advice is: ${selectedReport.handlingInstructions || "No special handling instructions provided."}`;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = voiceLang;

    // Locate matching Indian or language specific voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes(voiceLang.toLowerCase()) ||
        v.lang.startsWith(language.toLowerCase())
    );

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.92;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Coordinates Map Sharing implementation
  const handleShareReport = async () => {
    if (!selectedReport) return;
    const { lat, lng } = selectedReport.location;
    const address = selectedReport.location.address || "Community Coordinates Pinned";

    const shareText = `🚨 *EcoRoute Swachh Bharat Waste Dispatch Alert!*
*Type:* ${selectedReport.wasteType}
*Severity:* ${selectedReport.severity}
*Status:* ${selectedReport.status}
*Description:* ${selectedReport.description}
📍 *Address:* ${address}
🗺️ *Exact Map Pin Link:* https://www.google.com/maps?q=${lat},${lng}
🇮🇳 *Clean India, Green India!* #SwachhBharat #EcoRoute`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Waste Report: ${selectedReport.wasteType}`,
          text: shareText,
          url: `https://www.google.com/maps?q=${lat},${lng}`,
        });
        showToast("Shared successfully!");
      } catch (err) {
        console.error("Web Share failed:", err);
        copyToClipboard(shareText);
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast("Copied exact map location and report details to clipboard! 📋");
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Get staff member's real-time coordinates for proximity features
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStaffCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn("Staff geolocation blocked or not available. Using center default (SF).", err);
        setStaffCoords({ lat: 37.7749, lng: -122.4194 });
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Clear resolution panel and advisor panel states on report selection change
  useEffect(() => {
    setIsResolving(false);
    setAfterImage(null);
    setResolutionNotes("");
    setResolveError(null);
    setStaffQuestion("");
    setStaffAiResponse("");
  }, [selectedReportId]);

  // Haversine formula for spherical distance in kilometers
  const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Stats calculation
  const totalReports = reports.length;
  const pendingCount = reports.filter((r) => r.status === "Pending").length;
  const inProgressCount = reports.filter((r) => r.status === "In Progress").length;
  const resolvedCount = reports.filter((r) => r.status === "Resolved").length;

  // Filtered reports using status, severity, and AI proximity radius
  const filteredReports = reports.filter((report) => {
    const matchStatus = statusFilter === "All" || report.status === statusFilter;
    const matchSeverity = severityFilter === "All" || report.severity === severityFilter;
    
    let matchRadius = true;
    if (radiusFilter !== "All" && staffCoords && report.location) {
      const distance = getDistanceInKm(
        staffCoords.lat,
        staffCoords.lng,
        report.location.lat,
        report.location.lng
      );
      matchRadius = distance <= radiusFilter;
    }
    
    return matchStatus && matchSeverity && matchRadius;
  });

  // Base64 Image Compression
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 450;
          const MAX_HEIGHT = 450;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAfterImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCompressingAfter(true);
      setResolveError(null);
      try {
        const compressed = await compressImage(e.target.files[0]);
        setAfterImage(compressed);
      } catch (err) {
        setResolveError("Failed to process image. Please try another file.");
      } finally {
        setCompressingAfter(false);
      }
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: ReportStatus) => {
    if (newStatus === "Resolved") {
      // Trigger mandatory cleanup upload workflow instead of saving directly
      setIsResolving(true);
      return;
    }

    setUpdatingId(reportId);
    setStatusError(null);
    try {
      const reportDocRef = doc(db, "reports", reportId);
      await updateDoc(reportDocRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });

      // Update client state
      const existing = reports.find((r) => r.id === reportId);
      if (existing) {
        onReportUpdated({
          ...existing,
          status: newStatus,
          updatedAt: new Date().toISOString(),
        });

        // Trigger in-app notification
        if (existing.status !== newStatus) {
          await triggerInAppNotification(existing, newStatus);
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setStatusError(`Failed to update status: ${errorMessage}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Resolve with visual verification upload
  const handleResolveSubmit = async () => {
    if (!selectedReport || !afterImage) {
      setResolveError("Uploading an 'after-cleaning' image is mandatory before marking as resolved.");
      return;
    }

    setUpdatingId(selectedReport.id);
    setResolveError(null);

    try {
      const reportDocRef = doc(db, "reports", selectedReport.id);
      await updateDoc(reportDocRef, {
        status: "Resolved" as ReportStatus,
        afterImageUrl: afterImage,
        resolutionNotes: resolutionNotes.trim() || "Cleaned and resolved by eco-crew.",
        updatedAt: serverTimestamp(),
      });

      // Update client state
      onReportUpdated({
        ...selectedReport,
        status: "Resolved",
        afterImageUrl: afterImage,
        resolutionNotes: resolutionNotes.trim() || "Cleaned and resolved by eco-crew.",
        updatedAt: new Date().toISOString(),
      });

      // Trigger Notification
      await triggerInAppNotification(selectedReport, "Resolved");
      setIsResolving(false);
      setAfterImage(null);
      setResolutionNotes("");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${selectedReport.id}`);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setResolveError(`Failed to resolve issue: ${errorMessage}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const triggerInAppNotification = async (existing: WasteReport, newStatus: ReportStatus) => {
    try {
      const notificationId = `notif_${Date.now()}`;
      const notifRef = doc(db, "notifications", notificationId);
      await setDoc(notifRef, {
        id: notificationId,
        userId: existing.userId,
        reportId: existing.id,
        wasteType: existing.wasteType,
        oldStatus: existing.status,
        newStatus: newStatus,
        message: `Your report about "${existing.wasteType}" has been updated to "${newStatus}".`,
        read: false,
        emailSent: true,
        createdAt: new Date().toISOString(),
      });
      console.log(`Notification ${notificationId} successfully generated for user ${existing.userId}`);
    } catch (notifErr) {
      console.error("Failed to generate in-app notification:", notifErr);
    }
  };

  // Gemini Q&A logic for staff advice
  const askStaffAi = async (questionText?: string) => {
    const query = questionText || staffQuestion;
    if (!query.trim() || !selectedReport) return;

    setLoadingStaffAi(true);
    setStaffAiResponse("");
    try {
      const response = await fetch("/api/staff-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report: selectedReport, question: query }),
      });

      if (!response.ok) {
        throw new Error("Failed to consult Gemini AI.");
      }

      const data = await response.json();
      setStaffAiResponse(data.response);
    } catch (err) {
      setStaffAiResponse("Error: Failed to obtain advice from Gemini. Please check connection and project settings.");
    } finally {
      setLoadingStaffAi(false);
    }
  };

  const getSeverityBadgeColor = (sev: SeverityType) => {
    switch (sev) {
      case "Critical":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case "Resolved":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "In Progress":
        return <PlayCircle className="h-4 w-4 text-amber-600 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-slate-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
      {/* Analytics stats banner */}
      <div className="lg:col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Reports</div>
            <div className="text-xl font-bold text-slate-800">{totalReports}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pending</div>
            <div className="text-xl font-bold text-slate-800">{pendingCount}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <PlayCircle className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">In Progress</div>
            <div className="text-xl font-bold text-slate-800">{inProgressCount}</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Resolved</div>
            <div className="text-xl font-bold text-slate-800">{resolvedCount}</div>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="lg:col-span-12 flex items-center justify-between border-b border-slate-100 pb-2">
        <div className="flex items-center gap-6">
          <button
            id="tab-registry"
            onClick={() => setActiveTab("registry")}
            className={`pb-2 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === "registry"
                ? "text-emerald-600 border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <ListFilter className="h-4 w-4" />
            Issue Registry
          </button>
          <button
            id="tab-statistics"
            onClick={() => setActiveTab("statistics")}
            className={`pb-2 text-sm font-bold transition-all relative flex items-center gap-2 cursor-pointer ${
              activeTab === "statistics"
                ? "text-emerald-600 border-b-2 border-emerald-500"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            Statistics & Trends
          </button>
        </div>
      </div>

      {activeTab === "registry" ? (
        <>
          {/* Reports List */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-100 p-5 flex flex-col h-[550px] lg:h-[650px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-500" />
                Issue Registry ({filteredReports.length})
              </h4>
            </div>

            {/* Filter Toolbar */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  <option value="All">All Severities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Proximity</label>
                <select
                  value={radiusFilter === "All" ? "All" : radiusFilter.toString()}
                  onChange={(e) => {
                    const val = e.target.value;
                    setRadiusFilter(val === "All" ? "All" : parseInt(val));
                  }}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                >
                  <option value="20">Within 20 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="5">Within 5 km</option>
                  <option value="1">Within 1 km</option>
                  <option value="All">All Areas</option>
                </select>
              </div>
            </div>

            {/* List scroll container */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredReports.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  No reports match the active filters.
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => onSelectReport(report.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      report.id === selectedReportId
                        ? "border-emerald-500 bg-emerald-50/20 shadow-sm"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {report.imageUrl && (
                      <img
                        src={report.imageUrl}
                        alt={report.wasteType}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-800 truncate">{report.wasteType}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${getSeverityBadgeColor(report.severity)}`}>
                          {report.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mb-1">
                        {report.location.address || "Community Location"}
                      </p>
                      
                      {/* Calculated distance tag */}
                      {staffCoords && report.location && (
                        <div className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5 mb-1.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span>
                            {getDistanceInKm(staffCoords.lat, staffCoords.lng, report.location.lat, report.location.lng).toFixed(1)} km away
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          {getStatusIcon(report.status)}
                          <span className="font-semibold text-slate-600">{report.status}</span>
                        </span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Details / Action Panel */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-100 p-5 flex flex-col h-[550px] lg:h-[650px] overflow-y-auto relative">
            {toastMessage && (
              <div className="absolute top-4 left-4 right-4 z-[9999] bg-slate-900/95 text-white p-3 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 border border-emerald-500 animate-in fade-in duration-150">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="flex-1 leading-relaxed">{toastMessage}</span>
              </div>
            )}
            {selectedReport ? (
              <div className="space-y-5">
                <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-base font-bold text-slate-800">{selectedReport.wasteType}</h4>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {selectedReport.userDisplayName}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(selectedReport.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getSeverityBadgeColor(selectedReport.severity)}`}>
                    {selectedReport.severity} Severity
                  </span>
                </div>

                {/* Accountability Dual Photos Visualizers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Original Before Photo</div>
                    <img
                      src={selectedReport.imageUrl}
                      alt={selectedReport.wasteType}
                      className="w-full h-44 object-cover rounded-xl border border-slate-200 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {selectedReport.status === "Resolved" ? (
                    <div>
                      <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1.5 flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Resolved After Photo
                      </div>
                      <img
                        src={selectedReport.afterImageUrl || "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=400"}
                        alt="Resolved waste"
                        className="w-full h-44 object-cover rounded-xl border border-emerald-200 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    /* Status Action Panel */
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Current Status</div>
                        <div className="flex items-center gap-1.5 text-slate-700 font-bold text-sm mb-4">
                          {getStatusIcon(selectedReport.status)}
                          {selectedReport.status}
                        </div>

                        {statusError && (
                          <div className="p-2.5 mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold rounded-lg leading-relaxed">
                            {statusError}
                          </div>
                        )}

                        {!isResolving && (
                          <>
                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2">Update Resolution Status</div>
                            <div className="space-y-2">
                              <button
                                disabled={updatingId !== null || selectedReport.status === "Pending"}
                                onClick={() => handleStatusChange(selectedReport.id, "Pending")}
                                className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-between transition-colors ${
                                  selectedReport.status === "Pending"
                                    ? "bg-slate-200 border-slate-200 text-slate-600 font-bold"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                                  Mark Pending
                                </span>
                                {selectedReport.status === "Pending" && <span className="text-[10px] font-bold text-slate-500">Active</span>}
                              </button>

                              <button
                                disabled={updatingId !== null || selectedReport.status === "In Progress"}
                                onClick={() => handleStatusChange(selectedReport.id, "In Progress")}
                                className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-between transition-colors ${
                                  selectedReport.status === "In Progress"
                                    ? "bg-amber-100 border-amber-200 text-amber-800 font-bold"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
                                }`}
                              >
                                <span className="flex items-center gap-1.5">
                                  <PlayCircle className="h-3.5 w-3.5 text-amber-600 animate-spin" style={{ animationDuration: '4s' }} />
                                  Mark In Progress
                                </span>
                                {selectedReport.status === "In Progress" && <span className="text-[10px] font-bold text-amber-600">Active</span>}
                              </button>

                              <button
                                disabled={updatingId !== null}
                                onClick={() => handleStatusChange(selectedReport.id, "Resolved")}
                                className="w-full py-2 px-3 text-xs font-semibold rounded-lg border flex items-center justify-between transition-colors bg-white border-slate-200 text-emerald-700 hover:bg-emerald-50 cursor-pointer hover:border-emerald-300"
                              >
                                <span className="flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                  Mark Resolved *
                                </span>
                                <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 py-0.5 rounded">Photo Required</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mandatory Resolutions Accountability Form Overlay */}
                {isResolving && selectedReport.status !== "Resolved" && (
                  <div className="bg-emerald-50/50 border border-emerald-200 p-4 rounded-xl animate-fadeIn space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <Camera className="h-4 w-4" />
                        Resolution Verification Workflow
                      </div>
                      <button
                        onClick={() => setIsResolving(false)}
                        className="text-[10px] text-slate-500 hover:text-slate-700 font-bold bg-white border border-slate-200 px-2 py-0.5 rounded"
                      >
                        Cancel
                      </button>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      To successfully resolve this issue, municipal standards mandate uploading an <strong>after-cleaning photo</strong> for neighborhood accountability.
                    </p>

                    {resolveError && (
                      <div className="text-[10px] text-rose-700 bg-rose-50 border border-rose-100 p-2 rounded-lg">
                        {resolveError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      <div>
                        {afterImage ? (
                          <div className="relative rounded-lg overflow-hidden border border-emerald-300">
                            <img src={afterImage} alt="After cleanup preview" className="w-full h-28 object-cover" referrerPolicy="no-referrer" />
                            <button
                              onClick={() => setAfterImage(null)}
                              className="absolute top-2 right-2 p-1.5 bg-white text-rose-500 rounded-full shadow hover:bg-rose-50"
                              title="Delete photo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="relative cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <input
                              type="file"
                              ref={fileInputRef}
                              onChange={handleAfterImageChange}
                              onClick={(e) => e.stopPropagation()}
                              className="hidden"
                              accept="image/*"
                            />
                            <div
                              className="block border-2 border-dashed border-emerald-300 rounded-xl p-4 text-center hover:bg-emerald-50/30 transition-all"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <Camera className="h-6 w-6 text-emerald-600 animate-pulse" />
                                <span className="text-[10px] font-bold text-slate-700">Upload Clean Photo *</span>
                                <span className="text-[9px] text-slate-400">Mandatory to resolve</span>
                              </div>
                            </div>
                          </div>
                        )}
                        {compressingAfter && (
                          <div className="text-[9px] text-emerald-600 animate-pulse text-center mt-1">Compressing image...</div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Resolution Notes</label>
                        <textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="e.g. Cleared 25kg plastic, site power-washed."
                          className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                          rows={2}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!afterImage || updatingId !== null}
                      onClick={handleResolveSubmit}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer ${
                        afterImage
                          ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-50"
                          : "bg-slate-300 shadow-none cursor-not-allowed"
                      }`}
                    >
                      {updatingId ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Resolving Issue...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Verify Cleanup & Resolve Issue
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Description */}
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">Issue Description</div>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                    {selectedReport.description}
                  </p>
                </div>

                {/* Resolution Notes detail */}
                {selectedReport.status === "Resolved" && selectedReport.resolutionNotes && (
                  <div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mb-1">Cleanup Verification Notes</div>
                    <p className="text-xs text-slate-700 leading-relaxed bg-emerald-50/20 p-3 rounded-xl border border-emerald-100">
                      {selectedReport.resolutionNotes}
                    </p>
                  </div>
                )}

                {/* AI Handling Procedures */}
                {selectedReport.handlingInstructions && (
                  <div className="p-4 bg-emerald-50/35 border border-emerald-100/60 rounded-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-emerald-100/40 pb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
                        Gemini Initial Disposal & Handling Guidance
                      </div>
                      <button
                        onClick={handleToggleSpeech}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                          isSpeaking
                            ? "bg-rose-600 border-rose-500 text-white animate-pulse"
                            : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        }`}
                        title={isSpeaking ? "Stop Reading" : "Listen to AI Analysis"}
                      >
                        {isSpeaking ? (
                          <>
                            <VolumeX className="h-3.5 w-3.5" />
                            Stop Reading
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3.5 w-3.5" />
                            Listen to AI (Hindi/EN) 🔊
                          </>
                        )}
                      </button>
                    </div>

                    {isSpeaking && (
                      <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100">
                        <div className="flex gap-0.5 items-end h-3">
                          <span className="w-0.75 bg-emerald-600 rounded-full animate-pulse animate-duration-500" style={{ height: "40%", animationDelay: "0.1s" }}></span>
                          <span className="w-0.75 bg-emerald-600 rounded-full animate-pulse animate-duration-500" style={{ height: "100%", animationDelay: "0.3s" }}></span>
                          <span className="w-0.75 bg-emerald-600 rounded-full animate-pulse animate-duration-500" style={{ height: "60%", animationDelay: "0.2s" }}></span>
                          <span className="w-0.75 bg-emerald-600 rounded-full animate-pulse animate-duration-500" style={{ height: "80%", animationDelay: "0.4s" }}></span>
                        </div>
                        <span className="text-[9px] font-extrabold text-emerald-800 tracking-wide uppercase animate-pulse">
                          Speaking...
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-semibold">
                      {selectedReport.handlingInstructions}
                    </p>
                  </div>
                )}

                {/* Interactive Gemini AI Safety & Logistics Advisor */}
                <div className="border border-slate-100 rounded-xl p-4 bg-gradient-to-br from-white to-slate-50/40 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <div className="p-1 bg-emerald-50 rounded-lg text-emerald-600">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Gemini Staff Safety & Q&A Advisor</h5>
                      <p className="text-[10px] text-slate-400">Consult Gemini AI for custom hazard guidance, logistics, or drafts</p>
                    </div>
                  </div>

                  {/* Suggestion prompt chips */}
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        setStaffQuestion("What precise protective gear (PPE) is needed to clear this?");
                        askStaffAi("What precise protective gear (PPE) is needed to clear this?");
                      }}
                      className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                    >
                      🛡️ Recommended PPE?
                    </button>
                    <button
                      onClick={() => {
                        setStaffQuestion("Where is the best disposal/recycling center for this type of waste?");
                        askStaffAi("Where is the best disposal/recycling center for this type of waste?");
                      }}
                      className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                    >
                      ♻️ Where to dispose?
                    </button>
                    <button
                      onClick={() => {
                        setStaffQuestion("Draft a friendly, encouraging message for the resident notifying them we are on it.");
                        askStaffAi("Draft a friendly, encouraging message for the resident notifying them we are on it.");
                      }}
                      className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                    >
                      📝 Draft resident message
                    </button>
                  </div>

                  {/* Advisor Response Area */}
                  {staffAiResponse && (
                    <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-[11px] text-slate-700 leading-relaxed whitespace-pre-line font-mono max-h-[180px] overflow-y-auto">
                      <div className="font-bold text-[10px] text-emerald-700 mb-1 flex items-center gap-1 uppercase">
                        <Sparkles className="h-3.5 w-3.5" />
                        Gemini Advisor Advice:
                      </div>
                      {staffAiResponse}
                    </div>
                  )}

                  {/* Input form */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={staffQuestion}
                      onChange={(e) => setStaffQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") askStaffAi();
                      }}
                      disabled={loadingStaffAi}
                      placeholder="Ask Gemini: Is this toxic? How should we transport it? ..."
                      className="flex-1 text-xs p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                    <button
                      onClick={() => askStaffAi()}
                      disabled={loadingStaffAi || !staffQuestion.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      {loadingStaffAi ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Location Detail (Words only focus as requested) */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Geospatial Dispatch Details</span>
                  
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4.5 w-4.5 text-rose-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-700 block">Reported Address</span>
                      <p className="text-[11px] text-slate-600 font-semibold leading-relaxed mt-0.5">
                        {selectedReport.location.address || "Community Coordinates Pinned"}
                      </p>
                      <span className="text-[9px] text-slate-400 font-mono block mt-1">
                        Lat: {selectedReport.location.lat.toFixed(6)}, Lng: {selectedReport.location.lng.toFixed(6)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/50 flex flex-wrap gap-2">
                    <button
                      onClick={handleShareReport}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      title="Share Location & Map Link"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share Map Location 🗺️
                    </button>

                    <button
                      onClick={() => copyToClipboard(`🚨 Municipal Waste Job!\nType: ${selectedReport.wasteType}\n📍 Exact Pin: https://www.google.com/maps?q=${selectedReport.location.lat},${selectedReport.location.lng}`)}
                      className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      title="Copy Job details"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Details
                    </button>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${selectedReport.location.lat},${selectedReport.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-700 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 transition-colors"
                      title="Navigate with Google Maps"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Google Maps Route
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center p-6">
                <Shield className="h-12 w-12 text-slate-200 mb-3 animate-pulse" />
                <h5 className="font-bold text-sm text-slate-600 mb-1">Select an Active Issue</h5>
                <p className="text-xs text-slate-400 max-w-sm">
                  Click any report in the registry to view its details, upload accountability photos, and consult the Gemini Advisor.
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="lg:col-span-12 h-full overflow-y-auto pb-8">
          <StaffStats reports={reports} />
        </div>
      )}
    </div>
  );
}
