import React from "react";
import theme from "../../theme";

const Input = (props) => (
  <input
    style={{
      background: theme.inputBg,
      color: theme.text,
      borderRadius: theme.borderRadius,
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
      border: `1px solid ${theme.inputBorder}`,
      padding: "0.75em 1em",
      outline: "none",
      transition: "border 0.2s",
    }}
    onFocus={(e) =>
      (e.currentTarget.style.border = `1px solid ${theme.accent}`)
    }
    onBlur={(e) =>
      (e.currentTarget.style.border = `1px solid ${theme.inputBorder}`)
    }
    {...props}
  />
);

export default Input;
