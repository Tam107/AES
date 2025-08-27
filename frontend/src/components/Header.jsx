import React from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

const Header = () => {
  return (
    <header className="w-full bg-white text-gray-800 p-4 shadow-md mb-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        
        <div className="flex-1">LOGO Chấm điểm tiếng việt</div>

        <div className="flex items-center space-x-4">
          <SignedOut>
            <SignInButton className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition-all">
              Login
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <UserButton className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-all" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
};

export default Header;
