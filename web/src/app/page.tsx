"use client";
import { useAccount } from "wagmi";
import MainLayout from "@/components/layouts/MainLayout";

export default function Home() {
  const { address } = useAccount();
  return (
    <MainLayout>
      <div className="text-center text-2xl">
        {address ? <div>{`Hello World, ${address}`}</div> : <div>Connect your wallet to get started</div>}
      </div>
    </MainLayout>
  );
}
