import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Leaf, 
  User, 
  LogOut, 
  ShieldCheck, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  X,
  Lock,
  Compass,
  Sun,
  Moon,
  Globe
} from "lucide-react";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WasteReport } from "./types";
import ReportMap from "./components/ReportMap";
import ReportForm from "./components/ReportForm";
import StaffDashboard from "./components/StaffDashboard";
import ResidentDashboard from "./components/ResidentDashboard";
import NotificationBell from "./components/NotificationBell";
import AIChatbot from "./components/AIChatbot";
import LeaderboardAndRewards from "./components/LeaderboardAndRewards";
import ImpactAnalytics from "./components/ImpactAnalytics";
import CommunityDrives from "./components/CommunityDrives";
import ProfileModal from "./components/ProfileModal";

const translations = {
  EN: {
    title: "Swachh Bharat EcoRoute",
    subtitle: "Official Indian Cleanliness & AI Portal",
    residentMode: "Resident Portal",
    staffMode: "Swachh Staff Mode",
    opsDashboard: "Municipal Waste Dispatch & Operations Dashboard",
    opsSubtitle: "Monitor active community waste logs using Gemini AI severity guidelines under Swachh Bharat directives.",
    heroTitle: "Empower Your Community with Swachh Bharat",
    heroDesc: "EcoRoute combines the principles of the Clean India Mission (Swachh Bharat Mission) with Google Gemini AI. Instantly identify, classify, and dispatch clean-up solutions for neighborhood waste issues.",
    heroBadge: "स्वच्छ भारत मिशन • Clean India Mission",
    heroSec1Title: "AI Waste Classification & Guidance",
    heroSec1Desc: "Gemini classifies the waste material and safety severity level instantly from reported photos.",
    heroSec2Title: "Interactive Leaflet Geo-Mapping",
    heroSec2Desc: "Pin precise locations directly on the map. Get exact coordinate links for instant sharing with cleaning crews.",
    heroSec3Title: "Staff Proximity Operations",
    heroSec3Desc: "Filters and alerts dispatch staff precisely to local waste hazards within custom radii (5km, 10km, 20km).",
    logoutTitle: "Log Out",
    getStarted: "Launch Portal",
    signInSub: "Sign in with Google to file community issues, view local maps, and track resolution steps under the Swachh initiative.",
    signInGoogle: "Sign in with Google",
    footerCopyright: "© 2026 Swachh Bharat EcoRoute Portal. Government-aligned Civic AI System.",
    civicOps: "Civic Operations & Dispatch Online",
    exitForm: "Exit Form",
    geospatialRegistry: "Geospatial Waste Registry",
    geospatialDesc: "Visualizing active waste locations. Pin a new issue by clicking on the interactive map.",
    registryTab: "Geospatial Map & Logs",
    leaderboardTab: "Leaderboards & Rewards",
    analyticsTab: "AI Environmental Impact",
    drivesTab: "SBM Community Drives",
  },
  MR: {
    title: "स्वच्छ भारत इकोरूट",
    subtitle: "अधिकृत स्वच्छता आणि एआय पोर्टल",
    residentMode: "नागरिक पोर्टल",
    staffMode: "स्वच्छता कर्मचारी मोड",
    opsDashboard: "नगरपालिका कचरा नियंत्रण आणि संचालन",
    opsSubtitle: "स्वच्छ भारत निर्देशांनुसार जेमिनी एआईच्या मदतीने कचरा नोंदींचे निरीक्षण व नियंत्रण करा.",
    heroTitle: "स्वच्छ भारतासह आपल्या समुदायाला सक्षम बनवा",
    heroDesc: "इकोरूट स्वच्छ भारत मिशनच्या तत्त्वांना गुगल जेमिनी एआय सोबत जोडते. परिसरातील कचऱ्याची त्वरित ओळख पटवून त्याचे वर्गीकरण आणि निवारण करा.",
    heroBadge: "स्वच्छ भारत मिशन • एक पाऊल स्वच्छतेकडे",
    heroSec1Title: "एआय कचरा वर्गीकरण आणि मार्गदर्शन",
    heroSec1Desc: "जेमिनी फोटोंवरून कचऱ्याचा प्रकार आणि सुरक्षेचा स्तर त्वरित ठरवते.",
    heroSec2Title: "लीफलेट नकाशा",
    heroSec2Desc: "नकाशावर अचूक जागा पिन करा आणि सफाई कर्मचाऱ्यांसोबत थेट लोकेशन शेअर करा.",
    heroSec3Title: "कर्मचारी क्षेत्र संचालन",
    heroSec3Desc: "कर्मचाऱ्यांना त्यांच्या ५ किमी, १० किमी किंवा २० किमीच्या कार्यक्षेत्रातील कचऱ्याची माहिती अचूकपणे मिळते.",
    logoutTitle: "लॉग आउट",
    getStarted: "पोर्टल सुरू करा",
    signInSub: "स्वच्छता मोहिमेत सहभाग घेण्यासाठी, कचरा नोंदवण्यासाठी आणि निवारण ट्रॅक करण्यासाठी गुगलद्वारे लॉग इन करा.",
    signInGoogle: "गुगलद्वारे लॉग इन करा",
    footerCopyright: "© २०२६ स्वच्छ भारत इकोरूट पोर्टल. नागरिक एआय प्रणाली.",
    civicOps: "नागरिक संचालन आणि प्रेषण ऑनलाइन",
    exitForm: "फॉर्म बंद करा",
    geospatialRegistry: "भू-स्थानिक कचरा नोंदणी",
    geospatialDesc: "सक्रिय कचऱ्याची ठिकाणे नकाशावर पहा. नवीन तक्रार नोंदवण्यासाठी नकाशावर क्लिक करा.",
    registryTab: "भू-स्थानिक नकाशा आणि नोंदी",
    leaderboardTab: "लीडरबोर्ड आणि बक्षिसे",
    analyticsTab: "एआय पर्यावरण प्रभाव",
    drivesTab: "एसबीएम सामाजिक मोहीम",
  },
  TA: {
    title: "சுவச் பாரத் எகோரூட்",
    subtitle: "அதிகாரப்பூர்வ தூய்மை & ஏஐ போர்டல்",
    residentMode: "குடிமகன் போர்டல்",
    staffMode: "தூய்மை பணியாளர் பயன்முறை",
    opsDashboard: "நகராட்சி கழிவு மேலாண்மை மற்றும் கண்காணிப்பு",
    opsSubtitle: "சுவச் பாரத் வழிகாட்டுதல்களின் கீழ் ஜெமினி ஏஐ தொழில்நுட்பத்தைப் பயன்படுத்தி கழிவுகளைக் கண்காணித்து அகற்றுதல்.",
    heroTitle: "சுவச் பாரத் மூலம் உங்கள் சமூகத்தை மேம்படுத்துங்கள்",
    heroDesc: "எகோரூட் தூய்மை இந்தியா திட்டத்தின் கொள்கைகளை கூகுள் ஜெமினி ஏஐ-யுடன் இணைக்கிறது. சுற்றுப்புறக் கழிவுகளைக் கண்டறிந்து, வகைப்படுத்தி, உடனடியாக அகற்ற உதவுகிறது.",
    heroBadge: "தூய்மை இந்தியா இயக்கம் • சுவச் பாரத்",
    heroSec1Title: "ஏஐ கழிவு வகைப்பாடு மற்றும் வழிகாட்டுதல்",
    heroSec1Desc: "பதிவேற்றப்படும் புகைப்படங்களிலிருந்து கழிவுகளின் வகை மற்றும் தீவிரத்தன்மையை ஜெமினி உடனடியாகக் கண்டறிகிறது.",
    heroSec2Title: "ஊடாடும் வரைபட தொழில்நுட்பம்",
    heroSec2Desc: "வரைபடத்தில் துல்லியமான இடத்தை பின் செய்து, தூய்மைப் பணியாளர்களுக்கு எளிதாகப் பகிருங்கள்.",
    heroSec3Title: "பணியாளர் அருகாமை செயல்பாடுகள்",
    heroSec3Desc: "5 கிமீ, 10 கிமீ, 20 கிமீ எல்லைக்குள் இருக்கும் கழிவுகளைப் பணியாளர்கள் எளிதாகக் கண்டறிந்து அகற்றலாம்.",
    logoutTitle: "வெளியேறு",
    getStarted: "போர்டலைத் தொடங்கு",
    signInSub: "தூய்மைப் பணிகளில் பங்கேற்கவும், கழிவுகள் குறித்து புகாரளிக்கவும் கூகுள் மூலம் உள்நுழையவும்.",
    signInGoogle: "கூகுள் மூலம் உள்நுழைக",
    footerCopyright: "© 2026 சுவச் பாரத் எகோரூட் போர்டல். சிவிக் ஏஐ அமைப்பு.",
    civicOps: "குடிமை செயல்பாடுகள் மற்றும் கண்காணிப்பு ஆன்லைன்",
    exitForm: "படிவத்திலிருந்து வெளியேறு",
    geospatialRegistry: "கழிவு வரைபடப் பதிவு",
    geospatialDesc: "செயலில் உள்ள கழிவு இடங்களின் காட்சிப்பாடு. வரைபடத்தில் கிளிக் செய்து புதிய புகாரைப் பதிவு செய்யவும்.",
    registryTab: "வரைபடம் & கழிவுப் பதிவுகள்",
    leaderboardTab: "தரவரிசை & வெகுமதிகள்",
    analyticsTab: "ஏஐ சுற்றுச்சூழல் தாக்கம்",
    drivesTab: "கூட்டுத் தூய்மைப் பணிகள்",
  },
  HI: {
    title: "स्वच्छ भारत इकोरूट",
    subtitle: "आधिकारिक स्वच्छता और एआई पोर्टल",
    residentMode: "नागरिक पोर्टल",
    staffMode: "स्वच्छता स्टाफ मोड",
    opsDashboard: "नगर पालिका कचरा प्रेषण और संचालन",
    opsSubtitle: "स्वच्छ भारत निर्देशों के तहत जेमिनी एआई गंभीरता दिशानिर्देशों का उपयोग करके सक्रिय कचरा लॉग की निगरानी करें।",
    heroTitle: "स्वच्छ भारत के साथ अपने समुदाय को सशक्त बनाएं",
    heroDesc: "इकोरूट स्वच्छ भारत मिशन के सिद्धांतों को गूगल जेमिनी एआई के साथ जोड़ता है। आस-पास के कचरों की तुरंत पहचान करें, उन्हें वर्गीकृत करें और समाधान के लिए भेजें।",
    heroBadge: "स्वच्छ भारत मिशन • एक कदम स्वच्छता की ओर",
    heroSec1Title: "एआई कचरा वर्गीकरण और मार्गदर्शन",
    heroSec1Desc: "जेमिनी रिपोर्ट की गई तस्वीरों से कचरे की श्रेणी और सुरक्षा गंभीरता के स्तर को तुरंत वर्गीकृत करता है।",
    heroSec2Title: "इंटरैक्टिव लीफलेट भू-मानचित्रण",
    heroSec2Desc: "सटीक स्थानों को सीधे मानचित्र पर पिन करें। सफाई कर्मचारियों के साथ त्वरित साझाकरण के लिए सटीक निर्देशांक लिंक प्राप्त करें।",
    heroSec3Title: "कर्मचारी निकटता संचालन",
    heroSec3Desc: "त्रिज्या फिल्टर (5 किमी, 10 किमी, 20 किमी) कर्मचारियों को स्थानीय कचरों पर सटीक रूप से भेजते हैं।",
    logoutTitle: "लॉग आउट",
    getStarted: "पोर्टल शुरू करें",
    signInSub: "स्वच्छ पहल के तहत स्थानीय समस्याओं को दर्ज करने, नक्शे देखने और समाधान को ट्रैक करने के लिए गूगल के साथ लॉग इन करें।",
    signInGoogle: "गूगल के साथ लॉगिन करें",
    footerCopyright: "© 2026 स्वच्छ भारत इकोरूट पोर्टल। सरकार-संरेखित नागरिक एआई प्रणाली।",
    civicOps: "नागरिक संचालन और प्रेषण ऑनलाइन",
    exitForm: "फॉर्म से बाहर निकलें",
    geospatialRegistry: "भू-स्थानिक कचरा रजिस्ट्री",
    geospatialDesc: "सक्रिय कचरा स्थानों का दृश्य। नक्शे पर क्लिक करके एक नया मुद्दा पिन करें।",
    registryTab: "भू-स्थानिक मानचित्र और लॉग",
    leaderboardTab: "लीडरबोर्ड और पुरस्कार",
    analyticsTab: "एआई पर्यावरण प्रभाव",
    drivesTab: "एसबीएम सामुदायिक ड्राइव",
  }
};

