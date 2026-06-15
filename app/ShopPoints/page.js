import { Suspense } from 'react'
import Navbar from "../Components/Home/Navbar/Navbar"
import ProfileCrum from "../Components/ShopPoints/ProfileCrum/ProfileCrum"
import ShopMain from "../Components/ShopPoints/ShopMain/ShopMain"

function ShopPointsContent() {
  return (
    <>
      <Navbar />
      <ProfileCrum />
      <ShopMain />
    </>
  )
}

export default function ShopPoints() {
  return (
    <Suspense fallback={null}>
      <ShopPointsContent />
    </Suspense>
  )
}