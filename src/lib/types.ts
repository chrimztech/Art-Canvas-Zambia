export type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type ArtworkSummary = {
  id: string;
  slug: string;
  title: string;
  priceZmw: number;
  coverImageUrl: string | null;
  medium: string | null;
  artistId: string;
  artistDisplayName: string | null;
  status: string;
  viewCount: number;
  createdAt: string;
};

export type ArtworkDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  medium: string | null;
  dimensions: string | null;
  yearCreated: number | null;
  priceZmw: number;
  isOriginal: boolean;
  editionSize: number | null;
  status: string;
  coverImageUrl: string | null;
  viewCount: number;
  categoryId: string | null;
  artistId: string;
  artistDisplayName: string | null;
  artistBio: string | null;
  artistAvatarUrl: string | null;
  images: string[];
  createdAt: string;
  materials: string | null;
  style: string | null;
  tags: string[];
  weightKg: number | null;
  framed: boolean;
  provenance: string | null;
  signed: boolean;
  signatureLocation: string | null;
  certificateOfAuthenticity: boolean;
  surface: string | null;
  orientation: string | null;
  shippingNotes: string | null;
  readyToHang: boolean;
  originCity: string | null;
  originCountry: string | null;
};

export type ArtistSummary = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  artworkCount: number;
};

export type ArtistDetail = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  instagram: string | null;
  artworks: ArtworkSummary[];
};

export type Profile = {
  id: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  website: string | null;
  instagram: string | null;
  phone: string | null;
  coverImageUrl: string | null;
  facebookUrl: string | null;
  twitterUrl: string | null;
  tiktokUrl: string | null;
  specialties: string[];
  yearsExperience: number | null;
  verified: boolean;
  payoutMethod: "momo" | "bank" | null;
  payoutPhone: string | null;
  payoutBankName: string | null;
  payoutReceiverId: string | null;
};

export type CartItem = {
  id: string;
  quantity: number;
  itemType: "ARTWORK" | "SUPPLY";
  itemId: string;
  artworkId: string | null;
  title: string;
  slug: string;
  priceZmw: number;
  coverImageUrl: string | null;
};

export type CheckoutRequest = {
  paymentMethod: "card" | "momo";
  phone: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
};

export type CheckoutResponse = {
  orderId: string;
  orderNumber: string;
  total: number;
  paymentMethod: "card" | "momo";
  redirectUrl: string | null;
  message: string | null;
};

export type OrderSummary = {
  id: string;
  orderNumber: string;
  status: string;
  totalZmw: number;
  paymentProvider: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: string;
  artworkId: string | null;
  itemType: "ARTWORK" | "SUPPLY" | "CLASS" | "EXHIBITION";
  referenceId: string | null;
  title: string;
  unitPriceZmw: number;
  quantity: number;
  lineTotalZmw: number;
  platformFeeZmw: number;
  royaltyZmw: number;
  artistPayoutZmw: number;
};

export type OrderDetail = {
  id: string;
  orderNumber: string;
  status: string;
  subtotalZmw: number;
  platformFeeZmw: number;
  royaltyZmw: number;
  totalZmw: number;
  paymentProvider: string | null;
  paymentReference: string | null;
  createdAt: string;
  items: OrderItem[];
};

export type Sale = {
  id: string;
  title: string;
  quantity: number;
  lineTotalZmw: number;
  platformFeeZmw: number;
  royaltyZmw: number;
  artistPayoutZmw: number;
  createdAt: string;
  orderNumber: string | null;
  orderStatus: string | null;
};

export type Commission = {
  id: string;
  customerId: string;
  artistId: string | null;
  artistDisplayName: string | null;
  title: string;
  brief: string;
  budgetZmw: number | null;
  quotedPriceZmw: number | null;
  deadline: string | null;
  status: string;
  createdAt: string;
};

export type Supply = {
  id: string;
  slug: string;
  name: string;
  priceZmw: number;
  coverImageUrl: string | null;
  category: string | null;
  condition: string;
  stock: number;
  status: string;
  brand: string | null;
};

export type SupplyDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  condition: string;
  priceZmw: number;
  stock: number;
  coverImageUrl: string | null;
  status: string;
  sellerId: string;
  sellerDisplayName: string | null;
  sellerLocation: string | null;
  sellerPhone: string | null;
  brand: string | null;
  sku: string | null;
  dimensions: string | null;
  weightKg: number | null;
  warrantyMonths: number | null;
  tags: string[];
  images: string[];
};

