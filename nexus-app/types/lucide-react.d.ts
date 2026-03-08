declare module 'lucide-react' {
  import { Component, ReactNode, FC } from 'react';
  
  export interface IconProps {
    className?: string;
    size?: number | string;
    strokeWidth?: number | string;
    color?: string;
    [key: string]: any;
  }
  
  export type LucideIcon = FC<IconProps>;
  
  // Common icons
  export const AlertCircle: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Home: LucideIcon;
  export const Loader: LucideIcon;
  export const Video: LucideIcon;
  export const Code: LucideIcon;
  export const FileText: LucideIcon;
  export const Mic: LucideIcon;
  export const Upload: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const CheckCircle2: LucideIcon;
  export const Clock: LucideIcon;
  export const Brain: LucideIcon;
  export const Sparkles: LucideIcon;
  export const Zap: LucideIcon;
  export const Shield: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Play: LucideIcon;
  export const X: LucideIcon;
  export const File: LucideIcon;
  export const Image: LucideIcon;
  export const Save: LucideIcon;
  export const User: LucideIcon;
  export const Mail: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Send: LucideIcon;
  export const Globe: LucideIcon;
  export const Lock: LucideIcon;
  export const Bell: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Palette: LucideIcon;
  export const Database: LucideIcon;
  
  // Missing icons from errors
  export const Download: LucideIcon;
  export const Filter: LucideIcon;
  export const Calendar: LucideIcon;
  export const BarChart3: LucideIcon;
  export const PieChart: LucideIcon;
  export const Briefcase: LucideIcon;
  export const MapPin: LucideIcon;
  export const DollarSign: LucideIcon;
  export const Search: LucideIcon;
  export const Star: LucideIcon;
  export const Building2: LucideIcon;
  export const Users: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const Target: LucideIcon;
  export const Plus: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const GraduationCap: LucideIcon;
  export const Check: LucideIcon;
  export const Menu: LucideIcon;
  export const Edit: LucideIcon;
  export const Edit2: LucideIcon;
  export const Trash2: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const Minus: LucideIcon;
  export const Lightbulb: LucideIcon;
  export const Award: LucideIcon;
  export const Circle: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const XCircle: LucideIcon;
  export const Info: LucideIcon;
  export const Share2: LucideIcon;
  export const Grid: LucideIcon;
  export const List: LucideIcon;
  export const GripVertical: LucideIcon;
  export const Cookie: LucideIcon;
}
