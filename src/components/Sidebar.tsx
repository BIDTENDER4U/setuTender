"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, User, FolderOpen, PlusCircle, ClipboardList, CreditCard, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/profile", label: "My Profile", icon: User },
  { href: "/dashboard/documents", label: "My Documents", icon: FolderOpen },
  { href: "/dashboard/analyze", label: "Analyze New Tender", icon: PlusCircle, primary: true },
  { href: "/dashboard/tenders", label: "My Tenders", icon: ClipboardList },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
];

export default function Sidebar({ companyName }: { companyName: string }) {
  const pathname = usePathname();

  return (
    <div className="w-[232px] bg-ink text-white flex flex-col h-screen sticky top-0 shrink-0">
      <div className="px-[22px] pt-[26px] pb-[22px]">
        <div className="font-serif text-xl">Setu</div>
        <div className="font-mono text-[10px] text-[#8894AC] mt-1">BID TENDER 4 U</div>
      </div>
      <div className="h-px bg-white/10 mx-[22px]" />
      <nav className="p-3 flex flex-col gap-0.5 flex-1">
        {NAV.map(({ href, label, icon: Icon, primary }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-3 py-2 text-[13.5px]"
              style={{
                background: active ? "rgba(180,105,14,0.18)" : "transparent",
                borderLeft: active ? "2px solid #B4690E" : "2px solid transparent",
                color: active ? "#fff" : primary ? "#B4690E" : "#B7BFCF",
                fontWeight: primary ? 600 : 500,
              }}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] bg-white/10 flex items-center justify-center font-serif text-[13px]">
            {companyName.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] text-white truncate">{companyName}</div>
          </div>
          <button onClick={() => signOut({ callbackUrl: "/login" })} title="Sign out">
            <LogOut size={14} color="#8894AC" />
          </button>
        </div>
      </div>
    </div>
  );
}
