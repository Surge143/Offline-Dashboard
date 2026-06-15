import { Suspense } from 'react'
import Navbar from "../Components/Home/Navbar/Navbar"
import OrderType from "../Components/ScaanedProfile/OrderType/OrderType"
import Profiledetails from "../Components/ScaanedProfile/Profiledetails/Profiledetails"

function ScanedProfileContent({ code }) {
  return (
    <>
      <Navbar />
      <Profiledetails />
      <OrderType code={code} />
    </>
  )
}

export default async function ScanedProfile({ searchParams }) {
  const params = await searchParams;
  const code = params?.code || null;
  return (
    <Suspense fallback={null}>
      <ScanedProfileContent code={code} />
    </Suspense>
  )
}