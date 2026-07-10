"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import { isClerkConfigured } from "@/lib/clerk-auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function CrmUserMenu({
  displayName = "Staff",
  initials = "ST",
  showChevron = false,
}: {
  displayName?: string;
  initials?: string;
  showChevron?: boolean;
}) {
  if (isClerkConfigured()) {
    return (
      <UserButton
        appearance={{
          elements: { avatarBox: "size-8" },
        }}
      />
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={showChevron ? "sm" : "icon"}
          className={cn(
            showChevron
              ? "h-9 gap-1.5 rounded-full px-1.5 text-foreground hover:bg-muted"
              : "size-8 rounded-full text-white hover:bg-white/10",
          )}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-[#00A9FF] text-xs font-semibold text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {showChevron ? (
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings className="mr-2 size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <User className="mr-2 size-4" />
          Profile (stub)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login">
            <LogOut className="mr-2 size-4" />
            Sign in
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