const swachhGallery = {
  EN: [
    { title: "Plastic & Dry Waste Cleanup", desc: "Recycling plastic bottles, metal scraps, cardboard and paper waste under official Swachh standards.", tag: "Dry Waste", img: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=600" },
    { title: "Organic & Kitchen Compost", desc: "Diverting wet bio-degradable waste into local nutrient-rich composting systems.", tag: "Wet Waste", img: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=600" },
    { title: "Hazardous & E-Waste Handling", desc: "Securing toxic household batteries, chemicals and e-waste through Gemini safety guides.", tag: "Hazardous", img: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600" },
    { title: "Citizen Cleanup Sweep Drives", desc: "Promoting street hygiene and dust-free neighborhoods through collective voluntary drives.", tag: "Sanitation Drive", img: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=600" },
  ],
  HI: [
    { title: "प्लास्टिक और सूखा कचरा सफाई", desc: "स्वच्छ मानकों के तहत प्लास्टिक की बोतलों, धातु के स्क्रैप, कार्डबोर्ड और कागज के कचरों का पुनर्चक्रण।", tag: "सूखा कचरा", img: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=600" },
    { title: "गीला और रसोई कचरा खाद", desc: "गीले जैव-अपघट्य कचरों को पोषक तत्वों से भरपूर सामुदायिक खाद प्रणालियों में परिवर्तित करना।", tag: "गीला कचरा", img: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=600" },
    { title: "खतरनाक और ई-कचरा सुरक्षित प्रबंधन", desc: "जेमिनी सुरक्षा दिशानिर्देशों के माध्यम से बैटरी, रसायन और ई-कचरा का सुरक्षित पृथक्करण।", tag: "खतरनाक", img: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600" },
    { title: "नागरिक झाड़ू एवं सड़क स्वच्छता अभियान", desc: "सामुदायिक स्वच्छता अभियानों और स्वयंसेवक अभियानों द्वारा सड़कों को धूल-मुक्त बनाना।", tag: "स्वच्छता अभियान", img: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=600" },
  ],
  MR: [
    { title: "प्लास्टिक आणि सुका कचरा सफाई", desc: "अधिकृत स्वच्छ मानकांनुसार सुक्या प्लास्टिक बाटल्या, धातू आणि कागदी कचऱ्याचे योग्य पुनर्चक्रण.", tag: "सुका कचरा", img: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=600" },
    { title: "ओला आणि सेंद्रिय कचरा खत निर्मिती", desc: "ओल्या कचऱ्याची सुरक्षित विल्हेवाट लावून उत्कृष्ट सेंद्रिय खतामध्ये रूपांतर करणे.", tag: "ओला कचरा", img: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=600" },
    { title: "धोकादायक व ई-कचरा सुरक्षित विल्हेवाट", desc: "जेमिनी एआय सुरक्षा मार्गदर्शक तत्त्वांनुसार धोकादायक बॅटरी, रसायने आणि इलेक्ट्रॉनिक कचरा विलग करणे.", tag: "धोकादायक", img: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600" },
    { title: "सामुदायिक स्वच्छता व झाडू मोहीम", desc: "परिसर स्वच्छ आणि आरोग्यदायी राखण्यासाठी नागरिकांचा सामूहिक स्वच्छता पुढाकार.", tag: "स्वच्छता मोहीम", img: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=600" },
  ],
  TA: [
    { title: "பிளாஸ்டிக் & உலர் கழிவு சுத்திகரிப்பு", desc: "சுவச் தரநிலைகளின் கீழ் பிளாஸ்டிக் பாட்டில்கள், அட்டை மற்றும் காகிதக் கழிவுகளை மறுசுழற்சி செய்தல்.", tag: "உலர் கழிவு", img: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=600" },
    { title: "ஈரமான மற்றும் சமையலறை உரம்", desc: "ஈரமான கழிவுகளை இயற்கை உரமாக மாற்றி பூங்காக்கள் மற்றும் தோட்டங்களுக்குப் பயன்படுத்துதல்.", tag: "ஈரக் கழிவு", img: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=600" },
    { title: "அபாயகரமான மற்றும் மின்-கழிவு மேலாண்மை", desc: "பேட்டரிகள், இரசாயனங்கள் மற்றும் மின்னணுக் கழிவுகளை ஜெமினி ஏஐ பாதுகாப்போடு கையாளுதல்.", tag: "அபாயகரமானது", img: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600" },
    { title: "டிஜிட்டல் தூய்மை இந்தியா மக்கள் இயக்கம்", desc: "குடிமக்களின் கூட்டு பங்களிப்போடு தெருக்களை சுத்தமாகவும் சுகாதாரமாகவும் பேணுதல்.", tag: "சுற்றுப்புற தூய்மை", img: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&q=80&w=600" },
  ]
};

function AppContent() {
  const { currentUser, userProfile, loading, login, loginAsStaff, logout, toggleRole } = useAuth();

  // State
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [viewMode, setViewMode] = useState<"resident" | "staff">("resident");
  const [activeResidentTab, setActiveResidentTab] = useState<"registry" | "leaderboard" | "analytics" | "drives">("registry");
  const [language, setLanguage] = useState<"EN" | "HI" | "MR" | "TA">("EN");
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Homepage Tabbed Auth States
  const [authTab, setAuthTab] = useState<"resident" | "staff">("resident");
  const [staffId, setStaffId] = useState("");
  const [staffPass, setStaffPass] = useState("");
  const [staffLoginError, setStaffLoginError] = useState("");

  // Load reports in real-time
  useEffect(() => {
    if (!currentUser) {
      setReports([]);
      return;
    }

    const reportsRef = collection(db, "reports");
    const q = query(reportsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: WasteReport[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
          } as WasteReport);
        });
        setReports(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, "reports");
      }
    );

    return unsubscribe;
  }, [currentUser]);

  // Sync viewMode with userProfile role if role changes
  useEffect(() => {
    if (userProfile) {
      setViewMode(userProfile.role === "staff" ? "staff" : "resident");
    }
  }, [userProfile]);

  const handleMapClick = (lat: number, lng: number) => {
    if (!currentUser) return;
    setSelectedCoords({ lat, lng });
    setIsReporting(true);
    setSelectedReportId(null);
  };

  const handleReportSuccess = (newReport: WasteReport) => {
    setReports((prev) => [newReport, ...prev]);
    setIsReporting(false);
    setSelectedCoords(null);
    setSelectedReportId(newReport.id);
  };

  const handleReportDelete = (deletedId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== deletedId));
    if (selectedReportId === deletedId) {
      setSelectedReportId(null);
    }
  };

  const handleReportUpdate = (updatedReport: WasteReport) => {
    setReports((prev) => prev.map((r) => (r.id === updatedReport.id ? updatedReport : r)));
  };

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm animate-pulse">
            <Leaf className="h-8 w-8 text-emerald-600 animate-bounce" />
          </div>
          <div className="text-sm font-bold text-slate-700">Loading EcoRoute...</div>
          <p className="text-xs text-slate-400">Syncing with civic network database</p>
        </div>
      </div>
    );
  }

  const currentT = translations[language] || translations.EN;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${isDarkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-800"}`}>
      {/* Tri-color border signifying official Indian context */}
      <div className="h-1 w-full bg-gradient-to-r from-orange-500 via-slate-100 to-emerald-600 sticky top-0 z-[51]"></div>

      {/* Navigation Header */}
      <header className={`border-b sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-sm transition-colors ${isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white/85 backdrop-blur-md border-slate-100"}`}>
        <div className="flex items-center gap-3">
          <div 
            onClick={() => currentUser && setIsProfileOpen(true)}
            className={`flex items-center gap-3 ${currentUser ? "cursor-pointer group hover:opacity-90 active:scale-[0.98]" : ""} transition-all`}
            title={currentUser ? "Click to complete / edit your profile" : ""}
          >
            <div className="p-2 bg-gradient-to-br from-orange-500 via-white to-emerald-500 text-emerald-800 rounded-xl shadow-md border border-slate-100 relative">
              <Leaf className="h-5 w-5 text-emerald-700" />
              {currentUser && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white dark:border-slate-900 animate-pulse" />
              )}
            </div>
            <div>
              <span className={`text-base font-black tracking-tight block ${isDarkMode ? "text-white" : "text-slate-800"} flex items-center gap-1.5`}>
                {currentT.title}
                {currentUser && (
                  <span className="text-[8px] font-black uppercase text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 bg-emerald-500/10 px-1.5 py-0.5 rounded opacity-80 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Complete Profile ⚙️
                  </span>
                )}
              </span>
              <span className={`text-[9px] font-extrabold uppercase tracking-wider block -mt-0.5 ${isDarkMode ? "text-emerald-400" : "text-emerald-600"}`}>
                {currentT.subtitle}
              </span>
            </div>
          </div>
          
          {/* Swachh Bharat Specs Logo Accent */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-150/80 dark:border-slate-700/60">
            <div className="flex -space-x-1 text-[8px] font-black text-emerald-700 dark:text-emerald-400 font-serif">
              <span className="border-1.5 border-emerald-600 dark:border-emerald-400 rounded-full w-4.5 h-4.5 flex items-center justify-center bg-white dark:bg-slate-900">स्वच्छ</span>
              <span className="border-1.5 border-emerald-600 dark:border-emerald-400 rounded-full w-4.5 h-4.5 flex items-center justify-center bg-white dark:bg-slate-900">भारत</span>
            </div>
            <span className="text-[7.5px] font-extrabold text-slate-500 dark:text-slate-400 tracking-wider">एक कदम स्वच्छता की ओर</span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {/* Universal Controls */}
          <div className="flex items-center gap-2">
            {/* Language Dropdown */}
            <div className={`relative flex items-center px-2 py-1.5 rounded-xl border ${isDarkMode ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
              <Globe className="h-3.5 w-3.5 text-slate-500 mr-1 shrink-0" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className={`bg-transparent text-xs font-bold focus:outline-none border-none pr-1 cursor-pointer ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}
              >
                <option value="EN" className="text-slate-800">EN (English)</option>
                <option value="HI" className="text-slate-800">HI (हिंदी)</option>
                <option value="MR" className="text-slate-800">MR (मराठी)</option>
                <option value="TA" className="text-slate-800">TA (தமிழ்)</option>
              </select>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isDarkMode
                  ? "bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700"
                  : "bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
              }`}
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>

          {currentUser && userProfile ? (
            <div className="flex items-center gap-3 md:gap-4">
              {/* Badge indicating active mode */}
              <div className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-lg border tracking-wider flex items-center gap-1.5 ${
                userProfile.role === "staff"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400"
              }`}>
                {userProfile.role === "staff" ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {currentT.staffMode}
                  </>
                ) : (
                  <>
                    <User className="h-3.5 w-3.5" />
                    {currentT.residentMode}
                  </>
                )}
              </div>

              {/* Notifications Bell */}
              <NotificationBell onSelectReport={(reportId) => {
                setSelectedReportId(reportId);
                setIsReporting(false);
              }} />

              {/* Profile Menu */}
              <div className={`flex items-center gap-2 pl-2 border-l ${isDarkMode ? "border-slate-800" : "border-slate-200"}`}>
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-200">
                    {currentUser.displayName?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
                <div className="hidden md:block text-left">
                  <div className={`text-xs font-bold truncate max-w-[120px] ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>
                    {currentUser.displayName}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize">
                    {userProfile.role}
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Log Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              {currentT.secured}
            </div>
          )}
        </div>
      </header>

      {currentUser ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
          {viewMode === "staff" ? (
            /* Admin Staff Dashboard View */
            <div className="lg:col-span-12 h-full">
              <div className="mb-4">
                <h2 className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-slate-800"}`}>{currentT.opsDashboard}</h2>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{currentT.opsSubtitle}</p>
              </div>
              <StaffDashboard
                reports={reports}
                selectedReportId={selectedReportId}
                onSelectReport={(id) => setSelectedReportId(id)}
                onReportUpdated={handleReportUpdate}
                language={language}
              />
            </div>
          ) : (
            /* Citizen / Resident View */
            <>
              {/* Resident Tab Bar Switcher */}
              <div className="lg:col-span-12 flex flex-wrap items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800 gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveResidentTab("registry")}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
                      activeResidentTab === "registry"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border-transparent"
                    }`}
                  >
                    <Compass className="h-4 w-4" />
                    {currentT.registryTab}
                  </button>

                  <button
                    onClick={() => setActiveResidentTab("leaderboard")}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
                      activeResidentTab === "leaderboard"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border-transparent"
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    {currentT.leaderboardTab}
                  </button>

                  <button
                    onClick={() => setActiveResidentTab("analytics")}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
                      activeResidentTab === "analytics"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border-transparent"
                    }`}
                  >
                    <Globe className="h-4 w-4 animate-spin" style={{ animationDuration: "12s" }} />
                    {currentT.analyticsTab}
                  </button>

                  <button
                    onClick={() => setActiveResidentTab("drives")}
                    className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border ${
                      activeResidentTab === "drives"
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                        : "bg-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white border-transparent"
                    }`}
                  >
                    <User className="h-4 w-4" />
                    {currentT.drivesTab}
                  </button>
                </div>
              </div>

              {activeResidentTab === "registry" && (
                <>
                  {/* Left Column: Interactive Map */}
                  <div className="lg:col-span-7 flex flex-col h-[500px] lg:h-[650px] gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className={`text-lg font-bold flex items-center gap-1.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                          <Compass className="h-4 w-4 text-emerald-600" />
                          {currentT.geospatialRegistry}
                        </h2>
                        <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                          {currentT.geospatialDesc}
                        </p>
                      </div>
                      {isReporting && (
                        <button
                          onClick={() => {
                            setIsReporting(false);
                            setSelectedCoords(null);
                          }}
                          className="text-xs font-semibold text-rose-600 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          {currentT.exitForm}
                        </button>
                      )}
                    </div>

                    <div className="flex-1">
                      <ReportMap
                        reports={reports}
                        selectedReportId={selectedReportId}
                        onMapClick={handleMapClick}
                        newReportCoords={selectedCoords}
                      />
                    </div>
                  </div>

                  {/* Right Column: Submission Form OR Personal Log */}
                  <div className="lg:col-span-5 h-[500px] lg:h-[650px]">
                    <AnimatePresence mode="wait">
                      {isReporting ? (
                        <motion.div
                          key="report-form"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ duration: 0.2 }}
                          className="h-full"
                        >
                          <ReportForm
                            selectedCoords={selectedCoords}
                            onCoordsChange={setSelectedCoords}
                            existingReports={reports}
                            onSuccess={handleReportSuccess}
                            onCancel={() => {
                              setIsReporting(false);
                              setSelectedCoords(null);
                            }}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="resident-dashboard"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2 }}
                          className="h-full"
                        >
                          <ResidentDashboard
                            reports={reports}
                            selectedReportId={selectedReportId}
                            onSelectReport={(id) => setSelectedReportId(id)}
                            onDeleteReport={handleReportDelete}
                            onStartNewReport={() => {
                              setIsReporting(true);
                              setSelectedReportId(null);
                            }}
                            language={language}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {activeResidentTab === "leaderboard" && (
                <div className="lg:col-span-12 h-full min-h-[580px]">
                  <LeaderboardAndRewards reports={reports} language={language} isDarkMode={isDarkMode} />
                </div>
              )}

              {activeResidentTab === "analytics" && (
                <div className="lg:col-span-12 h-full min-h-[580px]">
                  <ImpactAnalytics reports={reports} language={language} isDarkMode={isDarkMode} />
                </div>
              )}

              {activeResidentTab === "drives" && (
                <div className="lg:col-span-12 h-full min-h-[580px]">
                  <CommunityDrives language={language} isDarkMode={isDarkMode} onOpenProfile={() => setIsProfileOpen(true)} />
                </div>
              )}
            </>
          )}
        </main>
      ) : (
        /* Sign In / Hero View */
        <main className="flex-1 flex flex-col justify-center items-center px-6 py-12 md:py-24 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
            <div className="text-center md:text-left space-y-6">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${isDarkMode ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>
                <Sparkles className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                {currentT.heroBadge}
              </div>
              <h1 className={`text-4xl md:text-5xl font-black tracking-tight leading-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                {currentT.heroTitle} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">EcoRoute</span>
              </h1>
              <p className={`text-sm md:text-base leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {currentT.heroDesc}
              </p>

              <div className="space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isDarkMode ? "bg-emerald-950/50 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-left">
                    <span className={`font-bold block ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{currentT.heroSec1Title}</span>
                    <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>{currentT.heroSec1Desc}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isDarkMode ? "bg-emerald-950/50 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-left">
                    <span className={`font-bold block ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{currentT.heroSec2Title}</span>
                    <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>{currentT.heroSec2Desc}</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${isDarkMode ? "bg-emerald-950/50 text-emerald-400" : "bg-emerald-50 text-emerald-600"}`}>
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="text-xs text-left">
                    <span className={`font-bold block ${isDarkMode ? "text-slate-200" : "text-slate-700"}`}>{currentT.heroSec3Title}</span>
                    <span className={isDarkMode ? "text-slate-400" : "text-slate-500"}>{currentT.heroSec3Desc}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Authentication Card */}
            <div className={`rounded-3xl p-6 border shadow-xl max-w-sm mx-auto w-full flex flex-col items-center transition-all ${isDarkMode ? "bg-slate-900 border-slate-800 shadow-slate-950/50" : "bg-white border-slate-100 shadow-xl"}`}>
              {/* Card Header Brand Icon */}
              <div className={`p-3 rounded-2xl border mb-4 flex items-center justify-center ${isDarkMode ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-400" : "bg-gradient-to-tr from-emerald-50 to-teal-50 text-emerald-600 border-emerald-100"}`}>
                <Leaf className="h-6 w-6 text-emerald-500 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              
              {/* Interactive Login Tabs */}
              <div className="flex w-full p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-5 border border-slate-200/50 dark:border-slate-700/50">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("resident");
                    setStaffLoginError("");
                  }}
                  className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
                    authTab === "resident"
                      ? isDarkMode ? "bg-slate-950 text-emerald-400 shadow-sm" : "bg-white text-emerald-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Citizen Resident
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("staff");
                    setStaffLoginError("");
                  }}
                  className={`flex-1 py-2 text-[11px] font-black rounded-lg transition-all cursor-pointer uppercase tracking-wider ${
                    authTab === "staff"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  }`}
                >
                  Swachh Staff
                </button>
              </div>

              {authTab === "resident" ? (
                <div className="w-full flex flex-col items-center text-center">
                  <h3 className={`text-base font-extrabold mb-1.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>{currentT.getStarted}</h3>
                  <p className={`text-[11px] leading-relaxed mb-6 max-w-[260px] font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    {currentT.signInSub}
                  </p>

                  <button
                    onClick={login}
                    className={`w-full py-3 px-4 border rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${isDarkMode ? "bg-slate-800 border-slate-700 text-white hover:bg-slate-700" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"}`}
                  >
                    {/* Google Icon */}
                    <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22-.03-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    {currentT.signInGoogle}
                  </button>
                </div>
              ) : (
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setStaffLoginError("");
                    const success = await loginAsStaff(staffId, staffPass);
                    if (!success) {
                      setStaffLoginError("Invalid credentials. Please use staff123 and swachh2026.");
                    }
                  }}
                  className="w-full flex flex-col text-left space-y-4"
                >
                  <div>
                    <h3 className={`text-base font-extrabold mb-1 text-center ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                      Staff Portal Secure Access
                    </h3>
                    <p className={`text-[10px] text-center leading-relaxed mb-1 font-medium ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                      Access the Municipal Waste Dispatch & proximity Operations Console.
                    </p>
                  </div>

                  {staffLoginError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold text-rose-500 text-center">
                      {staffLoginError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className={`text-[10px] font-black uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Staff Username / ID
                    </label>
                    <input
                      type="text"
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      placeholder="Enter ID (e.g., staff123)"
                      required
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all ${
                        isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600" 
                          : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                      }`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-black uppercase tracking-wider block ${isDarkMode ? "text-slate-400" : "text-slate-600"}`}>
                      Security Password
                    </label>
                    <input
                      type="password"
                      value={staffPass}
                      onChange={(e) => setStaffPass(e.target.value)}
                      placeholder="Enter password (e.g., swachh2026)"
                      required
                      className={`w-full text-xs px-3.5 py-2.5 rounded-xl border font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/25 transition-all ${
                        isDarkMode 
                          ? "bg-slate-950 border-slate-800 text-white placeholder-slate-600" 
                          : "bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400"
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify & Login as Staff
                  </button>

                  <div className="text-[9px] text-center font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg border border-slate-150/40 dark:border-slate-800/40">
                    💡 Tip: Try typing <span className="text-emerald-600 dark:text-emerald-400">staff123</span> & <span className="text-emerald-600 dark:text-emerald-400">swachh2026</span>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Swachh Bharat - Cleanliness Visual Waste Gallery */}
          <div className="mt-16 pt-12 border-t border-slate-200/50 dark:border-slate-800/50 w-full">
            <div className="flex flex-col items-center text-center space-y-3 mb-10">
              {/* Spectacular Specs Icon */}
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 px-3.5 py-1.5 rounded-full border border-emerald-150/80 dark:border-emerald-800/80 shadow-sm">
                <div className="flex -space-x-1.5 text-[10px] font-black text-emerald-700 dark:text-emerald-400 font-serif">
                  <span className="border-2 border-emerald-600 dark:border-emerald-500 rounded-full w-5.5 h-5.5 flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm font-semibold">स्वच्छ</span>
                  <span className="border-2 border-emerald-600 dark:border-emerald-500 rounded-full w-5.5 h-5.5 flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm font-semibold">भारत</span>
                </div>
                <span className="text-[9px] font-extrabold text-slate-600 dark:text-slate-300 tracking-wider uppercase">स्वच्छ भारत अभियान • Clean India Drive</span>
              </div>
              <h2 className={`text-2xl font-black tracking-tight ${isDarkMode ? "text-white" : "text-slate-800"}`}>
                {language === "HI" ? "स्वच्छ भारत कचरा श्रेणियां और सफाई प्रक्रियाएं" :
                 language === "MR" ? "स्वच्छ भारत कचरा वर्गीकरण आणि स्वच्छता मोहीम" :
                 language === "TA" ? "சுவச் பாரத் கழிவு வகைகள் மற்றும் தூய்மை பணிகள்" :
                 "Swachh Bharat Waste Categories & Clean-up Drives"}
              </h2>
              <p className={`text-xs max-w-xl leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                {language === "HI" ? "हमारे नागरिक और सफाई दल कचरों की विभिन्न श्रेणियों की पहचान करने और उनका सुरक्षित निपटान सुनिश्चित करने के लिए एआई सहायता का उपयोग करते हैं।" :
                 language === "MR" ? "आमचे नागरिक आणि सफाई कर्मचारी विविध प्रकारच्या कचऱ्याची विल्हेवाट लावण्यासाठी जेमिनी एआय तंत्रज्ञानाचा वापर करतात." :
                 language === "TA" ? "எங்கள் குடிமக்களும் தூய்மை பணியாளர்களும் பல்வேறு கழிவுகளை கண்டறிந்து பாதுகாப்பாக அகற்ற ஜெமினி ஏஐ தொழில்நுட்பத்தை பயன்படுத்துகின்றனர்." :
                 "Our citizens and civic sanitation teams leverage Gemini AI to identify, categorize, and execute safe disposal protocols for various types of municipal waste."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(swachhGallery[language] || swachhGallery.EN).map((item, idx) => (
                <div 
                  key={idx}
                  className={`group rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col ${
                    isDarkMode ? "bg-slate-900 border-slate-800 hover:border-emerald-700/50" : "bg-white border-slate-100 hover:border-emerald-300"
                  }`}
                >
                  <div className="relative h-44 overflow-hidden bg-slate-100">
                    <img 
                      src={item.img} 
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white font-extrabold text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
                      {item.tag}
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h4 className={`text-xs font-black leading-tight ${isDarkMode ? "text-slate-100" : "text-slate-800"}`}>
                        {item.title}
                      </h4>
                      <p className={`text-[11px] leading-relaxed line-clamp-3 ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                        {item.desc}
                      </p>
                    </div>
                    <div className="pt-3.5 border-t border-slate-100 dark:border-slate-800/60 mt-4 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 tracking-wide uppercase">
                        Swachh Standard
                      </span>
                      <div className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className={`border-t py-6 px-6 text-center text-xs mt-auto transition-colors ${isDarkMode ? "bg-slate-900 border-slate-800 text-slate-500" : "bg-white border-slate-100 text-slate-400"}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            {currentT.footerCopyright}
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {currentT.civicOps}
            </span>
          </div>
        </div>
      </footer>

      {/* Global AI Chatbot */}
      <AIChatbot />

      {/* Profile Complete / Edit Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        language={language}
        isDarkMode={isDarkMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
