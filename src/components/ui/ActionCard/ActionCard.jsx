import "./ActionCard.css";

export default function ActionCard({
  icon,
  title,
  description,
  onClick,
  disabled = false,
  badge,
}) {
  return (
    <button
      type="button"
      className={[
        "action-card",
        disabled ? "action-card--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <div className="action-card__top">

        <div className="action-card__icon">
          {icon}
        </div>

        {badge && (
          <span className="action-card__badge">
            {badge}
          </span>
        )}

      </div>

      <h3 className="action-card__title">
        {title}
      </h3>

      {description && (
        <p className="action-card__description">
          {description}
        </p>
      )}

      <div className="action-card__footer">

        <span>
          Abrir
        </span>

        <span className="action-card__arrow">
          →
        </span>

      </div>
    </button>
  );
}