"use client";

import React from 'react';
import { useUser } from '@/hooks/useUser';

const UserProfile = () => {
  const { user, nickname, userId, isLoggedIn, isLoading } = useUser();

  if (isLoading) {
    return <div>Loading user...</div>;
  }

  if (!isLoggedIn) {
    return <div>Please sign in</div>;
  }

  return (
    <div className="flex items-center gap-3 p-4 bg-gray-100 rounded-lg">
      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
        {nickname?.charAt(0).toUpperCase()}
      </div>
      <div>
        <h3 className="font-semibold">{nickname}</h3>
        <p className="text-sm text-gray-500">ID: {userId}</p>
        <p className="text-xs text-gray-400">
          Joined: {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
        </p>
      </div>
    </div>
  );
};

export default UserProfile;
