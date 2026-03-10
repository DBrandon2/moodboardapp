import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export const useBoardStore = create((set) => ({
  images: [],
  selectedImageIds: [],
  history: [],
  future: [],

  saveHistory: () => {
    set((state) => ({
      history: [
        ...state.history,
        {
          images: JSON.parse(JSON.stringify(state.images)),
          selectedImageIds: [...state.selectedImageIds],
        },
      ],
      future: [],
    }));
  },

  undo: () => {
    set((state) => {
      if (state.history.length === 0) return state;

      const historyClone = [...state.history];
      const previousState = historyClone.pop();

      return {
        images: previousState.images,
        selectedImageIds: previousState.selectedImageIds,
        history: historyClone,
        future: [
          ...state.future,
          {
            images: JSON.parse(JSON.stringify(state.images)),
            selectedImageIds: [...state.selectedImageIds],
          },
        ],
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;

      const futureClone = [...state.future];
      const nextState = futureClone.pop();

      return {
        images: nextState.images,
        selectedImageIds: nextState.selectedImageIds,
        history: [
          ...state.history,
          {
            images: JSON.parse(JSON.stringify(state.images)),
            selectedImageIds: [...state.selectedImageIds],
          },
        ],
        future: futureClone,
      };
    });
  },

  addimage: (newImage) => {
    set((state) => ({
      images: [
        ...state.images,
        {
          id: uuidv4(),
          rotation: 0,
          ...newImage,
        },
      ],
      future: [],
    }));
  },

  updateImagePosition: (imageId, x, y) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === imageId ? { ...img, x, y } : img,
      ),
      future: [],
    }));
  },

  updateMultipleImagePositions: (imageIds, deltaX, deltaY) => {
    set((state) => ({
      images: state.images.map((img) =>
        imageIds.includes(img.id)
          ? { ...img, x: img.x + deltaX, y: img.y + deltaY }
          : img,
      ),
      future: [],
    }));
  },

  selectImages: (imageIds) => {
    set({ selectedImageIds: imageIds });
  },

  toggleImageSelection: (imageId) => {
    set((state) => {
      const isSelected = state.selectedImageIds.includes(imageId);
      return {
        selectedImageIds: isSelected
          ? state.selectedImageIds.filter((id) => id !== imageId)
          : [...state.selectedImageIds, imageId],
      };
    });
  },

  clearSelection: () => {
    set({ selectedImageIds: [] });
  },

  updateImageDimensions: (imageId, width, height) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === imageId ? { ...img, width, height } : img,
      ),
      future: [],
    }));
  },

  updateImagePositionAndDimensions: (imageId, x, y, width, height) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === imageId ? { ...img, x, y, width, height } : img,
      ),
      future: [],
    }));
  },

  updateImageRotation: (imageId, rotation) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === imageId ? { ...img, rotation } : img,
      ),
      future: [],
    }));
  },

  removeImages: (imageIds) => {
    set((state) => ({
      images: state.images.filter((img) => !imageIds.includes(img.id)),
      selectedImageIds: state.selectedImageIds.filter(
        (id) => !imageIds.includes(id),
      ),
      future: [],
    }));
  },

  duplicateImages: (imageIds) => {
    set((state) => {
      const newImages = [];
      imageIds.forEach((id) => {
        const img = state.images.find((i) => i.id === id);
        if (img) {
          newImages.push({
            ...img,
            id: uuidv4(),
            x: img.x + 20,
            y: img.y + 20,
          });
        }
      });

      return {
        images: [...state.images, ...newImages],
        selectedImageIds: newImages.map((img) => img.id),
        future: [],
      };
    });
  },

  bringToFront: (imageIds) => {
    set((state) => {
      const frontImages = state.images.filter((img) =>
        imageIds.includes(img.id),
      );
      const otherImages = state.images.filter(
        (img) => !imageIds.includes(img.id),
      );
      return {
        images: [...otherImages, ...frontImages],
        future: [],
      };
    });
  },

  sendToBack: (imageIds) => {
    set((state) => {
      const backImages = state.images.filter((img) =>
        imageIds.includes(img.id),
      );
      const otherImages = state.images.filter(
        (img) => !imageIds.includes(img.id),
      );
      return {
        images: [...backImages, ...otherImages],
        future: [],
      };
    });
  },

  flipHorizontal: (imageIds) => {
    set((state) => ({
      images: state.images.map((img) =>
        imageIds.includes(img.id) ? { ...img, flipH: !img.flipH } : img,
      ),
      future: [],
    }));
  },

  flipVertical: (imageIds) => {
    set((state) => ({
      images: state.images.map((img) =>
        imageIds.includes(img.id) ? { ...img, flipV: !img.flipV } : img,
      ),
      future: [],
    }));
  },
}));
