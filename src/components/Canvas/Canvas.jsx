import { useEffect, useRef, useState } from "react";
import { useBoardStore } from "../../store/boardStore";

export default function Canvas({
  offsetX,
  setOffsetX,
  offsetY,
  setOffsetY,
  scale,
  setScale,
}) {
  const images = useBoardStore((state) => state.images);
  const selectedImageIds = useBoardStore((state) => state.selectedImageIds);
  const addImage = useBoardStore((state) => state.addimage);
  const updateMultipleImagePositions = useBoardStore(
    (state) => state.updateMultipleImagePositions,
  );
  const updateImagePositionAndDimensions = useBoardStore(
    (state) => state.updateImagePositionAndDimensions,
  );
  const updateImageRotation = useBoardStore(
    (state) => state.updateImageRotation,
  );
  const saveHistory = useBoardStore((state) => state.saveHistory);
  const undo = useBoardStore((state) => state.undo);
  const selectImages = useBoardStore((state) => state.selectImages);
  const clearSelection = useBoardStore((state) => state.clearSelection);

  const [isPanning, setIsPanning] = useState(false);

  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const ctrlPressedRef = useRef(false);

  const mouseMoveHandlerRef = useRef(null);
  const mouseUpHandlerRef = useRef(null);

  // Boîte de sélection
  const selectionBoxRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const panningRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    prevOffsetX: 0,
    prevOffsetY: 0,
  });

  const draggingRef = useRef({
    active: false,
    imageIds: [],
    startX: 0,
    startY: 0,
    prevPositions: {},
  });

  const resizingRef = useRef({
    active: false,
    imageId: null,
    handle: null,
    startX: 0,
    startY: 0,
    startImage: {},
    aspectRatio: 1,
  });

  const rotatingRef = useRef({
    active: false,
    imageId: null,
    startX: 0,
    startY: 0,
    startRotation: 0,
    centerX: 0,
    centerY: 0,
  });

  const autoPanRef = useRef({
    active: false,
    directionX: 0,
    directionY: 0,
    rafId: null,
  });

  const [selectionBox, setSelectionBox] = useState(null);

  useEffect(() => {
    offsetRef.current = { x: offsetX, y: offsetY };
  }, [offsetX, offsetY]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // Coller image depuis clipboard
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
          const scaleImg = maxWidth / img.width;
          const centerX =
            (window.innerWidth / 2 - offsetRef.current.x) / scaleRef.current;
          const centerY =
            (window.innerHeight / 2 - offsetRef.current.y) / scaleRef.current;

          saveHistory();
          addImage({
            url: reader.result,
            x: centerX - (img.width * scaleImg) / 2,
            y: centerY - (img.height * scaleImg) / 2,
            width: img.width * scaleImg,
            height: img.height * scaleImg,
          });
        };
      };
      reader.readAsDataURL(file);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addImage, saveHistory]);

  // Ctrl+Z et gestion des touches
  useEffect(() => {
    const handleKeyDown = (e) => {
      ctrlPressedRef.current = e.ctrlKey || e.metaKey || e.shiftKey;

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
    };

    const handleKeyUp = (e) => {
      ctrlPressedRef.current = e.ctrlKey || e.metaKey || e.shiftKey;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [undo]);

  // Attacher mousemove et mouseup à window pour tracker même hors du canvas
  useEffect(() => {
    const handleDocumentMouseMove = (e) => {
      if (
        selectionBoxRef.current.active ||
        draggingRef.current.active ||
        resizingRef.current.active ||
        rotatingRef.current.active ||
        panningRef.current.active
      ) {
        mouseMoveHandlerRef.current?.(e);
      }
    };

    const handleDocumentMouseUp = (e) => {
      mouseUpHandlerRef.current?.(e);
    };

    window.addEventListener("mousemove", handleDocumentMouseMove);
    window.addEventListener("mouseup", handleDocumentMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleDocumentMouseMove);
      window.removeEventListener("mouseup", handleDocumentMouseUp);
    };
  }, []);

  const getResizeHandleAtPoint = (mouseX, mouseY, imageId) => {
    const img = images.find((i) => i.id === imageId);
    if (!img) return null;

    const local = getLocalPoint(mouseX, mouseY, img);

    const handleSize = 8;

    const handles = [
      { key: "tl", x: 0, y: 0 },
      { key: "tr", x: img.width, y: 0 },
      { key: "bl", x: 0, y: img.height },
      { key: "br", x: img.width, y: img.height },
      { key: "t", x: img.width / 2, y: 0 },
      { key: "b", x: img.width / 2, y: img.height },
      { key: "l", x: 0, y: img.height / 2 },
      { key: "r", x: img.width, y: img.height / 2 },
    ];

    for (const handle of handles) {
      if (
        local.x >= handle.x - handleSize &&
        local.x <= handle.x + handleSize &&
        local.y >= handle.y - handleSize &&
        local.y <= handle.y + handleSize
      ) {
        return handle.key;
      }
    }

    return null;
  };

  const getRotationHandleAtPoint = (mouseX, mouseY, imageId) => {
    const img = images.find((i) => i.id === imageId);
    if (!img) return false;

    const local = getLocalPoint(mouseX, mouseY, img);

    const handleX = img.width / 2;
    const handleY = -50;

    const handleSize = 12;

    return (
      local.x >= handleX - handleSize &&
      local.x <= handleX + handleSize &&
      local.y >= handleY - handleSize &&
      local.y <= handleY + handleSize
    );
  };

  const handleMouseDown = (e) => {
    if (e.target.closest(".toolbar")) return;

    dragStartRef.current = { x: e.clientX, y: e.clientY };
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX =
      (e.clientX - rect.left - offsetRef.current.x) / scaleRef.current;
    const mouseY =
      (e.clientY - rect.top - offsetRef.current.y) / scaleRef.current;

    if (e.button === 0) {
      // Vérifier si clic sur le handle de rotation d'une image sélectionnée
      for (const imageId of selectedImageIds) {
        if (getRotationHandleAtPoint(mouseX, mouseY, imageId)) {
          const img = images.find((i) => i.id === imageId);
          saveHistory();
          rotatingRef.current.active = true;
          rotatingRef.current.imageId = imageId;
          rotatingRef.current.startX = mouseX;
          rotatingRef.current.startY = mouseY;
          rotatingRef.current.startRotation = img.rotation || 0;
          rotatingRef.current.centerX = img.x + img.width / 2;
          rotatingRef.current.centerY = img.y + img.height / 2;
          return;
        }
      }

      // Vérifier si clic sur un handle de redimensionnement d'une image sélectionnée
      for (const imageId of selectedImageIds) {
        const handle = getResizeHandleAtPoint(mouseX, mouseY, imageId);
        if (handle) {
          const img = images.find((i) => i.id === imageId);
          saveHistory();
          resizingRef.current.active = true;
          resizingRef.current.imageId = imageId;
          resizingRef.current.handle = handle;
          resizingRef.current.startX = e.clientX;
          resizingRef.current.startY = e.clientY;
          resizingRef.current.startImage = {
            x: img.x,
            y: img.y,
            width: img.width,
            height: img.height,
          };
          resizingRef.current.aspectRatio = img.width / img.height;
          return;
        }
      }

      // Vérifier clic sur image
      let clickedImageId = null;
      for (let i = images.length - 1; i >= 0; i--) {
        const img = images[i];
        const local = getLocalPoint(mouseX, mouseY, img);

        if (
          local.x >= 0 &&
          local.x <= img.width &&
          local.y >= 0 &&
          local.y <= img.height
        ) {
          clickedImageId = img.id;
          break;
        }
      }

      if (clickedImageId) {
        // Drag images
        if (!selectedImageIds.includes(clickedImageId))
          selectImages([clickedImageId]);
        saveHistory();
        draggingRef.current.active = true;
        draggingRef.current.imageIds = selectedImageIds.includes(clickedImageId)
          ? [...selectedImageIds]
          : [clickedImageId];
        draggingRef.current.startX = e.clientX;
        draggingRef.current.startY = e.clientY;
        draggingRef.current.prevPositions = {};
        draggingRef.current.imageIds.forEach((id) => {
          const img = images.find((i) => i.id === id);
          if (img)
            draggingRef.current.prevPositions[id] = { x: img.x, y: img.y };
        });
      } else {
        // Boîte de sélection
        selectionBoxRef.current.active = true;
        selectionBoxRef.current.startX = mouseX;
        selectionBoxRef.current.startY = mouseY;
        selectionBoxRef.current.currentX = mouseX;
        selectionBoxRef.current.currentY = mouseY;
        clearSelection();
      }
    }

    // Clic droit : panning
    if (e.button === 2) {
      panningRef.current.active = true;
      setIsPanning(true);
      panningRef.current.startX = e.clientX;
      panningRef.current.startY = e.clientY;
      panningRef.current.prevOffsetX = offsetRef.current.x;
      panningRef.current.prevOffsetY = offsetRef.current.y;
    }
  };

  const getLocalPoint = (mouseX, mouseY, img) => {
    const angle = (img.rotation || 0) * (Math.PI / 180);

    const centerX = img.x + img.width / 2;
    const centerY = img.y + img.height / 2;

    const dx = mouseX - centerX;
    const dy = mouseY - centerY;

    const localX = dx * Math.cos(-angle) - dy * Math.sin(-angle);
    const localY = dx * Math.sin(-angle) + dy * Math.cos(-angle);

    return {
      x: localX + img.width / 2,
      y: localY + img.height / 2,
    };
  };

  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();

    /* =========================
      AUTO PAN DETECTION
    ========================= */

    const edgeThreshold = 100;
    let dirX = 0;
    let dirY = 0;

    if (selectionBoxRef.current.active || draggingRef.current.active) {
      const distanceLeft = e.clientX - rect.left;
      const distanceRight = rect.right - e.clientX;
      const distanceTop = e.clientY - rect.top;
      const distanceBottom = rect.bottom - e.clientY;

      if (distanceLeft < edgeThreshold)
        dirX = (edgeThreshold - distanceLeft) / edgeThreshold;
      else if (distanceRight < edgeThreshold)
        dirX = -(edgeThreshold - distanceRight) / edgeThreshold;

      if (distanceTop < edgeThreshold)
        dirY = (edgeThreshold - distanceTop) / edgeThreshold;
      else if (distanceBottom < edgeThreshold)
        dirY = -(edgeThreshold - distanceBottom) / edgeThreshold;

      if (dirX !== 0 || dirY !== 0) {
        autoPanRef.current.active = true;
        autoPanRef.current.directionX = dirX;
        autoPanRef.current.directionY = dirY;
        startAutoPan();
      } else {
        stopAutoPan();
      }
    }

    // Rotation
    if (rotatingRef.current.active) {
      const mouseX =
        (e.clientX - rect.left - offsetRef.current.x) / scaleRef.current;
      const mouseY =
        (e.clientY - rect.top - offsetRef.current.y) / scaleRef.current;

      const centerX = rotatingRef.current.centerX;
      const centerY = rotatingRef.current.centerY;

      // Calculer l'angle par rapport au centre de l'image
      const angle1 = Math.atan2(
        rotatingRef.current.startY - centerY,
        rotatingRef.current.startX - centerX,
      );
      const angle2 = Math.atan2(mouseY - centerY, mouseX - centerX);
      const deltaAngle = (angle2 - angle1) * (180 / Math.PI);

      const newRotation =
        (rotatingRef.current.startRotation + deltaAngle) % 360;

      updateImageRotation(rotatingRef.current.imageId, newRotation);
      return;
    }

    // Redimensionnement
    if (resizingRef.current.active) {
      const deltaX =
        (e.clientX - resizingRef.current.startX) / scaleRef.current;
      const deltaY =
        (e.clientY - resizingRef.current.startY) / scaleRef.current;

      const start = resizingRef.current.startImage;
      const handle = resizingRef.current.handle;
      const aspectRatio = resizingRef.current.aspectRatio;
      const isProportional = ctrlPressedRef.current;

      let newWidth = start.width;
      let newHeight = start.height;
      let newX = start.x;
      let newY = start.y;

      // Gérer les différents types de handles avec ratio proportionnel si Shift
      if (handle === "br") {
        // Anchor: top-left
        if (isProportional) {
          const maxDelta = Math.max(deltaX, deltaY);
          newWidth = Math.max(20, start.width + maxDelta);
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = Math.max(20, start.width + deltaX);
          newHeight = Math.max(20, start.height + deltaY);
        }
      } else if (handle === "bl") {
        // Anchor: top-right
        if (isProportional) {
          const maxDelta = Math.max(-deltaX, deltaY);
          newWidth = Math.max(20, start.width + maxDelta);
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = Math.max(20, start.width - deltaX);
          newHeight = Math.max(20, start.height + deltaY);
        }

        newX = start.x + (start.width - newWidth);
      } else if (handle === "tr") {
        // Anchor: bottom-left
        if (isProportional) {
          const maxDelta = Math.max(deltaX, -deltaY);
          newWidth = Math.max(20, start.width + maxDelta);
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = Math.max(20, start.width + deltaX);
          newHeight = Math.max(20, start.height - deltaY);
        }

        newY = start.y + (start.height - newHeight);
      } else if (handle === "tl") {
        // Anchor: bottom-right
        if (isProportional) {
          const maxDelta = Math.max(-deltaX, -deltaY);
          newWidth = Math.max(20, start.width + maxDelta);
          newHeight = newWidth / aspectRatio;
        } else {
          newWidth = Math.max(20, start.width - deltaX);
          newHeight = Math.max(20, start.height - deltaY);
        }

        newX = start.x + (start.width - newWidth);
        newY = start.y + (start.height - newHeight);
      } else if (handle === "r") {
        // Anchor: left
        newWidth = Math.max(20, start.width + deltaX);

        if (isProportional) {
          newHeight = newWidth / aspectRatio;
          const heightDiff = (start.height - newHeight) / 2;
          newY = start.y + heightDiff;
        }
      } else if (handle === "l") {
        // Anchor: right
        newWidth = Math.max(20, start.width - deltaX);

        if (isProportional) {
          newHeight = newWidth / aspectRatio;
          const heightDiff = (start.height - newHeight) / 2;
          newY = start.y + heightDiff;
        }

        newX = start.x + (start.width - newWidth);
      } else if (handle === "b") {
        // Anchor: top
        newHeight = Math.max(20, start.height + deltaY);

        if (isProportional) {
          newWidth = newHeight * aspectRatio;
          const widthDiff = (start.width - newWidth) / 2;
          newX = start.x + widthDiff;
        }
      } else if (handle === "t") {
        // Anchor: bottom
        newHeight = Math.max(20, start.height - deltaY);

        if (isProportional) {
          newWidth = newHeight * aspectRatio;
          const widthDiff = (start.width - newWidth) / 2;
          newX = start.x + widthDiff;
        }

        newY = start.y + (start.height - newHeight);
      }

      updateImagePositionAndDimensions(
        resizingRef.current.imageId,
        newX,
        newY,
        newWidth,
        newHeight,
      );
      return;
    }

    // Boîte de sélection
    if (selectionBoxRef.current.active) {
      const mouseX =
        (e.clientX - rect.left - offsetRef.current.x) / scaleRef.current;
      const mouseY =
        (e.clientY - rect.top - offsetRef.current.y) / scaleRef.current;
      selectionBoxRef.current.currentX = mouseX;
      selectionBoxRef.current.currentY = mouseY;

      setSelectionBox({
        startX: selectionBoxRef.current.startX,
        startY: selectionBoxRef.current.startY,
        currentX: mouseX,
        currentY: mouseY,
      });

      // Sélection images
      const minX = Math.min(selectionBoxRef.current.startX, mouseX);
      const minY = Math.min(selectionBoxRef.current.startY, mouseY);
      const maxX = Math.max(selectionBoxRef.current.startX, mouseX);
      const maxY = Math.max(selectionBoxRef.current.startY, mouseY);

      const selectedIds = images
        .filter(
          (img) =>
            img.x + img.width > minX &&
            img.x < maxX &&
            img.y + img.height > minY &&
            img.y < maxY,
        )
        .map((img) => img.id);

      selectImages(selectedIds);
      return;
    }

    // Drag images
    if (draggingRef.current.active) {
      const deltaX =
        (e.clientX - draggingRef.current.startX) / scaleRef.current;
      const deltaY =
        (e.clientY - draggingRef.current.startY) / scaleRef.current;
      updateMultipleImagePositions(
        draggingRef.current.imageIds,
        deltaX,
        deltaY,
      );
      draggingRef.current.startX = e.clientX;
      draggingRef.current.startY = e.clientY;
      return;
    }

    // Panning
    if (panningRef.current.active) {
      const dx = e.clientX - panningRef.current.startX;
      const dy = e.clientY - panningRef.current.startY;
      setOffsetX(panningRef.current.prevOffsetX + dx);
      setOffsetY(panningRef.current.prevOffsetY + dy);
    }
  };

  const handleMouseUp = () => {
    panningRef.current.active = false;
    setIsPanning(false);
    draggingRef.current.active = false;
    resizingRef.current.active = false;
    rotatingRef.current.active = false;
    stopAutoPan();
    if (selectionBoxRef.current.active) {
      const { startX, startY, currentX, currentY } = selectionBoxRef.current;

      const minX = Math.min(startX, currentX);
      const minY = Math.min(startY, currentY);
      const maxX = Math.max(startX, currentX);
      const maxY = Math.max(startY, currentY);

      const selectedIds = images
        .filter(
          (img) =>
            img.x + img.width > minX &&
            img.x < maxX &&
            img.y + img.height > minY &&
            img.y < maxY,
        )
        .map((img) => img.id);

      selectImages(selectedIds);
    }

    selectionBoxRef.current.active = false;
    setSelectionBox(null);
  };

  const startAutoPan = () => {
    if (autoPanRef.current.rafId) return;

    const maxSpeed = 20; // vitesse max fixe

    const step = () => {
      if (!autoPanRef.current.active) {
        cancelAnimationFrame(autoPanRef.current.rafId);
        autoPanRef.current.rafId = null;
        return;
      }

      const moveX = autoPanRef.current.directionX * maxSpeed;
      const moveY = autoPanRef.current.directionY * maxSpeed;

      // 1️⃣ déplacer le canvas
      setOffsetX((prev) => prev + moveX);
      setOffsetY((prev) => prev + moveY);

      // 2️⃣ si drag actif → compenser UNIQUEMENT les images
      if (draggingRef.current.active) {
        updateMultipleImagePositions(
          draggingRef.current.imageIds,
          -moveX / scaleRef.current,
          -moveY / scaleRef.current,
        );
      }

      autoPanRef.current.rafId = requestAnimationFrame(step);
    };

    autoPanRef.current.rafId = requestAnimationFrame(step);
  };

  const stopAutoPan = () => {
    autoPanRef.current.active = false;
    if (autoPanRef.current.rafId) {
      cancelAnimationFrame(autoPanRef.current.rafId);
      autoPanRef.current.rafId = null;
    }
  };

  const handleCanvasClick = (e) => {
    const dragDistance = Math.hypot(
      e.clientX - dragStartRef.current.x,
      e.clientY - dragStartRef.current.y,
    );
    if (dragDistance > 5) return;
    if (e.target.closest(".toolbar")) return;

    // Si clic sur image, ne rien faire
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX =
      (e.clientX - rect.left - offsetRef.current.x) / scaleRef.current;
    const mouseY =
      (e.clientY - rect.top - offsetRef.current.y) / scaleRef.current;
    for (let i = images.length - 1; i >= 0; i--) {
      const img = images[i];
      if (
        mouseX >= img.x &&
        mouseX <= img.x + img.width &&
        mouseY >= img.y &&
        mouseY <= img.y + img.height
      )
        return;
    }

    clearSelection();
  };

  // Zoom
  useEffect(() => {
    const handleWheel = (e) => {
      e.preventDefault();
      const zoomSpeed = 0.001;
      const newScale = Math.min(
        Math.max(scaleRef.current - e.deltaY * zoomSpeed, 0.1),
        4,
      );
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

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
      container.addEventListener("contextmenu", (e) => e.preventDefault());
      return () => {
        container.removeEventListener("wheel", handleWheel);
        container.removeEventListener("contextmenu", (e) => e.preventDefault());
      };
    }
  }, []);

  // Empêcher le navigateur d'ouvrir les fichiers directement
  useEffect(() => {
    const handleWindowDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleWindowDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, []);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const dropX =
      (e.clientX - rect.left - offsetRef.current.x) / scaleRef.current;
    const dropY =
      (e.clientY - rect.top - offsetRef.current.y) / scaleRef.current;

    // Traiter les fichiers
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
          const maxWidth = 200;
          const scaleImg = maxWidth / img.width;
          saveHistory();
          addImage({
            url: reader.result,
            x: dropX - (img.width * scaleImg) / 2,
            y: dropY - (img.height * scaleImg) / 2,
            width: img.width * scaleImg,
            height: img.height * scaleImg,
          });
        };
      };
      reader.readAsDataURL(file);
    } else {
      // Traiter les URLs (drag depuis navigateur)
      const url = e.dataTransfer.getData("text/uri-list");
      if (url) {
        const img = new Image();
        img.onload = () => {
          const maxWidth = 200;
          const scaleImg = maxWidth / img.width;
          saveHistory();
          addImage({
            url,
            x: dropX - (img.width * scaleImg) / 2,
            y: dropY - (img.height * scaleImg) / 2,
            width: img.width * scaleImg,
            height: img.height * scaleImg,
          });
        };
        img.src = url;
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 bg-gray-900 overflow-hidden ${isPanning ? "cursor-grabbing" : "cursor-default"}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Grille */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(0deg, #fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Contenu avec offset & zoom */}
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
        {/* Box de sélection */}
        {selectionBox && (
          <div
            className="absolute border-2 border-blue-500 bg-blue-500 opacity-20 pointer-events-none"
            style={{
              top: Math.min(selectionBox.startY, selectionBox.currentY),
              left: Math.min(selectionBox.startX, selectionBox.currentX),
              width: Math.abs(selectionBox.currentX - selectionBox.startX),
              height: Math.abs(selectionBox.currentY - selectionBox.startY),
            }}
          />
        )}

        {/* Images */}
        {images.map((img, index) => (
          <div
            key={img.id}
            style={{
              position: "absolute",
              top: img.y,
              left: img.x,
              width: img.width,
              height: img.height,
              transform: `rotate(${img.rotation || 0}deg)`,
              transformOrigin: "center center",
              zIndex: selectedImageIds.includes(img.id) ? 1000 : index + 1,
            }}
          >
            <img
              src={img.url}
              alt=""
              draggable="false"
              className={`absolute w-full h-full pointer-events-auto cursor-grab active:cursor-grabbing ${
                selectedImageIds.includes(img.id) ? "ring-2 ring-blue-500" : ""
              }`}
            />

            {/* Poignées de redimensionnement */}
            {selectedImageIds.includes(img.id) && (
              <>
                {/* Top-left */}
                <div
                  className="absolute w-2 h-2 bg-blue-500 pointer-events-auto"
                  style={{
                    top: "-4px",
                    left: "-4px",
                    borderRadius: "2px",
                    cursor: "nwse-resize",
                  }}
                />
                {/* Top-right */}
                <div
                  className="absolute w-2 h-2 bg-blue-500 pointer-events-auto"
                  style={{
                    top: "-4px",
                    right: "-4px",
                    borderRadius: "2px",
                    cursor: "nesw-resize",
                  }}
                />
                {/* Bottom-left */}
                <div
                  className="absolute w-2 h-2 bg-blue-500 pointer-events-auto"
                  style={{
                    bottom: "-4px",
                    left: "-4px",
                    borderRadius: "2px",
                    cursor: "nesw-resize",
                  }}
                />
                {/* Bottom-right */}
                <div
                  className="absolute w-2 h-2 bg-blue-500 pointer-events-auto"
                  style={{
                    bottom: "-4px",
                    right: "-4px",
                    borderRadius: "2px",
                    cursor: "nwse-resize",
                  }}
                />
                {/* Top */}
                <div
                  className="absolute w-2 h-2 bg-blue-500 pointer-events-auto"
                  style={{
                    top: "-4px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderRadius: "2px",
                    cursor: "ns-resize",
                  }}
                />
                {/* Bottom */}
                <div
                  className="absolute w-2 h-2 bg-blue-500 pointer-events-auto"
                  style={{
                    bottom: "-4px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    borderRadius: "2px",
                    cursor: "ns-resize",
                  }}
                />
                {/* Left */}
                <div
                  className="absolute w-2 h-2 bg-blue-500 pointer-events-auto"
                  style={{
                    left: "-4px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    borderRadius: "2px",
                    cursor: "ew-resize",
                  }}
                />
                {/* Right */}
                <div
                  className="absolute w-2 h-2 bg-blue-500 pointer-events-auto"
                  style={{
                    right: "-4px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    borderRadius: "2px",
                    cursor: "ew-resize",
                  }}
                />

                {/* Trait et Handle de rotation */}
                <svg
                  className="absolute pointer-events-none"
                  style={{
                    left: "0",
                    top: "0",
                    width: "100%",
                    height: "100%",
                    overflow: "visible",
                  }}
                >
                  <line
                    x1="50%"
                    x2="50%"
                    y2="-50"
                    stroke="#3b82f6"
                    strokeWidth="1"
                    pointerEvents="none"
                  />
                </svg>

                <div
                  className="absolute w-3 h-3 bg-blue-500 rounded-full cursor-grab active:cursor-grabbing pointer-events-auto"
                  style={{
                    left: "50%",
                    top: "-50px",
                    transform: `translate(-50%, -50%) rotate(${-(img.rotation || 0)}deg)`,
                    border: "2px solid white",
                  }}
                />
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
