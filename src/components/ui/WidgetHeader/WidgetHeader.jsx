import "./WidgetHeader.css";

export default function WidgetHeader({
  icon,
  title,
  description,
  action,
  compact = false,
}) {
  return (
    <div
      className={[
        "widget-header",
        compact ? "widget-header--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="widget-header__main">
        {icon ? (
          <div className="widget-header__icon" aria-hidden="true">
            {icon}
          </div>
        ) : null}

        <div className="widget-header__texts">
          <h2 className="widget-header__title">{title}</h2>

          {description ? (
            <p className="widget-header__description">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      {action ? (
        <div className="widget-header__action">{action}</div>
      ) : null}
    </div>
  );
}