import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageCollageProps {
  images: string[];
}

export function ImageCollage({ images }: ImageCollageProps) {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden filter blur-[2px] opacity-50">
      <div className="grid grid-cols-3 grid-rows-2 h-full w-full gap-px">
        {images.map((src, index) => {
          // A simple array to make some images span more rows/cols
          const spans = [
            'col-span-1 row-span-1',
            'col-span-1 row-span-1',
            'col-span-1 row-span-2', // This one will be taller
            'col-span-2 row-span-1', // This one will be wider
            'col-span-1 row-span-1',
          ];

          return (
            <div
              key={index}
              className={cn('relative', spans[index % spans.length])}
            >
              <Image
                src={src}
                alt={`Collage image ${index + 1}`}
                fill
                className="object-cover"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
