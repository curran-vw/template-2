import { LayoutProvider } from '@/app/components/common/LayoutProvider'

export default function Layout({ children }: { children: React.ReactNode }) {
  return <LayoutProvider>{children}</LayoutProvider>
}
