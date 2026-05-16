'use client'

import { useState, useRef, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { LogOut } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { ProfileModal } from './ProfileModal'

const PUBLIC_PAGES = [
  '/',
  '/events',
  '/about',
  '/privacy',
  '/terms',
  '/payment/success',
  '/payment/failed',
  '/complete-profile',
]

const isPublicPage = (pathname: string): boolean => {
  if (PUBLIC_PAGES.includes(pathname)) return true
  if (pathname.startsWith('/events/') && pathname !== '/events') return true
  return false
}

interface WalletButtonProps {
  mobile?: boolean
}

// Helper function to extract email from user
const getUserEmail = (user: any): string => {
  if (!user) return '';
  
  // Check email account
  if (user.email?.address) {
    return user.email.address;
  }
  
  // Check Google account
  if (user.google?.email) {
    return user.google.email;
  }
  
  // Twitter doesn't provide email, so return empty
  // User will need to provide email in profile modal
  
  return '';
};

// Helper function to check if user has email from OAuth provider
const hasEmailFromProvider = (user: any): boolean => {
  if (!user) return false;
  return !!(user.email?.address || user.google?.email);
};

export function WalletButton({ mobile = false }: WalletButtonProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [needsEmail, setNeedsEmail] = useState(false)
  const [isCheckingUser, setIsCheckingUser] = useState(false)
  
  const router = useRouter()
  const pathname = usePathname()
  const { user, authenticated, ready, logout, login } = usePrivy()
  const hasHandledPostLogin = useRef(false)
  const isLoggingOutRef = useRef(false)
  
  console.log(`🏗️ [WalletButton] Rendering: mobile=${mobile}, authenticated=${authenticated}, ready=${ready}, hasUser=${!!user}, pathname=${pathname}`);

  // ✅ Function to check if user exists in database and show modal if needed
  const checkUserAndShowModal = async (userData: any) => {
    if (isCheckingUser) return;
    
    setIsCheckingUser(true);
    
    try {
      const walletAddress = userData.wallet?.address;
      const email = getUserEmail(userData);
      const hasEmail = hasEmailFromProvider(userData);
      
      console.log('🔍 [WalletButton] Checking user in database:', { walletAddress, email, hasEmail });
      
      if (!walletAddress) {
        console.log('⚠️ [WalletButton] No wallet address, showing profile modal');
        setUserEmail(email);
        setNeedsEmail(!hasEmail); // Only need email if OAuth didn't provide one
        setShowProfileModal(true);
        return;
      }
      
      // Check if user exists in database
      const response = await fetch(`/api/auth/user?walletAddress=${walletAddress}`);
      console.log(`📊 [WalletButton] API response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📝 [WalletButton] User data from DB:', data);
        
        // If user doesn't exist OR profile is incomplete, show modal
        if (!data.user || data.needsProfileCompletion || !data.user?.isProfileComplete) {
          console.log('📝 [WalletButton] User needs profile completion, showing modal');
          setUserEmail(email || data.user?.email || '');
          setNeedsEmail(!hasEmail && !data.user?.email);
          setShowProfileModal(true);
        } else {
          console.log('✅ [WalletButton] User profile complete, navigating to dashboard');
          router.push('/dashboard');
        }
      } else {
        // User not found in database, show modal
        console.log('⚠️ [WalletButton] User not found in DB, showing profile modal');
        setUserEmail(email);
        setNeedsEmail(!hasEmail);
        setShowProfileModal(true);
      }
    } catch (error) {
      console.error('💥 [WalletButton] Error checking user:', error);
      // On error, show modal to be safe
      setShowProfileModal(true);
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleLogin = async () => {
    console.log('🔄 [WalletButton] handleLogin called');
    try {
      console.log('🚀 [WalletButton] Calling login()...');
      await login()
      console.log('✅ [WalletButton] Login initiated successfully')
    } catch (error) {
      console.error('❌ [WalletButton] Login failed:', error)
      toast.error('Login failed. Please try again.')
    }
  }

  const handleLogout = async () => {
    console.log('🔄 [WalletButton] handleLogout called');
    setIsLoggingOut(true)
    isLoggingOutRef.current = true
    hasHandledPostLogin.current = false
    setShowProfileModal(false) // Close modal if open
    const toastId = toast.loading('Logging out...')
    
    try {
      await logout()
      toast.dismiss(toastId)
      toast.success('Logged out successfully')
      window.location.href = '/'
    } catch (error) {
      console.error('Logout failed:', error)
      toast.dismiss(toastId)
      toast.error('Logout failed. Please try again.')
      isLoggingOutRef.current = false
      setIsLoggingOut(false)
    }
  }

  const handleProfileComplete = () => {
    console.log('✅ [WalletButton] Profile completed, navigating to dashboard');
    setShowProfileModal(false);
    router.push('/dashboard');
  };

  // Reset flags when authentication state changes
  useEffect(() => {
    if (!authenticated) {
      console.log('🔓 [WalletButton] User not authenticated, resetting flags');
      hasHandledPostLogin.current = false;
    }
  }, [authenticated]);

  // ✅ Post-login logic - Check database and show modal if needed
  useEffect(() => {
    console.log(`🔄 [WalletButton] Post-login effect: ready=${ready}, authenticated=${authenticated}, hasUser=${!!user}, hasHandled=${hasHandledPostLogin.current}, isLoggingOut=${isLoggingOutRef.current}, pathname=${pathname}`);
    
    // Don't redirect during logout
    if (isLoggingOutRef.current) {
      console.log(`🚫 [WalletButton] Logout in progress, skipping`);
      return;
    }

    // Wait for Privy to be fully ready AND authenticated AND have user
    if (!ready || !authenticated || !user) {
      console.log(`⏭️ [WalletButton] Skipping - Privy not fully ready/authenticated`);
      return;
    }

    // Already handled this
    if (hasHandledPostLogin.current) {
      console.log(`⏭️ [WalletButton] Already handled post-login`);
      return;
    }

    // Mark as handled to prevent multiple checks
    hasHandledPostLogin.current = true;
    
    // Check if this is an OAuth or wallet login and show modal if needed
    console.log('🔐 [WalletButton] Checking user and showing modal if needed');
    checkUserAndShowModal(user);
    
  }, [ready, authenticated, user, router, pathname]);

  const getUserDisplayName = () => {
    if (!user) return 'Guest'
    if (user.google?.name) return user.google.name
    if (user.twitter?.username) return `@${user.twitter.username}`
    if (user.email?.address) return user.email.address.split('@')[0]
    return 'User'
  }

  // Extract email from user for modal
  const getInitialEmail = (): string => {
    return getUserEmail(user);
  };

  // Check if user needs to provide email
  const doesUserNeedEmail = (): boolean => {
    if (!user) return true;
    return !hasEmailFromProvider(user);
  };

  // Not authenticated - Show Login button
  if (!authenticated) {
    console.log(`🔓 [WalletButton] Not authenticated, showing login button (mobile=${mobile})`);
    if (mobile) {
      return (
        <>
          <button
            onClick={handleLogin}
            className="btn-primary w-full py-3"
            disabled={!ready}
          >
            {!ready ? 'Loading...' : 'Login'}
          </button>
          <ProfileModal
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            onComplete={handleProfileComplete}
            initialEmail={getInitialEmail()}
            needsEmail={needsEmail}
            preventClose={true}
            hideCloseButton={true}
          />
        </>
      )
    }
    
    return (
      <>
        <button
          onClick={handleLogin}
          className="btn-primary px-6 py-3"
          disabled={!ready}
        >
          {!ready ? 'Loading...' : 'Login'}
        </button>
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onComplete={handleProfileComplete}
          initialEmail={getInitialEmail()}
          needsEmail={needsEmail}
          preventClose={true}
          hideCloseButton={true}
        />
      </>
    )
  }

  // Authenticated - Show user info and logout button
  console.log(`✅ [WalletButton] Authenticated, showing user info (mobile=${mobile})`);
  if (mobile) {
    return (
      <>
        <div className="space-y-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Signed in as
          </div>
          <div className="font-medium text-text dark:text-dark-text mb-4">
            {getUserDisplayName()}
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full px-4 py-3 border border-gray-900 dark:border-gray-900 text-gray-900 dark:text-gray-900 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            {isLoggingOut ? (
              <>
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Logging out...
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                Logout
              </>
            )}
          </button>
        </div>
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          onComplete={handleProfileComplete}
          initialEmail={getInitialEmail()}
          needsEmail={needsEmail}
          preventClose={true}
          hideCloseButton={true}
        />
      </>
    )
  }

  // Desktop authenticated view
  return (
    <>
      <div className="flex items-center space-x-3">
        <div className="text-right">
          <div className="text-xs text-text-light dark:text-dark-secondary">
            Welcome back
          </div>
          <div className="text-sm font-medium text-text dark:text-dark-text">
            {getUserDisplayName()}
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-4 py-2 border border-primary dark:border-primary text-gray-700 dark:text-primary rounded-xl hover:bg-gray-50 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoggingOut ? (
            <>
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Logging out...
            </>
          ) : (
            <>
              <LogOut className="h-4 w-4" />
              Logout
            </>
          )}
        </button>
      </div>
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onComplete={handleProfileComplete}
        initialEmail={getInitialEmail()}
        needsEmail={needsEmail}
        preventClose={true}
        hideCloseButton={true}
      />
    </>
  )
}