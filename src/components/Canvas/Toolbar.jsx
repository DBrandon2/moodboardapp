import React, { useState } from "react";
import { useBoardStore } from "../../store/boardStore";
import { FiImage, FiCompass } from "react-icons/fi";

export default function Toolbar({
  onRecenter,
  offsetX = 0,
  offsetY = 0,
  openPanel,
  setOpenPanel,
}) {
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

      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      addImage({
        url,
        x: screenCenterX - offsetX - width / 2,
        y: screenCenterY - offsetY - height / 2,
        width,
        height,
      });
      setUrl("");
      setOpenPanel(null);
    };
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAddImage();
  };

  const handlePanelToggle = (panelName, e) => {
    e.stopPropagation();
    setOpenPanel(openPanel === panelName ? null : panelName);
  };

  return (
    <div className="w-16 bg-gray-800 h-full flex flex-col items-center py-4 gap-4 border-r border-gray-700 relative">
      {/* Bouton Recentrer */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRecenter();
        }}
        className="text-white text-3xl p-2 hover:bg-gray-700 rounded transition-colors"
        title="Recentrer"
      >
        <FiCompass />
      </button>
      
      {/* Bouton URL */}
      <button
        onClick={(e) => handlePanelToggle("url", e)}
        className="text-white text-3xl p-2 hover:bg-gray-700 rounded transition-colors"
        title="Ajouter une image par URL"
      >
        <FiImage />
      </button>

      {/* Panel URL séparé du bouton */}
      {openPanel === "url" && (
        <div
          className="absolute left-20 top-2 bg-gray-700 p-4 rounded shadow-lg flex flex-col gap-2 w-80 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex w-full">
            <p className="text-neutral-300">Ajouter une image par URL</p>
          </div>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            type="text"
            placeholder="https://... (ou Ctrl+V)"
            className="px-3 py-2 rounded text-neutral-300 border border-neutral-300 "
          />
          <div className="flex justify-end">
            <button
              onClick={handleAddImage}
              className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors font-medium"
            >
              Ajouter Image
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
