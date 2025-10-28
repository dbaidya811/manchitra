"use client";
import { useMapEvents } from "react-leaflet";

export default function ClickCatcher({ onClick }: { onClick?: (e: any) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e);
    },
  });
  return null;
}
