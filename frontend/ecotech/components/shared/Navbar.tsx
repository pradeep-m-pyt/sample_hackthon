"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Map as MapIcon, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "./Logo";

const Navbar = () => {
    const pathname = usePathname();
    const isAuthPage = pathname.includes("/login") || pathname.includes("/signup");

    if (isAuthPage) return null;

    const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
        const isActive = pathname === href;
        return (
            <Link href={href} className="relative px-3 py-2 flex items-center gap-2 text-sm font-medium transition-colors hover:text-green-600">
                <Icon className={`w-4 h-4 ${isActive ? 'text-green-600' : 'text-slate-500'}`} />
                <span className={isActive ? 'text-green-600' : 'text-slate-600'}>{label}</span>
                {isActive && (
                    <motion.div
                        layoutId="navbar-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-600"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                )}
            </Link>
        );
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/">
                    <Logo size={36} />
                </Link>
                <div className="flex items-center gap-6">
                    <NavItem href="/dashboard" icon={BarChart3} label="Dashboard" />
                    <NavItem href="/map" icon={MapIcon} label="Land Map" />
                    <Link href="/login" className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full text-sm font-medium hover:bg-green-700 transition-all">
                        <User className="w-4 h-4" />
                        <span>Account</span>
                    </Link>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
