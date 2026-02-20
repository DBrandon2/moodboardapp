import "./App.css";
import Canvas from "./components/Canvas/Canvas";
import Toolbar from "./components/Canvas/Toolbar";
import { useState } from "react";

function App() {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);
  const [openPanel, setOpenPanel] = useState(null);

  const handleRecenter = () => {
    setOffsetX(0);
    setOffsetY(0);
    setScale(1);
  };

  return (
    <div className="flex w-screen h-screen select-none">
      <Toolbar
        openPanel={openPanel}
        setOpenPanel={setOpenPanel}
        onRecenter={handleRecenter}
        offsetX={offsetX}
        offsetY={offsetY}
      />
      <Canvas
        offsetX={offsetX}
        setOffsetX={setOffsetX}
        offsetY={offsetY}
        setOffsetY={setOffsetY}
        scale={scale}
        setScale={setScale}
      />
    </div>
  );
}

export default App;
