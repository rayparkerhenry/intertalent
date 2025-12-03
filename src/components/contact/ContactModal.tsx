/**
 * ContactModal Component
 * Modal form for requesting an associate - triggered by "Request Associate" button
 * Prefills with associate info, looks up office email, sends contact request
 */

'use client';

import { useState, useEffect } from 'react';
import type { Profile } from '@/lib/db/supabase';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
}

// Format phone number to (XXX) XXX-XXXX format
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');

  // Limit to 10 digits
  const limitedDigits = digits.slice(0, 10);

  // Format based on number of digits
  if (limitedDigits.length === 0) return '';
  if (limitedDigits.length <= 3) return `(${limitedDigits}`;
  if (limitedDigits.length <= 6)
    return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3)}`;
  return `(${limitedDigits.slice(0, 3)}) ${limitedDigits.slice(3, 6)}-${limitedDigits.slice(6)}`;
};

// Validate phone number - must be exactly 10 digits when provided
const isValidPhoneNumber = (phone: string): boolean => {
  if (!phone) return true; // Phone is optional
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10;
};

// Validate email format
const isValidEmail = (email: string): boolean => {
  if (!email) return false; // Email is required
  // Standard email regex pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export default function ContactModal({
  isOpen,
  onClose,
  profile,
}: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    comment: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [officeEmail, setOfficeEmail] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  const fullName = `${profile.first_name} ${profile.last_initial}.`;

  // Fetch office email when modal opens
  useEffect(() => {
    if (isOpen && profile.office) {
      fetchOfficeEmail(profile.office);
    }
  }, [isOpen, profile.office]);

  const fetchOfficeEmail = async (location: string) => {
    try {
      const res = await fetch(
        `/api/location-email?location=${encodeURIComponent(location)}`
      );
      const data = await res.json();
      setOfficeEmail(data.email || 'info@intersolutions.com');
    } catch (error) {
      console.error('Error fetching office email:', error);
      setOfficeEmail('info@intersolutions.com'); // Fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email before submission
    if (!isValidEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Validate phone number before submission
    if (formData.phone && !isValidPhoneNumber(formData.phone)) {
      setPhoneError('Please enter a valid 10-digit phone number');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId: profile.id,
          profileName: fullName,
          location: profile.office,
          officeEmail,
          ...formData,
        }),
      });

      if (!response.ok) throw new Error('Failed to send request');

      setSubmitStatus('success');
      setTimeout(() => {
        onClose();
        resetForm();
      }, 2000);
    } catch (error) {
      console.error('Error submitting contact form:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', comment: '' });
    setSubmitStatus('idle');
    setPhoneError('');
    setEmailError('');
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      setTimeout(resetForm, 300); // Reset after animation
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Modal Content */}
        <div className="p-8">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Request Associate
            </h2>
            <p className="text-gray-600">
              Send a request for{' '}
              <span className="font-semibold text-gray-900">{fullName}</span>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {profile.profession_type} • {profile.city}, {profile.state}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Your Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all"
                placeholder="John Smith"
                disabled={isSubmitting}
              />
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Your Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                required
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  // Clear error when user starts typing again
                  if (emailError) setEmailError('');
                }}
                onBlur={() => {
                  // Validate on blur
                  if (formData.email && !isValidEmail(formData.email)) {
                    setEmailError('Please enter a valid email address');
                  }
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all ${
                  emailError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="john@example.com"
                disabled={isSubmitting}
              />
              {emailError && (
                <p className="mt-1 text-sm text-red-500">{emailError}</p>
              )}
            </div>

            {/* Phone Field (Optional) */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                value={formData.phone}
                onChange={(e) => {
                  const formattedPhone = formatPhoneNumber(e.target.value);
                  setFormData({ ...formData, phone: formattedPhone });
                  // Clear error when user starts typing again
                  if (phoneError) setPhoneError('');
                }}
                onBlur={() => {
                  // Validate on blur
                  if (formData.phone && !isValidPhoneNumber(formData.phone)) {
                    setPhoneError('Please enter a valid 10-digit phone number');
                  }
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all ${
                  phoneError ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="(555) 123-4567"
                disabled={isSubmitting}
              />
              {phoneError && (
                <p className="mt-1 text-sm text-red-500">{phoneError}</p>
              )}
            </div>

            {/* Comment Field */}
            <div>
              <label
                htmlFor="comment"
                className="block text-sm font-semibold text-gray-700 mb-2"
              >
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                id="comment"
                required
                value={formData.comment}
                onChange={(e) =>
                  setFormData({ ...formData, comment: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e3a5f] focus:border-[#1e3a5f] outline-none transition-all resize-none"
                placeholder="Tell us about your needs..."
                disabled={isSubmitting}
              />
            </div>

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">Request sent successfully!</span>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="font-medium">
                  Failed to send request. Please try again.
                </span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-[#1e3a5f] hover:bg-[#2d5a8f] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Request'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
