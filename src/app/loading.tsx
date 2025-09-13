
import Image from "next/image";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="relative h-20 w-20">
        <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <Image
          src="https://i.pinimg.com/736x/34/f4/8c/34f48c7149d85a0f50d459a2d51aba10.jpg"
          alt="Loading..."
          fill
          className="rounded-full object-cover"
          unoptimized
        />
      </div>
    </div>
  );
}
