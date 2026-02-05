import { useRef } from "react";
import "./ChecksList.css";

function ChecksList({
  checks,
  activeCheckId,
  onCheckChange,
  onCreateNew,
  onCompleteActiveCheck,
}) {
  const lastTapRef = useRef({ id: null, time: 0 });

  const handleTap = (checkId) => {
    const now = Date.now();
    const { id, time } = lastTapRef.current;

    if (
      id === checkId &&
      now - time < 320 &&
      checkId === activeCheckId &&
      typeof onCompleteActiveCheck === "function"
    ) {
      onCompleteActiveCheck();
      lastTapRef.current = { id: null, time: 0 };
      return;
    }

    lastTapRef.current = { id: checkId, time: now };
  };

  return (
    <div className="top__checks">
      <div className="checks" id="checks">
        {checks.map((check) => (
          <div key={check.id} className="check-item">
            <input
              type="radio"
              id={`check-${check.id}`}
              name="check"
              value={check.id}
              checked={check.id === activeCheckId}
              onChange={(e) => onCheckChange(parseInt(e.target.value, 10))}
            />
            <label
              htmlFor={`check-${check.id}`}
              onDoubleClick={() => {
                if (
                  check.id === activeCheckId &&
                  typeof onCompleteActiveCheck === "function"
                ) {
                  onCompleteActiveCheck();
                }
              }}
              onTouchEnd={() => handleTap(check.id)}
            >
              {check.id}
            </label>
          </div>
        ))}
      </div>
      <button className="newCheck" onClick={onCreateNew} aria-label="Новый чек">
        +
      </button>
    </div>
  );
}

export default ChecksList;
