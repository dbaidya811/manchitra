import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageCollageProps {
  images: string[];
}

export function ImageCollage({ images }: ImageCollageProps) {
  const imageStyles = [
    { top: '5%', left: '10%', width: 200, height: 300, delay: '0s' },
    { top: '20%', left: '60%', width: 250, height: 350, delay: '5s' },
    { top: '50%', left: '25%', width: 180, height: 280, delay: '10s' },
    { top: '65%', left: '70%', width: 220, height: 320, delay: '15s' },
    { top: '80%', left: '5%', width: 280, height: 380, delay: '20s' },
  ];

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div className="relative w-full h-full">
        {images.map((src, index) => {
          const style = imageStyles[index % imageStyles.length];
          return (
            <div
              key={index}
              className="absolute animate-move-down filter blur-[2px]"
              style={{
                top: style.top,
                left: style.left,
                animationDelay: style.delay,
              }}
            >
              <Image
                src={src}
                alt={`Collage image ${index + 1}`}
                width={style.width}
                height={style.height}
                className="object-cover rounded-lg shadow-2xl opacity-50"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
