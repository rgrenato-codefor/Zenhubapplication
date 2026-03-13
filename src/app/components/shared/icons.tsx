import React from "react";

// ── All imports from @heroicons/react/24/outline ──────────────────────────────
import {
  // Navigation / Chevrons
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  // Arrows
  ArrowRightIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightOnRectangleIcon,
  // General UI
  XMarkIcon,
  XCircleIcon,
  CheckIcon,
  CheckCircleIcon,
  CheckBadgeIcon,
  MinusIcon,
  PlusIcon,
  Bars3Icon,
  Bars3BottomLeftIcon,
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  EyeSlashIcon,
  // People
  UserIcon,
  UserCircleIcon,
  UserPlusIcon,
  UsersIcon,
  // Buildings / Places
  BuildingOffice2Icon,
  HomeIcon,
  MapPinIcon,
  KeyIcon,
  // Communication
  BellIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  PaperAirplaneIcon,
  ShareIcon,
  LinkIcon,
  ScissorsIcon,
  // Finance
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  ReceiptPercentIcon,
  WalletIcon,
  // Data / Charts
  ChartBarIcon,
  ChartBarSquareIcon,
  CircleStackIcon,
  RectangleStackIcon,
  Squares2X2Icon,
  // Calendar / Time
  CalendarIcon,
  CalendarDaysIcon,
  ClockIcon,
  // Security
  ShieldCheckIcon,
  LockClosedIcon,
  LockOpenIcon,
  // Settings / Tools
  Cog6ToothIcon,
  WrenchIcon,
  AdjustmentsHorizontalIcon,
  // Media / Files
  PhotoIcon,
  CameraIcon,
  FilmIcon,
  PlayIcon,
  VideoCameraIcon,
  CloudArrowUpIcon,
  QrCodeIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  BookmarkIcon,
  // Misc
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  HeartIcon,
  BoltIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  TrashIcon,
  PencilIcon,
  PencilSquareIcon,
  GlobeAltIcon,
  LanguageIcon,
  AtSymbolIcon,
  DevicePhoneMobileIcon,
  BriefcaseIcon,
  NoSymbolIcon,
  RocketLaunchIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";

// ── Type compatible with how icons are used (e.g. in StatCard) ────────────────
export type LucideIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;
export type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

// ── Custom SVG components for icons with no Heroicons equivalent ───────────────

/** Small filled circle – used in radio groups and context menus */
export const CircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="12" cy="12" r="5" />
  </svg>
);

/** Six-dot grip – used in resizable panels */
export const GripVerticalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <circle cx="9"  cy="5"  r="1.4" />
    <circle cx="15" cy="5"  r="1.4" />
    <circle cx="9"  cy="12" r="1.4" />
    <circle cx="15" cy="12" r="1.4" />
    <circle cx="9"  cy="19" r="1.4" />
    <circle cx="15" cy="19" r="1.4" />
  </svg>
);

/** Instagram brand icon */
export const Instagram: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
  </svg>
);

// ── Re-exports using lucide-react naming convention ───────────────────────────
// This lets every page change only the import path, not the icon names.

// Loaders / animated
export const Loader2 = ArrowPathIcon;

// Sparkle / highlight
export const Sparkles = SparklesIcon;

// Chevrons (plain names used alongside *Icon names)
export const ChevronDown     = ChevronDownIcon;
export const ChevronUp       = ChevronUpIcon;
export const ChevronLeft     = ChevronLeftIcon;
export const ChevronRight    = ChevronRightIcon;

// Arrows
export const ArrowRight    = ArrowRightIcon;
export const ArrowLeft     = ArrowLeftIcon;
export const ArrowUpRight  = ArrowUpRightIcon;
export const ExternalLink  = ArrowTopRightOnSquareIcon;

// Trending
export const TrendingUp   = ArrowTrendingUpIcon;
export const TrendingDown = ArrowTrendingDownIcon;

// UI controls
export const X            = XMarkIcon;
export const XIcon        = XMarkIcon;       // ui components use XIcon
export const Menu         = Bars3Icon;
export const Plus         = PlusIcon;
export const ArrowPath    = ArrowPathIcon;
export const Search       = MagnifyingGlassIcon;
export const SearchIcon   = MagnifyingGlassIcon;
export const Filter       = FunnelIcon;
export const Eye          = EyeIcon;
export const EyeOff       = EyeSlashIcon;
export const Check        = CheckIcon;
export const CheckCheck   = ClipboardDocumentCheckIcon;
export const MoreHorizontal   = EllipsisHorizontalIcon;
export const MoreHorizontalIcon = EllipsisHorizontalIcon;  // alias for ui/pagination
export const MoreVertical     = EllipsisVerticalIcon;
export const Download     = ArrowDownTrayIcon;
export const RefreshCw    = ArrowPathIcon;
export const Save         = CloudArrowUpIcon;
export const Copy         = DocumentDuplicateIcon;

// Status
export const CheckCircle    = CheckCircleIcon;
export const XCircle        = XCircleIcon;
export const AlertCircle    = ExclamationCircleIcon;
export const AlertTriangle  = ExclamationTriangleIcon;
export const Info           = InformationCircleIcon;
export const BadgeCheck     = CheckBadgeIcon;

