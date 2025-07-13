import React from "react";
import theme from "../../theme";

const Toast = ({ message, type = "success" }) => (
  <div
    style={{
      background:
        type === "error"
          ? theme.error
          : type === "warning"
          ? theme.warning
          : theme.success,
      color: theme.buttonText,
      borderRadius: theme.borderRadius,
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
      padding: "1em 1.5em",
      margin: "1em 0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}
  >
    {message}
  </div>
);

export default Toast;
