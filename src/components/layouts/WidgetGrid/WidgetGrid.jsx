import "./WidgetGrid.css";

export default function WidgetGrid({
  children,
  columns = 4,
  minItemWidth = 210,
  className = "",
}) {
  return (
    <div
      className={["widget-grid", className].filter(Boolean).join(" ")}
      style={{
        "--widget-grid-columns": columns,
        "--widget-grid-min-width": `${minItemWidth}px`,
      }}
    >
      {children}
    </div>
  );
}