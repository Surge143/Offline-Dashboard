import { Suspense } from 'react'
import ProfileBreadCrums from "../Components/CafeSummary/ProfileBreadCrums/ProfileBreadCrums"
import SummaryCafe from "../Components/CafeSummary/SummaryCafe/SummaryCafe"
import Navbar from "../Components/Home/Navbar/Navbar"

function CafeSummaryContent() {
  return (
    <>
      <Navbar />
      <ProfileBreadCrums />
      <SummaryCafe />
    </>
  )
}

export default function CafeSummary() {
  return (
    <Suspense fallback={null}>
      <CafeSummaryContent />
    </Suspense>
  )
}