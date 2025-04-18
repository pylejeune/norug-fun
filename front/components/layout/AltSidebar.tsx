"use client";

import {
  BookOpenText,
  CirclePlus,
  History,
  Home,
  Hourglass,
  PanelLeftClose,
  PanelLeftOpen,
  Vault,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/public/images/logo.svg";
import Image from "next/image";
import Link from "next/link";

export function AltSidebar() {
  const t = useTranslations("Navigation");
  const { toggleSidebar, open, isMobile } = useSidebar();
  const { locale } = useParams();

  // Navigation menu configuration
  const items = [
    {
      titleKey: "home",
      url: `/${locale}`,
      icon: Home,
    },
    {
      titleKey: "manageEpoch",
      url: `/${locale}/epoch`,
      icon: Hourglass,
    },
    {
      titleKey: "createProposal",
      url: `/${locale}/create`,
      icon: CirclePlus,
    },
    {
      titleKey: "treasury",
      url: `/${locale}/treasury`,
      icon: Vault,
    },
    {
      titleKey: "tokenArchive",
      url: `/${locale}/archive`,
      icon: History,
    },
    {
      titleKey: "howItWorks",
      url: `/${locale}/howitworks`,
      icon: BookOpenText,
    },
  ];

  return (
    <>
      {/* Mobile navigation */}
      {isMobile && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-800 z-50">
          <div className="flex items-center justify-around h-16">
            {items.map((item) => (
              <Link
                key={item.titleKey}
                href={item.url}
                className="flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors"
                title={t(item.titleKey)}
              >
                <item.icon className="h-6 w-6" />
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Desktop navigation */}
      <div className="hidden md:block">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <div className="relative flex items-center p-2">
              <Link href="/" className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <Image
                    src={logo}
                    alt="NoRug.fun Logo"
                    width={32}
                    height={32}
                    className="w-8 h-8"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="hidden group-data-[state=collapsed]:flex mt-2"
                    onClick={toggleSidebar}
                  >
                    <PanelLeftOpen className="h-6 w-6" />
                  </Button>
                </div>
                <span className="text-lg font-semibold transition-opacity duration-200 group-data-[state=collapsed]:opacity-0">
                  NoRug.fun
                </span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 transition-opacity duration-200 group-data-[state=collapsed]:opacity-0 flex items-center justify-center"
                onClick={toggleSidebar}
              >
                <PanelLeftClose className="h-6 w-6" />
              </Button>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu className="px-2 flex flex-col gap-4">
                  {items.map((item) => (
                    <SidebarMenuItem key={item.titleKey}>
                      <SidebarMenuButton
                        asChild
                        tooltip={t(item.titleKey)}
                        className="h-8 md:h-12 text-sm md:text-base"
                      >
                        <Link href={item.url} className="gap-2 md:gap-3">
                          <item.icon className="h-4 w-4 md:h-6 md:w-6 group-data-[state=collapsed]:h-8 group-data-[state=collapsed]:w-5 transition-all duration-200" />
                          <span>{t(item.titleKey)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </div>
    </>
  );
}
