import { useState, MouseEvent, useEffect } from "react";
import { CheckCircle2, Clock, PlayCircle, Trash2, MapPin, AlertCircle, PlusCircle, Sparkles, X, ArrowLeft, Volume2, VolumeX, Share2, Copy, ExternalLink } from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { WasteReport, SeverityType, ReportStatus } from "../types";

interface ResidentDashboardProps {
  reports: WasteReport[];
  selectedReportId: string | null;
  onSelectReport: (id: string) => void;
  onDeleteReport: (id: string) => void;
  onStartNewReport: () => void;
  language?: "EN" | "HI" | "MR" | "TA";
}

const localTranslations = {
  EN: {
    aboutTitle: "Swachh Bharat x EcoRoute Portal",
    aboutBody: "EcoRoute connects civic-minded residents directly with municipal staff. Snap a photo of neighborhood waste, and our Gemini AI classifies the hazard and safety steps. In-app map pinning and coordinates sync automatically with robust AI duplicate report detection. Join the mission for a cleaner, healthier India! 🇮🇳",
    showAbout: "Show SBM Portal Info",
    heading: "Your Reported Waste Issues",
    fileReport: "File Clean Report",
    noReports: "No reports filed yet",
    startReporting: "Start Reporting",
    noReportsSub: "Pin a location on the map and upload a picture to let Gemini analyze and report community waste! Let's keep our neighborhood clean.",
    position: "Map Position",
    deleteAlert: "Are you sure you want to delete this community report?",
    backToList: "Back to List",
    aiAnalysis: "Gemini Smart AI Analysis",
    description: "Issue Description",
    handling: "AI Safety & Handling Guidelines",
    speakTextBtn: "Listen to AI Analysis",
    stopSpeakBtn: "Stop Reading",
    shareLocation: "Share Location & Map Pin",
    shareSuccess: "Copied exact map location & report details! Share it on WhatsApp/Telegram 🇮🇳",
    copyDetails: "Copy Details",
    shareOnWhatsApp: "WhatsApp Share",
    openInGoogleMaps: "Google Maps Route",
  },
  HI: {
    aboutTitle: "स्वच्छ भारत x इकोरूट पोर्टल",
    aboutBody: "इकोरूट निवासियों को सीधे नगर पालिका कर्मचारियों से जोड़ता है। कचरे की एक तस्वीर लें, और जेमिनी एआई कचरों को वर्गीकृत और सुरक्षित रूप से निस्तारण दिशानिर्देश प्रदान करेगा। नक्शा पिनिंग और एआई डुप्लिकेट रिपोर्ट पहचान स्वचालित रूप से काम करते हैं। स्वच्छ भारत मिशन में शामिल हों! 🇮🇳",
    showAbout: "स्वच्छ भारत पोर्टल जानकारी दिखाएं",
    heading: "आपके द्वारा रिपोर्ट किए गए कचरे",
    fileReport: "रिपोर्ट दर्ज करें",
    noReports: "अभी तक कोई रिपोर्ट दर्ज नहीं की गई है",
    startReporting: "रिपोर्टिंग शुरू करें",
    noReportsSub: "नक्शे पर एक स्थान पिन करें और जेमिनी द्वारा कचरे की जांच करने के लिए एक फोटो अपलोड करें! आइए अपने पड़ोस को स्वच्छ रखें।",
    position: "नक्शा स्थिति",
    deleteAlert: "क्या आप वाकई इस सामुदायिक रिपोर्ट को हटाना चाहते हैं?",
    backToList: "सूची पर वापस जाएं",
    aiAnalysis: "जेमिनी स्मार्ट एआई विश्लेषण",
    description: "समस्या का विवरण",
    handling: "एआई सुरक्षा और निपटान दिशानिर्देश",
    speakTextBtn: "एआई विश्लेषण सुनें",
    stopSpeakBtn: "पढ़ना बंद करें",
    shareLocation: "स्थान और मानचित्र पिन साझा करें",
    shareSuccess: "सटीक मानचित्र स्थान और रिपोर्ट विवरण कॉपी हो गए! इसे व्हाट्सएप/टेलीग्राम पर साझा करें 🇮🇳",
    copyDetails: "विवरण कॉपी करें",
    shareOnWhatsApp: "व्हाट्सएप साझा करें",
    openInGoogleMaps: "गूगल मैप्स रूट",
  },
  MR: {
    aboutTitle: "स्वच्छ भारत x इकोरूट पोर्टल",
    aboutBody: "इकोरूट नागरिकांना थेट सफाई कर्मचाऱ्यांशी जोडते. कचऱ्याचा फोटो काढा आणि आमचे जेमिनी एआई कचरा प्रकार व सुरक्षा सूचनांचे वर्गीकरण करेल. नकाशावर पिन आणि अचूक समन्वय स्वयंचलितपणे सिंक होतात. स्वच्छ भारत अभियानात सामील व्हा! 🇮🇳",
    showAbout: "स्वच्छ भारत पोर्टल माहिती",
    heading: "तुमच्या कचरा तक्रारी",
    fileReport: "तक्रार नोंदवा",
    noReports: "अजून एकही तक्रार नाही",
    startReporting: "तक्रार करण्यास सुरुवात करा",
    noReportsSub: "नकाशावर जागा पिन करा आणि जेमिनीद्वारे कचऱ्याचे विश्लेषण व तक्रार नोंदवण्यासाठी फोटो अपलोड करा! आपला परिसर स्वच्छ ठेवूया.",
    position: "नकाशावरील जागा",
    deleteAlert: "तुम्हाला नक्की ही तक्रार हटवायची आहे का?",
    backToList: "यादीवर वापस जा",
    aiAnalysis: "जेमिनी स्मार्ट एआय विश्लेषण",
    description: "तक्रारीचे वर्णन",
    handling: "एआय सुरक्षा आणि विल्हेवाट मार्गदर्शक तत्त्वे",
    speakTextBtn: "एआई विश्लेषण ऐका",
    stopSpeakBtn: "वाचन थांबवा",
    shareLocation: "जागा आणि नकाशा पिन शेअर करा",
    shareSuccess: "अचूक नकाशा स्थान आणि तक्रार तपशील कॉपी केले! व्हॉट्सॲप/टेलिग्रामवर शेअर करा 🇮🇳",
    copyDetails: "तपशील कॉपी करा",
    shareOnWhatsApp: "व्हॉट्सॲप शेअर",
    openInGoogleMaps: "गूगल मॅप्स मार्ग",
  },
  TA: {
    aboutTitle: "தூய்மை இந்தியா x ஈகோரூட் போர்டல்",
    aboutBody: "ஈகோரூட் குடிமக்களை நேரடியாக தூய்மை பணியாளர்களுடன் இணைக்கிறது. கழிவுகளின் புகைப்படத்தை எடுத்தால், ஜெமினி ஏஐ கழிவு வகை மற்றும் பாதுகாப்பு வழிகாட்டுதல்களை வழங்கும். வரைபடப் பகிர்வும் ஒருங்கிணைப்பும் தடையின்றி இயங்கும். தூய்மை இந்தியா இயக்கத்தில் இணையுங்கள்! 🇮🇳",
    showAbout: "தூய்மை இந்தியா போர்டல் தகவல்",
    heading: "உங்கள் கழிவுப் புகார்கள்",
    fileReport: "புகார் செய்",
    noReports: "புகார்கள் எதுவும் பதிவு செய்யப்படவில்லை",
    startReporting: "புகார் செய்யத் தொடங்கு",
    noReportsSub: "வரைபடத்தில் ஒரு இடத்தை பின் செய்து, புகைப்படத்தை பதிவேற்றி ஜெமினி மூலம் பகுப்பாய்வு செய்து புகார் அளிக்கவும்! நம் பகுதியைத் தூய்மையாக வைத்திருப்போம்.",
    position: "வரைபட நிலை",
    deleteAlert: "இந்தப் புகாரை நிச்சயமாக நீக்க விரும்புகிறீர்களா?",
    backToList: "பட்டியலுக்குத் திரும்பு",
    aiAnalysis: "ஜெமினி ஸ்மார்ட் ஏஐ பகுப்பாய்வு",
    description: "புகார் விளக்கம்",
    handling: "ஏஐ பாதுகாப்பு மற்றும் கையாளுதல் வழிகாட்டுதல்",
    speakTextBtn: "ஏஐ பகுப்பாய்வைக் கேளுங்கள்",
    stopSpeakBtn: "வாசிப்பதை நிறுத்து",
    shareLocation: "இருப்பிடம் & வரைபடப் பகிர்வு",
    shareSuccess: "துல்லியமான வரைபட இருப்பிடம் & புகார்த் தகவல்கள் நகலெடுக்கப்பட்டன! வாட்ஸ்அப்/டெலிகிராமில் பகிருங்கள் 🇮🇳",
    copyDetails: "விவரங்களை நகலெடு",
    shareOnWhatsApp: "வாட்ஸ்அப் பகிர்வு",
    openInGoogleMaps: "கூகிள் மேப்ஸ் வழித்தடம்",
  },
};

