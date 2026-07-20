import "./StatCard.css";

export default function StatCard({
  icon,
  title,
  value,
  description,
  tone = "default",
  onClick,
}) {
  const isClickable = typeof onClick === "function";

  return (
    <article
      className={[
        "stat-card",
        `stat-card--${tone}`,
        isClickable ? "stat-card--clickable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(event) => {
        if (!isClickable) return;

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="stat-card__top">
        <span className="stat-card__title">
          {icon ? <span aria-hidden="true">{icon}</span> : null}
          {title}
        </span>
      </div>

      <strong className="stat-card__value">{value ?? 0}</strong>

      {description ? (
        <p className="stat-card__description">{description}</p>
      ) : null}
    </article>
  );
}