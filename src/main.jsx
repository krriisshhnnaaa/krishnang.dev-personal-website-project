import React from "react";
import { createRoot } from "react-dom/client";
import { PlasmaProvider, Plasma, usePlasma } from "@cruxgarden/plasma-ui";
import { Workspace, defaultHeroPanels } from "./Workspace";
import { App } from "./App";

// Expose exports globally on window for programmatic access or testing
if (typeof window !== "undefined") {
  window.PlasmaProvider = PlasmaProvider;
  window.Plasma = Plasma;
  window.usePlasma = usePlasma;
  window.Workspace = Workspace;
  window.defaultHeroPanels = defaultHeroPanels;
}

// Mount React application into #root container
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
