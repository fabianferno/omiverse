"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ModeToggle } from "@/components/ui/mode-toggle";
import Image from "next/image";


export default function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return <main className="container flex min-h-screen flex-col items-center justify-center p-10">
        <div className="absolute top-5 right-12 mr-5">
            <ConnectButton />
        </div>
        <div className="absolute top-5 right-5">
            <ModeToggle />
        </div>
        <div className="absolute top-5 left-5 flex flex-row items-center bg-zinc-900 rounded-md p-2">
            <Image
                className="relative rounded-md"
                src="/logo.gif"
                alt="Logo"
                width={80}
                height={80}
                priority
            />
            <div className="px-5 mb-1">
                <div className="text-3xl font-bold">some app</div>
                <div className="text-lg ">this app does something</div>
            </div>
        </div>

        <section className="lg:max-w-5xl lg:w-full">
            <div className="ring-1 ring-zinc-700 rounded-xl p-8 w-full">
                <div className="flex justify-center items-start flex-col">
                    <div className="flex justify-center items-between flex-col w-full">
                        {children}
                    </div>
                </div>
            </div>
        </section>
    </main>
}