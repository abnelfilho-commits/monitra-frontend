import "./EmptyState.css";

export default function EmptyState({
  icon = "✨",
  title = "Nada por aqui no momento",
  description,
  action,
  compact = false,
}) {
  return (
    <div
      className={[
        "empty-state",
        compact ? "empty-state--compact" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="empty-state__icon" aria-hidden="true">
        {icon}
      </div>

      <div className="empty-state__content">
        <h3 className="empty-state__title">{title}</h3>

        {description ? (
          <p className="empty-state__description">{description}</p>
        ) : null}

        {action ? (
          <div className="empty-state__action">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}