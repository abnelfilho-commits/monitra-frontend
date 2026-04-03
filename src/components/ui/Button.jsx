export default function Button({
  children,
  variant = "primary",
  style = {},
  ...props
}) {
  const base = {
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    fontSize: 14,
  };

  const variants = {
    primary: {
      background: "#0f62fe",
      color: "#fff",
    },
    secondary: {
      background: "#fff",
      border: "1px solid #d1d5db",
      color: "#111",
    },
    danger: {
      background: "#fee4e2",
      color: "#b42318",
      border: "1px solid #fecdca",
    },
  };

  return (
    <button
      style={{ ...base, ...variants[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
