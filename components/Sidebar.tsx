"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, PlusCircle, Printer, Settings, CreditCard, Home, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/admin/carnets", label: "Listado Personal", icon: Users, exact: true },
  { href: "/admin/carnets/new", label: "Nuevo Fotocheck", icon: PlusCircle },
  { href: "/admin/carnets/print", label: "Imprimir Lote", icon: Printer },
  { href: "/admin/config", label: "Configuración", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <aside className="w-64 min-h-screen bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Logo */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide">FOTOCHECK</h1>
            <p className="text-[11px] text-sidebar-foreground/50">UNAMAD 2026</p>
          </div>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={`w-full justify-start gap-3 text-sm h-10 ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-sidebar-border" />

      {/* Footer */}
      <div className="p-4 space-y-1">
        <Link href="/">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-xs text-sidebar-foreground/40 hover:text-sidebar-foreground/70 h-8"
          >
            <Home className="w-3.5 h-3.5" />
            Volver al inicio
          </Button>
        </Link>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-2 text-xs text-sidebar-foreground/40 hover:text-red-400 h-8"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </Button>
        <p className="text-[10px] text-sidebar-foreground/30 mt-2 px-2">
          OTI - UNAMAD 2026
        </p>
      </div>
    </aside>
  );
}
