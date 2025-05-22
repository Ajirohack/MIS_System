import React from "react";
import theme from "../../theme";

const Dialog = ({ open, onClose, children }) =>
  open ? (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.background,
          color: theme.text,
          borderRadius: theme.borderRadius,
          fontFamily: theme.fontFamily,
          fontSize: theme.fontSize,
          boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          minWidth: 320,
          maxWidth: 480,
          padding: "2em",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  ) : null;

export default Dialog;
