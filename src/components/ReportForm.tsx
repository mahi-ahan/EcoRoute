import { useState, useRef, DragEvent, ChangeEvent, useEffect } from "react";
import { Camera, Trash2, Sparkles, MapPin, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { SeverityType, WasteReport } from "../types";

interface ReportFormProps {
  selectedCoords: { lat: number; lng: number } | null;
  onCoordsChange: (coords: { lat: number; lng: number } | null) => void;
  existingReports: WasteReport[];
  onSuccess: (report: WasteReport) => void;
  onCancel: () => void;
}

export default function ReportForm({
  selectedCoords,
  onCoordsChange,
  existingReports,
  onSuccess,
  onCancel,
}: ReportFormProps) {
  const { currentUser } = useAuth();

  // States
  const [image, setImage] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [addressWords, setAddressWords] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    wasteType: string;
    severity: SeverityType;
    description: string;
    handlingInstructions: string;
  } | null>(null);
  const [customNotes, setCustomNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duplicate Check states
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    reason: string;
    matchingReportId: string | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const locationSourceRef = useRef<"map" | "type" | null>(null);

  // 1. Map Click Event: Auto reverse-geocode map coordinates to text address
  useEffect(() => {
    if (selectedCoords) {
      if (locationSourceRef.current === "type") {
        // Already geocoded from user's manual typing, reset ref to allow future inputs
        locationSourceRef.current = null;
        return;
      }

      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedCoords.lat}&lon=${selectedCoords.lng}&addressdetails=1`;
      setAddressWords(`Locating: ${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}...`);

      fetch(url, {
        headers: {
          "User-Agent": "EcoRouteWasteReportingPortal/1.0",
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Geocode status error");
          return res.json();
        })
        .then((data) => {
          locationSourceRef.current = "map";
          if (data && data.display_name) {
            setAddressWords(data.display_name);
          } else {
            setAddressWords(`Coordinates: ${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`);
          }
        })
        .catch((err) => {
          console.error("OSM Reverse Geocode error:", err);
          locationSourceRef.current = "map";
          setAddressWords(`Coordinates: ${selectedCoords.lat.toFixed(5)}, ${selectedCoords.lng.toFixed(5)}`);
        });
    }
  }, [selectedCoords]);

  // 2. Typing Input Event: Auto forward-geocode text words to pin the map
  useEffect(() => {
    if (!addressWords.trim() || addressWords.startsWith("Coordinates:") || addressWords.startsWith("Locating:")) {
      return;
    }
    if (locationSourceRef.current === "map") {
      // Just reverse-geocoded from map click, skip lookup to prevent cycles
      locationSourceRef.current = null;
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressWords)}&limit=1`;
        const res = await fetch(url, {
          headers: {
            "User-Agent": "EcoRouteWasteReportingPortal/1.0",
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            locationSourceRef.current = "type";
            onCoordsChange({ lat, lng });
          }
        }
      } catch (err) {
        console.error("Auto geocode error:", err);
      }
    }, 1200); // Debounce typing input

    return () => clearTimeout(delayDebounce);
  }, [addressWords]);

  // Compress image to fit payload limits
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

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }
    setError(null);
    try {
      const compressed = await compressImage(file);
      setImage(compressed);
      autoAnalyze(compressed);
    } catch (err) {
      console.error(err);
      setError("Error processing image. Please try another one.");
    }
  };

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleFile(e.target.files[0]);
    }
  };

  // Triggers Gemini AI Classification
  const autoAnalyze = async (imgBase64: string) => {
    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imgBase64 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to classify image.");
      }

      const result = await response.json();
      setAnalysisResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to auto-analyze image. Please check your GEMINI_API_KEY.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle Submission with Duplicate Verification
  const handleSubmit = async (bypassDuplicate = false) => {
    if (!currentUser || !image || !addressWords.trim()) {
      setError("Location (in words) and Image are both mandatory fields. Please supply them before submitting.");
      return;
    }

    setError(null);

    const latVal = selectedCoords?.lat || 37.7749; // Default SF coords if map not pinned
    const lngVal = selectedCoords?.lng || -122.4194;

    // Check duplicates if not bypassed
    if (!bypassDuplicate && !duplicateWarning) {
      setCheckingDuplicates(true);
      try {
        const response = await fetch("/api/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newReport: {
              wasteType: analysisResult?.wasteType || "General Unsorted",
              description: customNotes.trim() || analysisResult?.description || "Reported community waste.",
              lat: latVal,
              lng: lngVal,
            },
            existingReports: existingReports,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.isDuplicate) {
            setDuplicateWarning({
              reason: result.reason,
              matchingReportId: result.matchingReportId,
            });
            setCheckingDuplicates(false);
            return; // Stop submission to show duplicate alert
          }
        }
      } catch (err) {
        console.error("Duplicate check skipped due to error:", err);
      } finally {
        setCheckingDuplicates(false);
      }
    }

    setSubmitting(true);

    const reportId = `report_${Date.now()}`;

    const newReport: WasteReport = {
      id: reportId,
      userId: currentUser.uid,
      userEmail: currentUser.email || "",
      userDisplayName: currentUser.displayName || "Citizen Reporter",
      imageUrl: image,
      location: {
        lat: latVal,
        lng: lngVal,
        address: addressWords.trim(),
      },
      wasteType: analysisResult?.wasteType || "General Unsorted",
      severity: analysisResult?.severity || "Medium",
      description: customNotes.trim() || analysisResult?.description || "Reported community waste.",
      status: "Pending",
      handlingInstructions: analysisResult?.handlingInstructions || "Default handling procedures. Maintain safety gear.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const reportDocRef = doc(db, "reports", reportId);
      await setDoc(reportDocRef, {
        ...newReport,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      onSuccess(newReport);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `reports/${reportId}`);
      setError("Failed to submit the report. Please try again.");
    } finally {
      setSubmitting(false);
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

  const isFormValid = image !== null && addressWords.trim() !== "";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col h-full overflow-y-auto max-h-[85vh]">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="h-4.5 w-4.5 text-emerald-500 animate-pulse" />
          Report Community Waste
        </h3>
        <button
          onClick={onCancel}
          className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2.5 py-1 rounded-md hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Mandatory Photo Upload */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
          <span>Upload Photo of Waste <span className="text-rose-500">*</span></span>
          {!image && <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">Required</span>}
        </label>

        {image ? (
          <div className="relative rounded-xl overflow-hidden border border-slate-100 group shadow-sm bg-slate-50">
            <img src={image} alt="Waste issue" className="w-full h-44 object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setAnalysisResult(null);
                }}
                className="p-2 bg-white rounded-full text-rose-500 shadow-md hover:bg-rose-50 transition-colors"
                title="Remove photo"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? "border-emerald-500 bg-emerald-50/50"
                : "border-slate-200 hover:border-emerald-400 hover:bg-slate-50/50"
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              onClick={(e) => e.stopPropagation()}
              className="hidden"
              accept="image/*"
            />
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full">
                <Camera className="h-6 w-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Drag and drop your photo here, or <span className="text-emerald-600 font-bold">browse</span>
              </p>
              <p className="text-[10px] text-slate-400">Required. Automatically analyzed by Gemini AI.</p>
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Location in Words */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
          <span>Waste Location in Words <span className="text-rose-500">*</span></span>
          {!addressWords.trim() && <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded">Required</span>}
        </label>
        <div className="relative">
          <input
            type="text"
            required
            value={addressWords}
            onChange={(e) => {
              locationSourceRef.current = "type";
              setAddressWords(e.target.value);
            }}
            placeholder="e.g., Near the playground bench, 45 Maple Avenue..."
            className="w-full text-xs p-3 pl-10 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
          <MapPin className="absolute left-3 top-3 h-4.5 w-4.5 text-emerald-500" />
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          Type address or select directly by clicking on the map. They will automatically sync.
        </p>
      </div>

      {/* AI classification action / loader */}
      {analyzing && (
        <div className="mb-5 p-4 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-center gap-3 animate-pulse">
          <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
          <span className="text-xs font-semibold text-slate-600">Gemini AI classifying photo...</span>
        </div>
      )}

      {/* AI Analysis Result Output */}
      {analysisResult && (
        <div className="mb-5 p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-emerald-600 animate-bounce" />
              Gemini Vision AI Analysis
            </h4>
            <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Success</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <div className="text-[9px] font-bold text-emerald-700 uppercase">Waste Category</div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">{analysisResult.wasteType}</div>
            </div>
            <div>
              <div className="text-[9px] font-bold text-emerald-700 uppercase">Severity Class</div>
              <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-bold mt-1 border ${getSeverityBadgeColor(analysisResult.severity)}`}>
                {analysisResult.severity}
              </span>
            </div>
          </div>

          <div>
            <div className="text-[9px] font-bold text-emerald-700 uppercase">AI Description</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium">{analysisResult.description}</p>
          </div>

          <div>
            <div className="text-[9px] font-bold text-emerald-700 uppercase">Safety & Handling Instructions</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed font-medium bg-white p-2.5 rounded-lg border border-slate-100 italic">
              {analysisResult.handlingInstructions}
            </p>
          </div>

          <div className="border-t border-emerald-100/60 pt-3">
            <label className="block text-[10px] font-bold text-emerald-800 mb-1.5">
              Add Personal Notes / Specific Location Identifiers
            </label>
            <textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Add details (e.g., 'Behind the mailbox', 'In the side alley')"
              className="w-full text-xs p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* Duplicate Check and Warnings Area */}
      {checkingDuplicates && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2 animate-pulse">
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-amber-600" />
          <span className="font-semibold">Gemini AI verifying duplicate report status in this area...</span>
        </div>
      )}

      {duplicateWarning && (
        <div className="mb-4 p-4 bg-amber-50/80 border border-amber-200 text-amber-950 rounded-xl text-xs space-y-3 shadow-sm">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Potential Duplicate Detected Nearby!</p>
              <p className="mt-1 text-amber-800 leading-relaxed font-medium">{duplicateWarning.reason}</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => setDuplicateWarning(null)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel Submitting
            </button>
            <button
              onClick={() => handleSubmit(true)}
              className="px-2.5 py-1.5 bg-amber-600 text-white font-bold rounded-lg hover:bg-amber-700 transition-colors"
            >
              File Anyway
            </button>
          </div>
        </div>
      )}

      {/* Form Submission */}
      <button
        type="button"
        disabled={submitting || !isFormValid || analyzing || checkingDuplicates}
        onClick={() => handleSubmit(false)}
        className={`w-full py-3 text-white font-bold rounded-xl text-xs transition-colors shadow-lg flex items-center justify-center gap-2 mt-auto cursor-pointer ${
          isFormValid && !checkingDuplicates
            ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-50/50"
            : "bg-slate-300 border-slate-300 shadow-none cursor-not-allowed"
        }`}
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Submitting Report...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            File Community Report
          </>
        )}
      </button>
      {!isFormValid && (
        <p className="text-[10px] text-center text-rose-500 font-semibold mt-2 animate-pulse">
          * Image and location in words are both mandatory.
        </p>
      )}
    </div>
  );
}
