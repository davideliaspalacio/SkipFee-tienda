import type { SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'size'> {
  size?: number;
  strokeWidth?: number;
}

const sv = (children: React.ReactNode) =>
  ({ size = 16, strokeWidth = 1.75, className = '', ...rest }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );

export const Icon = {
  Home: sv(<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5Z" />),
  LogOut: sv(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>),
  LayoutGrid: sv(<>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>),
  MessageCircle: sv(<path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.6-.8L3 21l1.3-5.4A8.4 8.4 0 0 1 21 11.5Z" />),
  Package: sv(<path d="m7.5 4.27 9 5.15M21 8 12 13 3 8m9 5v9M21 8v8a2 2 0 0 1-1 1.7L13 21.4a2 2 0 0 1-2 0L4 17.7A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.7l7-3.9a2 2 0 0 1 2 0l7 3.9A2 2 0 0 1 21 8Z" />),
  Users: sv(<>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </>),
  BarChart: sv(<>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6"  y1="20" x2="6"  y2="14" />
  </>),
  Bike: sv(<>
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="18.5" cy="17.5" r="3.5" />
    <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm-3 11.5 4-7-3-4h-2m6 11-3-7" />
  </>),
  Settings: sv(<>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82A1.65 1.65 0 0 0 3.09 14H3a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.5 1Z" />
  </>),
  Search: sv(<>
    <circle cx="11" cy="11" r="7" />
    <line x1="20" y1="20" x2="16.65" y2="16.65" />
  </>),
  Plus: sv(<>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5"  y1="12" x2="19" y2="12" />
  </>),
  ArrowUp: sv(<>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </>),
  ArrowDown: sv(<>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </>),
  ArrowRight: sv(<>
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </>),
  TrendingUp: sv(<>
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </>),
  TrendingDown: sv(<>
    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
    <polyline points="16 17 22 17 22 11" />
  </>),
  DollarSign: sv(<>
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </>),
  Clock: sv(<>
    <circle cx="12" cy="12" r="9" />
    <polyline points="12 7 12 12 15 14" />
  </>),
  AlertCircle: sv(<>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="8" x2="12" y2="12.5" />
    <line x1="12" y1="16" x2="12" y2="16.01" />
  </>),
  Info: sv(<>
    <circle cx="12" cy="12" r="9" />
    <line x1="12" y1="16" x2="12" y2="11.5" />
    <line x1="12" y1="8" x2="12" y2="8.01" />
  </>),
  AlertTriangle: sv(<>
    <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12" y2="17.01" />
  </>),
  CheckCircle: sv(<>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </>),
  Check: sv(<polyline points="20 6 9 17 4 12" />),
  X: sv(<>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6"  y1="6" x2="18" y2="18" />
  </>),
  MapPin: sv(<>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0Z" />
    <circle cx="12" cy="10" r="3" />
  </>),
  Phone: sv(<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />),
  Filter: sv(<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />),
  MoreHorizontal: sv(<>
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
    <circle cx="5"  cy="12" r="1.2" />
  </>),
  MoreVertical: sv(<>
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="12" cy="5"  r="1.2" />
    <circle cx="12" cy="19" r="1.2" />
  </>),
  Bell: sv(<>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </>),
  Moon: sv(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />),
  Sun: sv(<>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </>),
  Sliders: sv(<>
    <line x1="4"  y1="21" x2="4"  y2="14" />
    <line x1="4"  y1="10" x2="4"  y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8"  x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1"  y1="14" x2="7"  y2="14" />
    <line x1="9"  y1="8"  x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </>),
  Bot: sv(<>
    <rect x="3" y="8" width="18" height="12" rx="2" />
    <path d="M12 8V4M8 4h8" />
    <line x1="9"  y1="14" x2="9"  y2="14.01" />
    <line x1="15" y1="14" x2="15" y2="14.01" />
  </>),
  User: sv(<>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </>),
  UserPlus: sv(<>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </>),
  Calendar: sv(<>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8"  y1="2" x2="8"  y2="6" />
    <line x1="3"  y1="10" x2="21" y2="10" />
  </>),
  Download: sv(<>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>),
  Send: sv(<>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </>),
  Paperclip: sv(<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />),
  Smile: sv(<>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9"  y1="9" x2="9.01" y2="9" />
    <line x1="15" y1="9" x2="15.01" y2="9" />
  </>),
  Tag: sv(<>
    <path d="M20.59 13.41 12 22l-9-9V3h10l9 9-1.41 1.41Z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </>),
  Percent: sv(<>
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </>),
  Beer: sv(<path d="M17 11h1a3 3 0 0 1 0 6h-1M9 12v6M13 12v6M14 7.5c-1 0-1.5.5-3 .5s-2-.5-3-.5-2 .5-2 2v9a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-9c0-1.5-1-2-2-2s-1 0-2 0Z" />),
  Cake: sv(<path d="M20 21V11a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10M4 16s1-1 4-1 5 2 8 2 4-1 4-1M2 21h20M7 8V3.5a1.5 1.5 0 1 1 3 0V8M14 8V3.5a1.5 1.5 0 1 1 3 0V8" />),
  Sandwich: sv(<path d="M3 11v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3M3 11l3-7h12l3 7M3 11h18M7 16v3M17 16v3" />),
  Chevron: sv(<polyline points="9 18 15 12 9 6" />),
  ChevronLeft: sv(<polyline points="15 18 9 12 15 6" />),
  ChevronDown: sv(<polyline points="6 9 12 15 18 9" />),
  Eye: sv(<>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>),
  Edit: sv(<>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
  </>),
  Star: sv(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />),
  Wifi: sv(<path d="M5 12.55a11 11 0 0 1 14 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />),
  Battery: sv(<>
    <rect x="2" y="7" width="18" height="10" rx="2" ry="2" />
    <line x1="22" y1="11" x2="22" y2="13" />
  </>),
  ShoppingBag: sv(<>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </>),
  Receipt: sv(<>
    <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
    <path d="M8 7h8M8 11h8M8 15h5" />
  </>),
  Route: sv(<>
    <circle cx="6" cy="19" r="2.5" />
    <circle cx="18" cy="5" r="2.5" />
    <path d="M8.5 19h6a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7h6" />
  </>),
  Navigation: sv(<polygon points="3 11 22 2 13 21 11 13 3 11" />),
  Fuel: sv(<>
    <line x1="3" y1="22" x2="15" y2="22" />
    <line x1="4" y1="9" x2="14" y2="9" />
    <path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18" />
    <path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2 2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5" />
  </>),
  Copy: sv(<>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>),
  Sparkles: sv(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />),
  Layers: sv(<>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </>),
};

export type IconName = keyof typeof Icon;
