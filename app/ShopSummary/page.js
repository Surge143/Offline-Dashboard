import { Suspense } from 'react'
import ProfileBreadCrums from "../Components/CafeSummary/ProfileBreadCrums/ProfileBreadCrums"
import Navbar from "../Components/Home/Navbar/Navbar"
import ShopSummaryMain from "../Components/ShopSummary/ShopSummaryMain/ShopSummaryMain"

function ShopSummaryContent() {
  return (
    <>
      <Navbar />
      <ProfileBreadCrums />
      <ShopSummaryMain />
    </>
  )
}

export default function ShopSummary() {
  return (
    <Suspense fallback={null}>
      <ShopSummaryContent />
    </Suspense>
  )
}