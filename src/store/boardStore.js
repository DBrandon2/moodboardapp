import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";

export const useBoardStore = create((set) => ({
  images: [],

  addimage: (newImage) => {
    set((state) => ({
      images: [
        ...state.images,
        {
          id: uuidv4(),
          ...newImage,
        },
      ],
    }));
  },
}));