export type ClassItem = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  mode: string;
  location: string | null;
  meetingUrl: string | null;
  startsAt: string;
  endsAt: string;
  capacity: number;
  priceZmw: number;
  status: string;
  instructorId: string;
  instructorDisplayName: string | null;
  skillLevel: string | null;
  prerequisites: string | null;
  syllabus: string | null;
  tags: string[];
  materialsIncluded: boolean;
};

export type Exhibition = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  venue: string;
  city: string | null;
  startsAt: string;
  endsAt: string;
  ticketPriceZmw: number;
  capacity: number | null;
  status: string;
  organizerId: string;
  organizerDisplayName: string | null;
  curatorName: string | null;
  theme: string | null;
  tags: string[];
  contactEmail: string | null;
  contactPhone: string | null;
  isFeatured: boolean;
};

export type Enrollment = {
  id: string;
  classId: string;
  classTitle: string | null;
  classSlug: string | null;
  classCoverImageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: string;
  amountPaidZmw: number | null;
  createdAt: string;
};

export type Ticket = {
  id: string;
  exhibitionId: string;
  exhibitionTitle: string | null;
  exhibitionSlug: string | null;
  exhibitionCoverImageUrl: string | null;
  startsAt: string | null;
  endsAt: string | null;
  quantity: number;
  totalZmw: number;
  status: string;
  createdAt: string;
  qrCode: string | null;
  checkedInAt: string | null;
};

export type AdminUser = {
  id: string;
  displayName: string | null;
  email: string | null;
  createdAt: string;
  roles: string[];
  verified: boolean;
};

export type PermissionInfo = { name: string; description: string };

export type RolePermissions = { role: string; permissions: string[] };

export type PermissionOverride = { permission: string; granted: boolean };

export type UserPermissions = { userId: string; effective: string[]; overrides: PermissionOverride[] };

export type PasswordReset = { tempPassword: string };

export type AdminSupply = {
  id: string;
  slug: string;
  name: string;
  priceZmw: number;
  coverImageUrl: string | null;
  category: string | null;
  condition: string;
  stock: number;
  status: string;
  sellerId: string;
  sellerDisplayName: string | null;
  createdAt: string;
};

export type AdminCommission = {
  id: string;
  customerId: string;
  customerDisplayName: string | null;
  artistId: string | null;
  artistDisplayName: string | null;
  title: string;
  brief: string;
  budgetZmw: number | null;
  quotedPriceZmw: number | null;
  deadline: string | null;
  status: string;
  createdAt: string;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  status: string;
  totalZmw: number;
  paymentProvider: string | null;
  paymentReference: string | null;
  createdAt: string;
  buyerId: string;
  buyerDisplayName: string | null;
  buyerEmail: string | null;
};

export type PlatformSettings = {
  platformFeePercent: number;
  developerRoyaltyPercent: number;
  currency: string;
  paymentProvider: string | null;
  heroImageUrl: string | null;
  developerPayoutMethod: "momo" | "bank" | null;
  developerPayoutPhone: string | null;
  developerPayoutBankName: string | null;
  developerPayoutReceiverId: string | null;
  ownerPayoutMethod: "momo" | "bank" | null;
  ownerPayoutPhone: string | null;
  ownerPayoutBankName: string | null;
  ownerPayoutReceiverId: string | null;
};

export type PublicSiteSettings = {
  heroImageUrl: string | null;
};

export type UploadResponse = { url: string };

export type PayoutRequest = {
  id: string;
  artistId: string | null;
  artistDisplayName: string | null;
  payeeType: "SELLER" | "DEVELOPER" | "OWNER";
  amountZmw: number;
  method: "momo" | "bank";
  phone: string | null;
  bankName: string | null;
  receiverId: string | null;
  referenceNo: string;
  status: "requested" | "approved" | "processing" | "paid" | "failed" | "rejected";
  adminNote: string | null;
  createdAt: string;
};

export type AvailableBalance = {
  totalEarned: number;
  alreadyPaidOut: number;
  availableBalance: number;
};

export type PlatformBalance = {
  payeeType: "DEVELOPER" | "OWNER";
  totalEarned: number;
  alreadyPaidOut: number;
  availableBalance: number;
};

export type WalletBalance = {
  disbursementBalance: string | null;
  collectionBalance: string | null;
  message: string | null;
};

export type Session = {
  id: string;
  userId: string;
  userDisplayName: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  current: boolean;
  active: boolean;
};

export type AuditLog = {
  id: string;
  actorId: string | null;
  actorLabel: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  details: string | null;
  createdAt: string;
};
