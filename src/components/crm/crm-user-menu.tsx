"use client";

import Link from "next/link";
import { LogOut, Settings, User } from "lucide-react";
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

export function CrmUserMenu({
  displayName = "Staff",
  initials = "ST",
}: {
  displayName?: string;
  initials?: string;
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
        <Button variant="ghost" size="icon" className="size-8 rounded-full text-white hover:bg-white/10">
          <Avatar className="size-8">
            <AvatarFallback className="bg-brand-light text-xs font-semibold text-brand-navy">
              {initials}
            </AvatarFallback>
          </Avatar>
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
