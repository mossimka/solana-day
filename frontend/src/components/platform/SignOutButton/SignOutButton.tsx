"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUser } from '@/hooks/useUser';

const SignOutButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await logout();
      
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
     
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleSignOut}
      disabled={isLoading}
      className="button flex items-center gap-2"
    >
      <LogOut size={16} />
      {isLoading ? 'Signing Out...' : 'Sign Out'}
    </button>
  );
};

export default SignOutButton;