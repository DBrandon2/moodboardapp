import React, { useState, useRef, useEffect } from "react";
import { useBoardStore } from "../../store/boardStore";
import { FiCompass, FiPlus, FiLink, FiUpload } from "react-icons/fi";

export default function Toolbar({ onRecenter, offsetX = 0, offsetY = 0 }) {
  const [url, setUrl] = useState("");
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ left: 0, top: 0 });
  const fileInputRef = useRef(null);
  const addButtonRef = useRef(null);
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
        originalWidth: img.width,
        originalHeight: img.height,
      });
      setUrl("");
      setAddMenuOpen(false);
    };
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleAddImage();
  };

  const handleAddMenuToggle = (e) => {
    e.stopPropagation();
    if (!addMenuOpen && addButtonRef.current) {
      const rect = addButtonRef.current.getBoundingClientRect();
      const menuWidth = 320; // w-80
      const padding = 8;
      let left = rect.left + rect.width / 2 - menuWidth / 2;
      // clamp horizontally
      left = Math.max(padding, Math.min(left, window.innerWidth - padding - menuWidth));
      const top = rect.bottom + 8;
      setMenuPos({ left, top });
    }
    setAddMenuOpen(!addMenuOpen);
  };

  // fermer menu si clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-add-menu]")) {
        setAddMenuOpen(false);
      }
    };
    if (addMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [addMenuOpen]);

  return (
    <div className="w-full h-16 flex flex-row items-center justify-center py-2 gap-4 border-t border-gray-700 absolute bottom-0 left-0 z-[2000] bg-gray-800/80 toolbar md:w-16 md:h-full md:flex-col md:items-center md:py-4 md:border-r md:border-t-0 md:top-0 md:bottom-auto">
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

      {/* Bouton Add (plus) */}
      <button
        ref={addButtonRef}
        onClick={handleAddMenuToggle}
        className="text-white text-3xl p-2 hover:bg-gray-700 rounded transition-colors"
        title="Ajouter une image"
      >
        <FiPlus />
      </button>

      {/* Menu d'ajout animé */}
      {addMenuOpen && (
        <div
          data-add-menu
          style={{
            animation: "menu-appear 0.18s ease-out forwards",
            left: menuPos.left,
            top: menuPos.top
          }}
          className="fixed bg-amber-50 border border-gray-300 rounded-lg shadow-xl py-4 px-6 z-50 w-80
            transform origin-top center"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-gray-900 font-semibold mb-2">Ajouter une image</p>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            type="text"
            placeholder="https://... (ou Ctrl+V)"
            className="px-3 py-2 rounded text-gray-900 border border-gray-400 w-full mb-3"
          />
          <div className="flex justify-between">
            <button
              onClick={handleAddImage}
              className="flex items-center px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors font-medium"
            >
              <FiLink className="mr-2" /> URL
            </button>
            <button
              onClick={() => fileInputRef.current.click()}
              className="flex items-center px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 transition-colors font-medium"
            >
              <FiUpload className="mr-2" /> Fichier
            </button>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files && e.target.files[0];
              if (!file || !file.type.startsWith("image/")) return;
              const reader = new FileReader();
              reader.onload = () => {
                const img = new Image();
                img.src = reader.result;
                img.onload = () => {
                  const maxWidth = 200;
                  const scale = maxWidth / img.width;
                  const width = maxWidth;
                  const height = img.height * scale;
                  const screenCenterX = window.innerWidth / 2;
                  const screenCenterY = window.innerHeight / 2;

                  addImage({
                    url: reader.result,
                    x: screenCenterX - offsetX - width / 2,
                    y: screenCenterY - offsetY - height / 2,
                    width,
                    height,
                    originalWidth: img.width,
                    originalHeight: img.height,
                  });
                  setAddMenuOpen(false);
                };
              };
              reader.readAsDataURL(file);
              e.target.value = "";
            }}
          />
        </div>
      )}
      {/* animation keyframes */}
      <style>{`
        @keyframes menu-appear {
          0% { opacity: 0; transform: scale(0.9) translateY(-10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
