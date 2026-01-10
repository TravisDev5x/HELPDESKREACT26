import "./bootstrap";
import "../css/app.css";
import React from "react";
import { createRoot } from "react-dom/client";
import Main from "./Main";

const el = document.getElementById("app");

if (el) {
    createRoot(el).render(<Main />);
}
