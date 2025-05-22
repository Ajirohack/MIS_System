import theme from "../../theme";

const Button = ({ children, ...props }) => (
  <button
    style={{
      background: theme.buttonBg,
      color: theme.buttonText,
      borderRadius: theme.borderRadius,
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
      border: `1px solid ${theme.border}`,
      padding: "0.75em 1.5em",
      cursor: "pointer",
      transition: "background 0.2s",
    }}
    onMouseOver={(e) => (e.currentTarget.style.background = theme.buttonHover)}
    onMouseOut={(e) => (e.currentTarget.style.background = theme.buttonBg)}
    {...props}
  >
    {children}
  </button>
);

export default Button;
