export type SeverityType = "Low" | "Medium" | "High" | "Critical";
export type ReportStatus = "Pending" | "In Progress" | "Resolved";
export type UserRole = "user" | "staff";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  createdAt: string;
}

export interface WasteReport {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  imageUrl: string; // Base64 compressed image
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  wasteType: string;
  severity: SeverityType;
  description: string;
  status: ReportStatus;
  handlingInstructions?: string;
  afterImageUrl?: string; // Mandatory photo showing cleaned area
  resolutionNotes?: string; // Accountability notes from staff
  createdAt: any; // Firebase Timestamp or ISO string
  updatedAt: any; // Firebase Timestamp or ISO string
}

export interface AppNotification {
  id: string;
  userId: string;
  reportId: string;
  wasteType: string;
  oldStatus: ReportStatus;
  newStatus: ReportStatus;
  message: string;
  read: boolean;
  emailSent?: boolean;
  createdAt: any; // Firebase Timestamp or ISO string
}

