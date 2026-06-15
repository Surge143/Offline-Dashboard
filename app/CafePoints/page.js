import { Suspense } from 'react'
import CafePointsMain from "../Components/CafePoints/CafePointsMain/CafePointsMain"
import ProfileCrum from "../Components/CafePoints/ProfileCrum/ProfileCrum"
import Navbar from "../Components/Home/Navbar/Navbar"

function CafePointsContent() {
  return (
    <>
      <Navbar />
      <ProfileCrum />
      <CafePointsMain />
    </>
  )
}

export default function CafePoints() {
  return (
    <Suspense fallback={null}>
      <CafePointsContent />
    </Suspense>
  )
}