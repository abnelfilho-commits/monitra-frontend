import "./PageLayout.css";

export default function PageLayout({
  children,
  size = "default",
  className = "",
}) {
  return (
    <main
      className={[
        "page-layout",
        `page-layout--${size}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </main>
  );
}