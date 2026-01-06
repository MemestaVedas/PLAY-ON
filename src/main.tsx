import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./context/AuthContext";
import { MalAuthProvider } from "./context/MalAuthContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <MalAuthProvider>
        <App />
      </MalAuthProvider>
    </AuthProvider>
  </React.StrictMode>,
);
