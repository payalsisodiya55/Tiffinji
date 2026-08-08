import { AppShellSkeleton } from "@food/components/ui/loading-skeletons"
import MenuScanAnimation from "@food/components/user/MenuScanAnimation"

export default function Loader() {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.toLowerCase()
    if (
      path.includes('/terms') ||
      path.includes('/privacy') ||
      path.includes('/support')
    ) {
      return null
    }
  }

  return (
    <>
      <MenuScanAnimation duration={1200} />
      <AppShellSkeleton />
    </>
  )
}
