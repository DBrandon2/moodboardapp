import { useEffect, useRef, useState } from "react";
import { useBoardStore } from "../../store/boardStore";
import Toolbar from "./Toolbar";

export default function Canvas() {
  const images = useBoardStore((state) => state.images);
  const addImage = useBoardStore((state) => state.addimage);
  const [openPanel, setOpenPanel] = useState(null);

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const panningRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    prevOffsetX: 0,
    prevOffsetY: 0,
  });

  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);

  // Garder les refs à jour
  useEffect(() => {
    offsetRef.current = { x: offsetX, y: offsetY };
  }, [offsetX, offsetY]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Coller une image
  useEffect(() => {
    const handlePaste = (e) => {
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
          const scaleImage = maxWidth / img.width;

          // Ajouter l'image au centre de l'écran visible
          const screenCenterX = window.innerWidth / 2;
          const screenCenterY = (window.innerHeight - 64) / 2;

          addImage({
            url: reader.result,
            x:
              screenCenterX -
              offsetRef.current.x -
              (img.width * scaleImage) / 2,
            y:
              screenCenterY -
              offsetRef.current.y -
              (img.height * scaleImage) / 2,
            width: img.width * scaleImage,
            height: img.height * scaleImage,
          });
        };
      };
      reader.readAsDataURL(file);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addImage]);

  const handleMouseDown = (e) => {
    // Ne pas panner si on clique sur la toolbar
    if (e.target.closest(".toolbar")) return;

    panningRef.current.active = true;
    panningRef.current.startX = e.clientX;
    panningRef.current.startY = e.clientY;
    panningRef.current.prevOffsetX = offsetX;
    panningRef.current.prevOffsetY = offsetY;
  };

  const handleMouseMove = (e) => {
    if (!panningRef.current.active) return;

    const dx = e.clientX - panningRef.current.startX;
    const dy = e.clientY - panningRef.current.startY;

    setOffsetX(panningRef.current.prevOffsetX + dx);
    setOffsetY(panningRef.current.prevOffsetY + dy);
  };

  const handleMouseUp = () => {
    panningRef.current.active = false;
  };

  // Zoom avec molette
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();

      const zoomSpeed = 0.001;
      const newScale = Math.min(
        Math.max(scaleRef.current - e.deltaY * zoomSpeed, 0.1),
        4,
      );

      // Calculer le point zoom centré sur la souris
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Nouveau offset pour que le zoom soit centré sur la souris
      const offsetXNew =
        mouseX - ((mouseX - offsetRef.current.x) * newScale) / scaleRef.current;
      const offsetYNew =
        mouseY - ((mouseY - offsetRef.current.y) * newScale) / scaleRef.current;

      setScale(newScale);
      setOffsetX(offsetXNew);
      setOffsetY(offsetYNew);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }
  }, []);

  const handleRecenter = () => {
    setOffsetX(0);
    setOffsetY(0);
    setScale(1);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // obligatoire pour que le drop fonctionne
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    const url = e.dataTransfer.getData("text/uri-list");

    // Convertir les coordonnées écran en coordonnées canvas
    const rect = containerRef.current.getBoundingClientRect();
    const canvasX =
      (e.clientX - rect.left - offsetRef.current.x) / scaleRef.current;
    const canvasY =
      (e.clientY - rect.top - offsetRef.current.y) / scaleRef.current;

    if (files && files.length > 0) {
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
            x: canvasX - width / 2,
            y: canvasY - height / 2,
            width,
            height,
          });
        };
      };
      reader.readAsDataURL(file);
    } else if (url) {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const maxWidth = 200;
        const scale = maxWidth / img.width;
        const width = img.width * scale;
        const height = img.height * scale;

        addImage({
          url,
          x: canvasX - width / 2,
          y: canvasY - height / 2,
          width,
          height,
        });
      };
    }
  };

  const handleCanvasClick = () => {
    setOpenPanel(null); // ferme le panel quand on clique sur le canvas
  };

  return (
    <div
      className="flex w-screen h-screen select-none"
      onClick={handleCanvasClick}
    >
      <Toolbar
        openPanel={openPanel}
        setOpenPanel={setOpenPanel}
        onRecenter={handleRecenter}
        offsetX={offsetX}
        offsetY={offsetY}
      />

      <div
        ref={containerRef}
        className="flex-1 bg-gray-900 overflow-hidden cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Grille de fond */}
        <div
          className="absolute inset-0 opacity-5 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(0deg, #fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        {/* Contenu avec offset et zoom */}
        <div
          ref={contentRef}
          className="absolute"
          style={{
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
            transformOrigin: "top left",
            width: "1000000px",
            height: "1000000px",
          }}
        >
          {images.map((image) => (
            <img
              key={image.id}
              src={image.url}
              className="absolute pointer-events-none"
              style={{
                top: image.y,
                left: image.x,
                width: image.width,
                height: image.height,
              }}
              alt=""
            />
          ))}
        </div>
      </div>
    </div>
  );
}
