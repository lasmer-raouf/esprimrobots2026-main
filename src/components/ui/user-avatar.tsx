// src/components/ui/UserAvatar.tsx
"use client";

import React, {
  ImgHTMLAttributes,
  useRef,
  useEffect,
  useState,
} from "react";
import clsx from "clsx";
import { Avatar } from "./avatar";

function getAvatarColor(letter?: string): string {
  const key = letter?.toUpperCase();
  return key && key >= "A" && key <= "Z"
    ? `var(--avatar-${key})`
    : `var(--avatar-A)`;
}

export interface UserAvatarProps {
  firstName: string;
  lastName?: string;
  src?: string | null;
  imgProps?: Omit<ImgHTMLAttributes<HTMLImageElement>, "src">;
  /** Tailwind classes for width/height (default "w-10 h-10") */
  sizeClass?: string;
  className?: string;
  /** Ratio of font-size to container width (default 0.4 = 40%) */
  fontRatio?: number;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  firstName,
  lastName,
  src,
  imgProps,
  sizeClass = "w-10 h-10",
  className,
  fontRatio = 0.4,
}) => {
  const firstInitial = firstName.charAt(0).toUpperCase();
  const secondInitial = lastName?.charAt(0).toUpperCase() ?? "";
  const bgColor = getAvatarColor(firstInitial);

  const containerRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState<number>();

  useEffect(() => {
    if (!containerRef.current) return;
    const node = containerRef.current;

    const updateSize = () => {
      const w = node.clientWidth;
      setFontSize(w * fontRatio);
    };
    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(node);
    return () => void ro.disconnect();
  }, [fontRatio]);

  return (
    <Avatar
      ref={containerRef}
      className={clsx(
        sizeClass,
        "rounded-full flex items-center justify-center font-medium text-white overflow-hidden",
        className
      )}
      style={{
        backgroundColor: bgColor,
        fontSize: fontSize ? `${fontSize}px` : undefined,
        lineHeight: 1,
      }}
    >
      {src ? (
        <img
          src={src}
          {...imgProps}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className="object-cover w-full h-full"
        />
      ) : (
        `${firstInitial}${secondInitial}`
      )}
    </Avatar>
  );
};

export default UserAvatar;
