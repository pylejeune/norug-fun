import defaultProfileImage from "@/public/images/default-profile.png";
import Image from "next/image";

type ProfileImageProps = {
  size?: number;
  className?: string;
};

export default function ProfileImage({
  size = 80,
  className = "",
}: ProfileImageProps) {
  return (
    <div
      className={`relative rounded-full overflow-hidden bg-gray-800 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={defaultProfileImage}
        alt="Profile"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority
      />
    </div>
  );
}
