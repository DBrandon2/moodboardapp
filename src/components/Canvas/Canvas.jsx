import { useEffect } from "react";
import { useBoardStore } from "../../store/boardStore";
import Toolbar from "./Toolbar";

export default function Canvas() {
  const images = useBoardStore((state) => state.images);
  const addImage = useBoardStore((state) => state.addimage);

  useEffect(() => {
    const handlePaste = (e) => {
      console.log(e.clipboardData.files);
      const files = e.clipboardData.files;

      if (!files || files.length === 0) return;

      const file = files[0];

      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();
        img.src = reader.result;

        img.onload = () => {
          const maxWidth = 200;
          const scale = maxWidth / img.width;

          const width = img.width * scale;
          const height = img.height * scale;

          addImage({
            url: reader.result,
            x: 0,
            y: 0,
            width,
            height,
          });
        };
      };
      reader.readAsDataURL(file);
    };
    window.addEventListener("paste", handlePaste);

    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <div className="w-full h-screen relative bg-neutral-900 overflow-hidden ">
      <Toolbar />
      {images.map((image) => {
        return (
          <img
            src={image.url}
            key={image.id}
            className="absolute"
            style={{
              top: image.y,
              left: image.x,
              width: image.width,
              height: image.height,
            }}
            alt=""
          />
        );
      })}
    </div>
  );
}
