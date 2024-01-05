import React from "react";
import ReactDOM from "react-dom/client";
import { StoreProvider } from "easy-peasy";
import { App } from "./App.tsx";
import "./index.css";
import store from "./store";
import { enableMapSet } from "immer";

enableMapSet();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StoreProvider store={store}>
      <App />
    </StoreProvider>
  </React.StrictMode>
);
