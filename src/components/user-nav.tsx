'use client';

import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export function UserNav() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return names[0].substring(0, 2);
  };

  const formattedName = user.name.split(' ').length > 1 
    ? `${user.name.split(' ')[0]} ${user.name.split(' ').pop()?.[0]}.`
    : user.name;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="h-11 px-2 pr-4 bg-white dark:bg-slate-800 shadow-sm rounded-full hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-border/40 flex items-center gap-3"
        >
          <Avatar className="h-8 w-8 border border-border/20 shadow-sm">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="bg-secondary text-primary text-[10px] font-bold">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 hidden sm:inline-block tracking-tight">
            {formattedName}
          </span>
          <ChevronDown className="h-3 w-3 text-slate-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 rounded-2xl shadow-xl mt-2" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-bold leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground mt-1">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem asChild className="rounded-xl h-10 px-3 cursor-pointer">
            <Link href="/teacher/settings">
              <UserIcon className="mr-2 h-4 w-4 text-slate-500" />
              <span className="font-medium text-sm">Profile Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="p-1">
          <DropdownMenuItem onClick={logout} className="rounded-xl h-10 px-3 cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span className="font-bold text-sm">Log out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
