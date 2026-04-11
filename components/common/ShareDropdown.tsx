'use client'

import React, { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Share2, Facebook, Twitter, Linkedin, Mail, Link2, Check, Share, Send, MessageCircle, Globe, Instagram } from 'lucide-react';
import {
  PinterestShareButton,
  PinterestIcon,
} from 'react-share';

interface ShareProps {
  url: string;
  title: string;
  eventTitle?: string;
}

export default function ShareDropdown({ url, title, eventTitle }: ShareProps) {
  const [copied, setCopied] = useState(false);

  const shareData = {
    url: url,
    title: title,
    text: `🎫 Get your tickets for "${eventTitle || title}" on CACK-pass - The Future of Event Ticketing!`,
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareData.title,
          text: shareData.text,
          url: shareData.url,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const socialLinks = [
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      iconColor: 'text-white',
      bgColor: 'bg-green-600',
      hoverBg: 'hover:bg-green-700',
      shareUrl: `https://wa.me/?text=${encodeURIComponent(`${shareData.text}\n\n${shareData.url}`)}`,
      isExternal: true,
    },
    {
      name: 'Telegram',
      icon: Send,
      iconColor: 'text-white',
      bgColor: 'bg-blue-500',
      hoverBg: 'hover:bg-blue-600',
      shareUrl: `https://t.me/share/url?url=${encodeURIComponent(shareData.url)}&text=${encodeURIComponent(shareData.text)}`,
      isExternal: true,
    },
    {
      name: 'X (Twitter)',
      icon: Twitter,
      iconColor: 'text-white',
      bgColor: 'bg-black',
      hoverBg: 'hover:bg-gray-800',
      shareUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`,
      isExternal: true,
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      iconColor: 'text-white',
      bgColor: 'bg-blue-700',
      hoverBg: 'hover:bg-blue-800',
      shareUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareData.url)}`,
      isExternal: true,
    },
    {
      name: 'Facebook',
      icon: Facebook,
      iconColor: 'text-white',
      bgColor: 'bg-blue-600',
      hoverBg: 'hover:bg-blue-700',
      shareUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`,
      isExternal: true,
    },
    {
      name: 'Instagram',
      icon: Instagram,
      iconColor: 'text-white',
      bgColor: 'bg-pink-600',
      hoverBg: 'hover:bg-pink-700',
      shareUrl: `https://www.instagram.com/?url=${encodeURIComponent(shareData.url)}`,
      isExternal: true,
      note: 'Copy link',
    },
    {
      name: 'Email',
      icon: Mail,
      iconColor: 'text-white',
      bgColor: 'bg-gray-600',
      hoverBg: 'hover:bg-gray-700',
      shareUrl: `mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text + '\n\n' + shareData.url)}`,
      isExternal: true,
    },
  ];

  // Check if native share is available
  const isNativeShareAvailable = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button 
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-primary-dark text-white rounded-xl hover:shadow-lg transition-all duration-200 text-sm sm:text-base"
          aria-label="Share event"
        >
          <Share2 size={18} />
          <span className="hidden sm:inline">Share Event</span>
          <span className="sm:hidden">Share</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          className="z-50 min-w-[220px] sm:min-w-[280px] bg-white dark:bg-gray-800 rounded-2xl p-2 shadow-xl border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-200"
          sideOffset={8}
          align="end"
        >
          {/* Header */}
          <div className="px-3 py-2 mb-1 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Share this event
            </p>
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 gap-1 max-h-[400px] overflow-y-auto">
            {/* Native Share (Mobile) */}
            {isNativeShareAvailable && (
              <DropdownMenu.Item asChild>
                <button
                  onClick={handleNativeShare}
                  className="flex items-center w-full gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                    <Share className="h-4 w-4 text-white" />
                  </div>
                  <span className="flex-1 text-left font-medium">Share (Native)</span>
                </button>
              </DropdownMenu.Item>
            )}

            {/* Copy Link */}
            <DropdownMenu.Item asChild>
              <button
                onClick={handleCopyLink}
                className="flex items-center w-full gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center group-hover:bg-gray-300 dark:group-hover:bg-gray-500">
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Link2 className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  )}
                </div>
                <span className="flex-1 text-left font-medium">
                  {copied ? 'Copied!' : 'Copy Link'}
                </span>
                {copied && (
                  <span className="text-xs text-green-500">✓</span>
                )}
              </button>
            </DropdownMenu.Item>

            {/* Divider */}
            <div className="my-1 h-px bg-gray-100 dark:bg-gray-700" />

            {/* Social Media Links - Regular links */}
            {socialLinks.map((social) => (
              <DropdownMenu.Item key={social.name} asChild>
                <a
                  href={social.shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center w-full gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all group"
                >
                  <div className={`w-8 h-8 rounded-full ${social.bgColor} ${social.hoverBg} flex items-center justify-center transition-colors`}>
                    <social.icon className={`h-4 w-4 ${social.iconColor}`} />
                  </div>
                  <span className="flex-1 text-left font-medium">{social.name}</span>
                  {social.note ? (
                    <span className="text-xs text-gray-400">{social.note}</span>
                  ) : (
                    <Globe className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </a>
              </DropdownMenu.Item>
            ))}

            {/* Pinterest - Special handling with react-share button */}
            <DropdownMenu.Item asChild>
              <PinterestShareButton
                url={url}
                media={url}
                description={shareData.text}
                className="flex items-center w-full gap-3 px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-colors">
                  <PinterestIcon size={18} round />
                </div>
                <span className="flex-1 text-left font-medium">Pinterest</span>
                <Globe className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </PinterestShareButton>
            </DropdownMenu.Item>
          </div>

          {/* Footer */}
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 px-3 py-2">
            <p className="text-xs text-center text-gray-400 dark:text-gray-500">
              Powered by <span className="font-semibold text-primary">CACK-pass</span>
            </p>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}