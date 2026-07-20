import WidgetHeader from "../WidgetHeader";
import "./CardWidget.css";

export default function CardWidget({
  icon,
  title,
  description,
  action,
  children,
  variant = "default",
  className = "",
}) {
  return (
    <section
      className={[
        "card-widget",
        `card-widget--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <WidgetHeader
        icon={icon}
        title={title}
        description={description}
        action={action}
      />

      {children ? (
        <div className="card-widget__content">{children}</div>
      ) : null}
    </section>
  );
}