export default function ResidentDashboard({
  reports,
  selectedReportId,
  onSelectReport,
  onDeleteReport,
  onStartNewReport,
  language = "EN",
}: ResidentDashboardProps) {
  const { currentUser } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = localTranslations[language] || localTranslations.EN;

  // Filter only current user's reports
  const userReports = reports.filter((r) => r.userId === currentUser?.uid);

  // Stop reading if selected report changes or language changes
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [selectedReportId, language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const selectedReport = reports.find((r) => r.id === selectedReportId);

  const handleDelete = (reportId: string, e: MouseEvent) => {
    e.stopPropagation(); // Avoid selecting the report when clicking delete
    setReportToDelete(reportId);
  };

  const triggerDelete = async (reportId: string) => {
    setDeletingId(reportId);
    try {
      const reportDocRef = doc(db, "reports", reportId);
      await deleteDoc(reportDocRef);
      onDeleteReport(reportId);
      setToastMessage(language === "EN" ? "Report deleted successfully! 🗑️" : "रिपोर्ट सफलतापूर्वक हटा दी गई! 🗑️");
      setTimeout(() => setToastMessage(null), 4000);
      setReportToDelete(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `reports/${reportId}`);
    } finally {
      setDeletingId(null);
    }
  };

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
      speechText = `कचरा विश्लेषण रिपोर्ट। कचरे का प्रकार है: ${selectedReport.wasteType}। गंभीरता स्तर: ${selectedReport.severity}। विवरण: ${selectedReport.description}। सुरक्षा निर्देश: ${selectedReport.handlingInstructions || "कोई विशेष निर्देश उपलब्ध नहीं है।"}`;
    } else if (language === "MR") {
      voiceLang = "mr-IN";
      speechText = `कचरा विश्लेषण अहवाल. कचऱ्याचा प्रकार: ${selectedReport.wasteType}. गांभीर्य पातळी: ${selectedReport.severity}. वर्णन: ${selectedReport.description}. सुरक्षा मार्गदर्शक तत्त्वे: ${selectedReport.handlingInstructions || "काही विशेष मार्गदर्शक तत्त्वे उपलब्ध नाहीत."}`;
    } else if (language === "TA") {
      voiceLang = "ta-IN";
      speechText = `கழிவு பகுப்பாய்வு அறிக்கை. கழிவு வகை: ${selectedReport.wasteType}. தீவிர நிலை: ${selectedReport.severity}. விளக்கம்: ${selectedReport.description}. பாதுகாப்பு வழிகாட்டுதல்கள்: ${selectedReport.handlingInstructions || "பாதுகாப்பு வழிகாட்டுதல்கள் ஏதுமில்லை."}`;
    } else {
      voiceLang = "en-IN";
      speechText = `Waste analysis report. Waste type is ${selectedReport.wasteType}. Severity level is ${selectedReport.severity}. Description: ${selectedReport.description}. Recommended safety advice is: ${selectedReport.handlingInstructions || "No special handling instructions provided."}`;
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = voiceLang;

    // Attempt to locate a matching native Indian or corresponding language voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(
      (v) =>
        v.lang.toLowerCase().includes(voiceLang.toLowerCase()) ||
        v.lang.startsWith(language.toLowerCase())
    );

    if (voice) {
      utterance.voice = voice;
    }

    utterance.rate = 0.9; // clear, comfortable pace
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Geospatial Map Sharing implementation
  const handleShareReport = async () => {
    if (!selectedReport) return;
    const { lat, lng } = selectedReport.location;
    const address = selectedReport.location.address || "Community Coordinates";

    const shareText = `🚨 *EcoRoute Swachh Bharat Waste Report Alert!*
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
    showToast(t.shareSuccess);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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

  const getStatusBadgeColor = (status: ReportStatus) => {
    switch (status) {
      case "Resolved":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "In Progress":
        return "bg-amber-50 text-amber-700 border-amber-100 animate-pulse";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const getStatusIcon = (status: ReportStatus) => {
    switch (status) {
      case "Resolved":
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case "In Progress":
        return <PlayCircle className="h-4 w-4 text-amber-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  // Render a detailed view panel when a specific report is selected
  if (selectedReport) {
    const { lat, lng } = selectedReport.location;
    return (
      <div className="bg-white rounded-xl border border-slate-100 p-5 flex flex-col h-full overflow-hidden shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Toast Alert popup */}
        {toastMessage && (
          <div className="absolute top-4 left-4 right-4 z-[9999] bg-slate-900/95 text-white p-3 rounded-xl text-xs font-semibold shadow-2xl flex items-center gap-2 border border-emerald-500 animate-in fade-in duration-150">
            <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="flex-1 leading-relaxed">{toastMessage}</span>
          </div>
        )}

        {/* Back navigation header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
          <button
            onClick={() => onSelectReport("")}
            className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.backToList}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase">
              ID: {selectedReport.id.slice(0, 8)}...
            </span>
            {selectedReport.userId === currentUser?.uid && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setReportToDelete(selectedReport.id);
                }}
                className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                title="Delete Report"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Photos: Before and After (if resolved) */}
          <div className="space-y-2">
            <div className="relative rounded-xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner">
              <img
                src={selectedReport.imageUrl}
                alt="Before cleanup"
                className="w-full h-44 object-cover"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-[9px] text-white px-2 py-0.5 rounded-md font-extrabold tracking-wider uppercase border border-white/15">
                Before Report
              </span>
            </div>

            {selectedReport.status === "Resolved" && selectedReport.afterImageUrl && (
              <div className="relative rounded-xl overflow-hidden border border-emerald-100 bg-emerald-50 shadow-inner animate-in zoom-in-95 duration-200">
                <img
                  src={selectedReport.afterImageUrl}
                  alt="After cleanup"
                  className="w-full h-44 object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-2.5 left-2.5 bg-emerald-600/95 backdrop-blur-sm text-[9px] text-white px-2 py-0.5 rounded-md font-extrabold tracking-wider uppercase border border-emerald-400/20">
                  Cleaned & Resolved 🇮🇳
                </span>
              </div>
            )}
          </div>

          {/* Heading info */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <h5 className="text-sm font-black text-slate-800 truncate">{selectedReport.wasteType}</h5>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border shrink-0 ${getSeverityBadgeColor(selectedReport.severity)}`}>
                {selectedReport.severity}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border ${getStatusBadgeColor(selectedReport.status)}`}>
                {getStatusIcon(selectedReport.status)}
                <span className="font-bold">{selectedReport.status}</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-semibold">
                {new Date(selectedReport.createdAt?.seconds ? selectedReport.createdAt.seconds * 1000 : selectedReport.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* SBM Slogan */}
          <div className="bg-gradient-to-r from-orange-50 via-white to-emerald-50 border-y border-slate-100 p-2 text-center">
            <span className="text-[10px] font-black tracking-wide text-orange-600 block">एक कदम स्वच्छता की ओर</span>
            <span className="text-[9px] text-emerald-700 font-semibold block">Swachh Bharat Mission • AI Smart Clean</span>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">{t.description}</span>
            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100 font-medium">
              {selectedReport.description}
            </p>
          </div>

          {/* Resolution Notes detail */}
          {selectedReport.status === "Resolved" && selectedReport.resolutionNotes && (
            <div className="space-y-1 animate-in slide-in-from-bottom-2 duration-150">
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider block">Cleanup Notes</span>
              <p className="text-xs text-slate-700 leading-relaxed bg-emerald-50/20 p-3 rounded-xl border border-emerald-100 font-medium">
                {selectedReport.resolutionNotes}
              </p>
            </div>
          )}

          {/* Interactive AI Safety + Speech Speaker section */}
          {selectedReport.handlingInstructions && (
            <div className="p-4 bg-emerald-50/35 border border-emerald-100/60 rounded-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-emerald-100/50 pb-2">
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-800">
                  <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse animate-duration-1000" />
                  {t.aiAnalysis}
                </div>
                
                {/* TTS Reader Toggle Button */}
                <button
                  onClick={handleToggleSpeech}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-extrabold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                    isSpeaking
                      ? "bg-rose-600 border-rose-500 text-white animate-pulse"
                      : "bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  }`}
                  title={isSpeaking ? t.stopSpeakBtn : t.speakTextBtn}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="h-3.5 w-3.5" />
                      {t.stopSpeakBtn}
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-3.5 w-3.5" />
                      {t.speakTextBtn}
                    </>
                  )}
                </button>
              </div>

              {/* Speech Soundwave graphic */}
              {isSpeaking && (
                <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1.5 rounded-lg border border-emerald-100 animate-in fade-in duration-200">
                  <div className="flex gap-0.5 items-end h-3">
                    <span className="w-0.75 bg-emerald-600 rounded-full animate-pulse" style={{ height: "40%", animationDelay: "0.1s" }}></span>
                    <span className="w-0.75 bg-emerald-600 rounded-full animate-pulse" style={{ height: "100%", animationDelay: "0.3s" }}></span>
                    <span className="w-0.75 bg-emerald-600 rounded-full animate-pulse" style={{ height: "60%", animationDelay: "0.2s" }}></span>
                    <span className="w-0.75 bg-emerald-600 rounded-full animate-pulse" style={{ height: "80%", animationDelay: "0.4s" }}></span>
                    <span className="w-0.75 bg-emerald-600 rounded-full animate-pulse" style={{ height: "30%", animationDelay: "0.15s" }}></span>
                  </div>
                  <span className="text-[9px] font-extrabold text-emerald-800 tracking-wide uppercase animate-pulse">
                    EcoRoute AI Voice is speaking...
                  </span>
                </div>
              )}

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-700/80 tracking-wider block">{t.handling}</span>
                <p className="text-xs text-slate-700 leading-relaxed font-semibold bg-white p-3 rounded-lg border border-emerald-100/40 whitespace-pre-line">
                  {selectedReport.handlingInstructions}
                </p>
              </div>
            </div>
          )}

          {/* Location details with Map Coordinates & exact map sharing */}
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Geospatial Clean-up Coordinates</span>
            
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4.5 w-4.5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-700 block">Reported Location Address</span>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                  {selectedReport.location.address || "Community Coordinates Pinned"}
                </p>
                <span className="text-[9px] text-slate-400 font-mono block mt-1">
                  Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                </span>
              </div>
            </div>

            {/* Sharing layout */}
            <div className="pt-2 border-t border-slate-200/50 flex flex-wrap gap-2">
              <button
                onClick={handleShareReport}
                className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                title={t.shareLocation}
              >
                <Share2 className="h-3.5 w-3.5" />
                {t.shareLocation}
              </button>

              <button
                onClick={() => copyToClipboard(`🚨 Waste Alert!\nType: ${selectedReport.wasteType}\n📍 Exact Pin: https://www.google.com/maps?q=${lat},${lng}`)}
                className="py-2 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title={t.copyDetails}
              >
                <Copy className="h-3.5 w-3.5" />
                {t.copyDetails}
              </button>

              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-100 text-sky-700 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 transition-colors"
                title={t.openInGoogleMaps}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t.openInGoogleMaps}
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex flex-col h-full overflow-hidden shadow-sm">
      {/* Dynamic Collapsible About Section */}
      {showAbout ? (
        <div className="mb-5 p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-xl shadow-md relative overflow-hidden animate-in fade-in duration-300">
          <button
            onClick={() => setShowAbout(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Dismiss details"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
            <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-300">{t.aboutTitle}</h5>
          </div>
          
          <p className="text-xs text-slate-200 leading-relaxed mb-3 font-semibold">
            {t.aboutBody}
          </p>
          
          <div className="flex flex-wrap items-center gap-2 text-[9px] text-emerald-300 font-extrabold">
            <span className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/10">✓ OpenStreetMap Pins</span>
            <span className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/10">✓ Google Gemini Multimodal</span>
            <span className="bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/10">✓ Swachhata AI Voice Reader</span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAbout(true)}
          className="mb-4 text-[10px] font-extrabold text-slate-500 hover:text-emerald-700 flex items-center gap-1 bg-slate-50 hover:bg-emerald-50 border border-slate-150 px-2.5 py-1.5 rounded-lg transition-all self-start cursor-pointer shadow-sm animate-in fade-in"
        >
          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
          {t.showAbout}
        </button>
      )}

      {/* Reports Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
        <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          {t.heading} ({userReports.length})
        </h4>
        <button
          onClick={onStartNewReport}
          className="text-xs font-extrabold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer border border-emerald-100/50"
        >
          <PlusCircle className="h-3.5 w-3.5" />
          {t.fileReport}
        </button>
      </div>

      {/* List content - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1" style={{ minHeight: "260px" }}>
        {userReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <AlertCircle className="h-8 w-8 text-slate-200 mb-2" />
            <p className="text-xs font-bold text-slate-500 mb-1">{t.noReports}</p>
            <p className="text-[11px] text-slate-400 max-w-xs mb-4 leading-relaxed font-medium">
              {t.noReportsSub}
            </p>
            <button
              onClick={onStartNewReport}
              className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-sm transition-colors cursor-pointer"
            >
              {t.startReporting}
            </button>
          </div>
        ) : (
          userReports.map((report) => (
            <div
              key={report.id}
              onClick={() => onSelectReport(report.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-4 relative overflow-hidden ${
                report.id === selectedReportId
                  ? "border-emerald-500 bg-emerald-50/10 shadow-sm"
                  : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/50"
              }`}
            >
              {report.imageUrl && (
                <img
                  src={report.imageUrl}
                  alt={report.wasteType}
                  className="w-14 h-14 rounded-lg object-cover border border-slate-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-slate-800 truncate">{report.wasteType}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${getSeverityBadgeColor(report.severity)}`}>
                    {report.severity}
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-500 truncate mb-2 font-medium">
                  {report.description}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeColor(report.status)}`}>
                      {getStatusIcon(report.status)}
                      <span className="font-bold">{report.status}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5 font-semibold">
                      <MapPin className="h-3 w-3" />
                      {t.position}
                    </span>
                  </div>
                  
                  {/* Delete Button */}
                  <button
                    disabled={deletingId === report.id}
                    onClick={(e) => handleDelete(report.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Report"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Custom Iframe-Safe Confirmation Modal for Deletion */}
      {reportToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-150 dark:border-slate-800 animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-150 dark:border-rose-900/30">
              <Trash2 className="h-6 w-6" />
            </div>
            
            <h3 className="text-sm font-black text-slate-800 dark:text-white mb-2 uppercase tracking-wide">
              {language === "EN" && "Delete Waste Report?"}
              {language === "HI" && "रिपोर्ट हटाएँ?"}
              {language === "MR" && "तक्रार हटवायची?"}
              {language === "TA" && "புகாரை நீக்கவா?"}
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed font-semibold">
              {t.deleteAlert}
            </p>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setReportToDelete(null)}
                className="flex-1 py-2 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200/20"
              >
                {language === "EN" && "Cancel"}
                {language === "HI" && "रद्द करें"}
                {language === "MR" && "रद्द करा"}
                {language === "TA" && "ரத்து செய்"}
              </button>
              <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => triggerDelete(reportToDelete)}
                className="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-rose-600/10 disabled:opacity-50"
              >
                {deletingId ? "..." : (language === "EN" ? "Delete" : language === "HI" ? "हटाएं" : language === "MR" ? "हटवा" : "நீக்கு")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
