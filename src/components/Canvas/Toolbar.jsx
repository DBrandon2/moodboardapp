import React, { useState } from "react";
import { useBoardStore } from "../../store/boardStore";

export default function Toolbar() {
  const [url, setUrl] = useState("");

  const addImage = useBoardStore((state) => state.addimage);

  const handleAddImage = () => {
    if (!url) return;

    const img = new Image();
    img.src = url;

    img.onload = () => {
      const maxWidth = 200;
      const scale = maxWidth / img.width;

      const width = maxWidth;
      const height = img.height * scale;

      addImage({
        url,
        x: 0,
        y: 0,
        width,
        height,
      });
      setUrl("");
    };
  };

  return (
    <div className="w-full p-4 bg-neutral-700 flex gap-2">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        type="text"
        placeholder="https://..."
        className="flex-1 px-3 py-2 rounded text-black"
      />
      <button
        onClick={handleAddImage}
        className="px-3 py-2 bg-blue-500 rounded hover:bg-blue-600"
      >
        Ajouter Image
      </button>
    </div>
  );
}
