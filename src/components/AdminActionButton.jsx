function AdminActionButton({
  icon,
  label,
  title,
  onClick,
  danger = false,
}) {
  const iconNode =
    icon === "eye" ? (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z" />
        <circle cx="12" cy="12" r="3.5" />
      </svg>
    ) : icon === "eye-off" ? (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3l18 18" />
        <path d="M10.6 5.2A12.4 12.4 0 0 1 12 5c6.5 0 10.5 7 10.5 7a16.6 16.6 0 0 1-3.2 3.9" />
        <path d="M6.8 6.8A17.4 17.4 0 0 0 1.5 12s4 7 10.5 7c1.9 0 3.6-.5 5-1.4" />
        <path d="M9.5 9.5A3.5 3.5 0 0 0 14.5 14.5" />
      </svg>
    ) : icon === "edit" ? (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 21h4.7L20.4 8.3a2.1 2.1 0 0 0 0-3L18.7 3.6a2.1 2.1 0 0 0-3 0L3 16.3V21Z" />
        <path d="M14.8 4.4l4.8 4.8" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h16" />
        <path d="M9.5 7V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3V7" />
        <path d="M18.6 7l-.8 12.3c-.1.9-.8 1.7-1.8 1.7H8c-1 0-1.7-.8-1.8-1.7L5.4 7" />
        <path d="M10 11.2v5.5M14 11.2v5.5" />
      </svg>
    );

  return (
    <button
      className={`admin-item__button${danger ? " admin-item__button--danger" : ""}`}
      onClick={onClick}
      type="button"
      aria-label={label}
      title={title}
    >
      {iconNode}
    </button>
  );
}

export default AdminActionButton;