// Navigation / layout
export const Shield          = ShieldCheckIcon;
export const LayoutDashboard = Squares2X2Icon;
export const LayoutGrid      = Squares2X2Icon;
export const Grid            = Squares2X2Icon;
export const ListBullet      = Bars3BottomLeftIcon;
export const InformationCircle = InformationCircleIcon;
export const Layers          = RectangleStackIcon;
export const BarChart3       = ChartBarIcon;
export const BarChart2       = ChartBarSquareIcon;
export const Settings        = Cog6ToothIcon;
export const PanelLeftIcon   = Bars3BottomLeftIcon;

// People
export const User       = UserIcon;
export const UserCircle = UserCircleIcon;
export const UserPlus   = UserPlusIcon;
export const Users      = UsersIcon;

// Buildings / places
export const Building2 = BuildingOffice2Icon;
export const Home      = HomeIcon;
export const MapPin    = MapPinIcon;
export const DoorOpen  = KeyIcon;           // rooms concept

// Finance
export const DollarSign      = CurrencyDollarIcon;
export const CreditCard      = CreditCardIcon;
export const Banknote        = BanknotesIcon;
export const CircleDollarSign = CurrencyDollarIcon;
export const ShoppingBag     = ShoppingBagIcon;
export const Percent         = ReceiptPercentIcon;
export const Wallet          = WalletIcon;

// Time / Calendar
export const CalendarDays  = CalendarDaysIcon;
export const Calendar      = CalendarIcon;
export const CalendarCheck = CalendarDaysIcon;  // no CalendarCheck in Heroicons
export const Clock         = ClockIcon;

// Communication / sharing
export const Bell             = BellIcon;
export const Mail             = EnvelopeIcon;
export const Phone            = PhoneIcon;
export const MessageCircle    = ChatBubbleOvalLeftEllipsisIcon;
export const MessageSquare    = ChatBubbleLeftRightIcon;
export const Send             = PaperAirplaneIcon;
export const Share2           = ShareIcon;
export const Link             = LinkIcon;
export const Link2            = LinkIcon;
export const Link2Off         = ScissorsIcon;   // "cut" a link
export const AtSign           = AtSymbolIcon;

// Actions / editing
export const Edit  = PencilSquareIcon;
export const Edit2 = PencilIcon;
export const Trash2 = TrashIcon;
export const LogOut = ArrowRightOnRectangleIcon;
export const Lock   = LockClosedIcon;
export const Globe  = GlobeAltIcon;

// Toggles (used visually to show on/off state)
export const ToggleLeft  = ChevronDoubleLeftIcon;
export const ToggleRight = ChevronDoubleRightIcon;

// Data / files
export const Database      = CircleStackIcon;
export const FileText      = DocumentTextIcon;
export const ClipboardList = ClipboardDocumentListIcon;

// Media
export const Image        = PhotoIcon;
export const Camera       = CameraIcon;
export const Film         = FilmIcon;
export const Play         = PlayIcon;
export const VideoCamera  = VideoCameraIcon;
export const CloudUpload  = CloudArrowUpIcon;
export const QrCode       = QrCodeIcon;
export const Smartphone   = DevicePhoneMobileIcon;

// Misc
export const Star         = StarIcon;
export const Heart        = HeartIcon;
export const Activity     = BoltIcon;
export const Zap          = BoltIcon;
export const Crown        = TrophyIcon;
export const Award        = TrophyIcon;
export const Briefcase    = BriefcaseIcon;
export const Languages    = LanguageIcon;
export const KeyRound     = KeyIcon;
export const RocketLaunch = RocketLaunchIcon;
export const Gift         = GiftIcon;

// Re-export heroicons names directly too (used by some ui components)
export {
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  CheckIcon,
  CheckCircleIcon,
  CheckBadgeIcon,
  XMarkIcon,
  XCircleIcon,
  MinusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowDownTrayIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
  Bars3BottomLeftIcon,
  SparklesIcon,
  StarIcon,
  TrophyIcon,
  HeartIcon,
  BoltIcon,
  BuildingOffice2Icon,
  UserIcon,
  UserCircleIcon,
  UserPlusIcon,
  UsersIcon,
  HomeIcon,
  MapPinIcon,
  KeyIcon,
  BellIcon,
  ClockIcon,
  CalendarIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  BanknotesIcon,
  ShoppingBagIcon,
  WalletIcon,
  ReceiptPercentIcon,
  ChartBarIcon,
  ChartBarSquareIcon,
  Squares2X2Icon,
  RectangleStackIcon,
  CircleStackIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  LockOpenIcon,
  Cog6ToothIcon,
  WrenchIcon,
  PencilIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  FunnelIcon,
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
  EnvelopeIcon,
  PhoneIcon,
  LinkIcon,
  ScissorsIcon,
  PhotoIcon,
  CameraIcon,
  QrCodeIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  BookmarkIcon,
  CloudArrowUpIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  GlobeAltIcon,
  LanguageIcon,
  AtSymbolIcon,
  DevicePhoneMobileIcon,
  BriefcaseIcon,
  NoSymbolIcon,
  ArrowTopRightOnSquareIcon,
  ArrowRightOnRectangleIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ShareIcon,
  RocketLaunchIcon,
  GiftIcon,
};