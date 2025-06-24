import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  iconSize?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconClassName?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  showIcon = true,
  iconSize = 16,
  position = 'top',
  className = '',
  iconClassName = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (isMobile) {
      setIsVisible(!isVisible);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsVisible(!isVisible);
    }
    if (e.key === 'Escape') {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        triggerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };

    if (isVisible && isMobile) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, isMobile]);

  const getTooltipPosition = () => {
    const baseClasses = 'absolute z-50 px-3 py-2 text-sm font-medium text-white bg-neutral-900 rounded-lg shadow-lg max-w-xs break-words';
    
    switch (position) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-neutral-900';
      case 'bottom':
        return 'absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-neutral-900';
      case 'left':
        return 'absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-neutral-900';
      case 'right':
        return 'absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-neutral-900';
      default:
        return 'absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-neutral-900';
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <div
        ref={triggerRef}
        className="flex items-center"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Info: ${content}`}
        aria-expanded={isVisible}
      >
        {children}
        {showIcon && (
          <Info 
            size={iconSize} 
            className={`text-neutral-400 hover:text-neutral-600 cursor-help transition-colors ${iconClassName}`}
          />
        )}
      </div>

      {isVisible && (
        <div ref={tooltipRef} className={getTooltipPosition()}>
          {content}
          <div className={getArrowClasses()}></div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;