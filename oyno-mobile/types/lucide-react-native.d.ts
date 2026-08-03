import 'lucide-react-native';

declare module 'lucide-react-native' {
  interface LucideProps {
    color?: string;
    fill?: string;
    size?: number | string;
    strokeWidth?: number | string;
    style?: unknown;
  }
}
