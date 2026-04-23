'use client';

import React, { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const INPUT_CLASS =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400';
const INPUT_ERROR_CLASS =
  'w-full rounded-md border border-red-500 px-3 py-2 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500';

const MSG_INVALID = 'Invalid email or password';
const MSG_DEACTIVATED =
  'Your account has been deactivated. Please contact your administrator.';

export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [authError, setAuthError] = useState<'invalid' | 'deactivated' | null>(
    null
  );

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/admin');
      router.refresh();
    }
  }, [status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setEmailError('');
    setPasswordError('');

    const em = email.trim();
    if (!em) {
      setEmailError('Please enter your email');
      return;
    }
    if (!password) {
      setPasswordError('Please enter your password');
      return;
    }

    setSubmitting(true);
    try {
      const result = await signIn('credentials', {
        email: em,
        password,
        redirect: false,
      });

      if (result?.error) {
        setAuthError('invalid');
        setSubmitting(false);
        return;
      }

      if (result?.ok) {
        router.push('/admin');
        router.refresh();
        return;
      }

      setAuthError('invalid');
    } catch {
      setAuthError('invalid');
    } finally {
      setSubmitting(false);
    }
  }

  const authMessage =
    authError === 'deactivated' ? MSG_DEACTIVATED : authError ? MSG_INVALID : null;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-gray-800" aria-hidden />
            <h1 className="text-base font-bold tracking-tight text-gray-900">
              InterTalent Admin
            </h1>
          </div>
          <p className="text-sm text-gray-600">Sign in to your account</p>
        </div>

        {authMessage ? (
          <div
            className="mb-4 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-sm text-red-900"
            role="alert"
          >
            {authMessage}
          </div>
        ) : null}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div>
            <label
              htmlFor="admin-login-email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="admin-login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={emailError ? INPUT_ERROR_CLASS : INPUT_CLASS}
              disabled={submitting}
            />
            {emailError ? (
              <p className="mt-1 text-xs text-red-600">{emailError}</p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="admin-login-password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="admin-login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={passwordError ? INPUT_ERROR_CLASS : INPUT_CLASS}
              disabled={submitting}
            />
            {passwordError ? (
              <p className="mt-1 text-xs text-red-600">{passwordError}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
          >
            {submitting ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
            ) : null}
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
