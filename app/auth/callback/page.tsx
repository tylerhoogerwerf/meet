'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
          setError(`Authentication error: ${error}`);
          setStatus('error');
          return;
        }

        if (!code || !state) {
          setError('Missing authorization code or state parameter');
          setStatus('error');
          return;
        }

        // The backend will handle the OAuth callback
        // We just need to extract the token from the URL or make a request
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';
        const callbackUrl = `${backendUrl}/auth/callback?code=${code}&state=${state}`;
        
        const response = await fetch(callbackUrl, {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Authentication failed');
        }

        const authData = await response.json();
        
        // Store tokens and user data
        localStorage.setItem('access_token', authData.access_token);
        localStorage.setItem('refresh_token', authData.refresh_token);
        localStorage.setItem('user', JSON.stringify(authData.user));

        setStatus('success');
        
        // Redirect to the original destination or home
        const returnUrl = localStorage.getItem('auth_return_url') || '/';
        localStorage.removeItem('auth_return_url');
        
        setTimeout(() => {
          router.push(returnUrl);
        }, 1000);

      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">
            Authenticatie verwerken...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Een moment geduld terwijl we je inloggen.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">
            Succesvol ingelogd!
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Je wordt doorgestuurd...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
          <svg
            className="h-6 w-6 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          Authenticatie mislukt
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {error || 'Er is een onbekende fout opgetreden.'}
        </p>
        <div className="mt-6">
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Opnieuw proberen
          </button>
        </div>
      </div>
    </div>
  );
}
