/**
 * Small brand marks for the channel headers. These are stylised badges in each
 * brand's colours (an Amazon smile curve, a Myntra "M"), not copies of the
 * registered logos — enough to scan a table by colour without shipping
 * someone else's trademark artwork.
 */
export function ChannelLogo({ channel, size = 16 }: { channel: string; size?: number }) {
  if (channel === "Amazon") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <rect width="24" height="24" rx="5" fill="#232F3E" />
        <path d="M5 15.2c2.6 1.9 5.2 2.6 8 2.6 1.9 0 3.9-.4 5.7-1.3.3-.1.5.2.3.4-1.6 1.5-4 2.3-6.2 2.3-3 0-5.8-1.2-7.9-3.3-.2-.2 0-.5.1-.7z" fill="#FF9900" />
        <path d="M19.2 14.3c-.3-.4-2-.2-2.7-.1-.2 0-.3-.2-.1-.3 1.3-.9 3.5-.7 3.8-.3.3.4-.1 2.5-1.3 3.5-.2.2-.4.1-.3-.1.3-.8.9-2.3.6-2.7z" fill="#FF9900" />
        <text x="12" y="11.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#FFFFFF" fontFamily="Arial, sans-serif">
          a
        </text>
      </svg>
    );
  }
  if (channel === "Myntra") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <defs>
          <linearGradient id="myntra-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF3F6C" />
            <stop offset="60%" stopColor="#FF527B" />
            <stop offset="100%" stopColor="#F16565" />
          </linearGradient>
        </defs>
        <rect width="24" height="24" rx="5" fill="url(#myntra-grad)" />
        <path d="M6 17V8.5l3 4.2 3-4.2V17" stroke="#FFFFFF" strokeWidth="1.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15.5 8.5v5.2c0 1.9 1 3.3 2.7 3.3" stroke="#FFFFFF" strokeWidth="1.9" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (channel === "Global") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
        <rect width="24" height="24" rx="5" fill="#0F766E" />
        <circle cx="12" cy="12" r="6" stroke="#FFFFFF" strokeWidth="1.6" fill="none" />
        <path d="M6 12h12M12 6c2 2.4 2 9.6 0 12M12 6c-2 2.4-2 9.6 0 12" stroke="#FFFFFF" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }
  return null;
}

export function ChannelLabel({ channel, size = 16 }: { channel: string; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <ChannelLogo channel={channel} size={size} />
      {channel}
    </span>
  );
}
