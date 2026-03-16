/**
 * Checks list component for switching active check.
 */
import { useEffect, useRef, useState } from "react";
import "./ChecksList.css";

/**
 * Renders the checks list for switching active check.
 * @param {Object} props - Component props.
 * @param {Array} props.checks - Checks list.
 * @param {number} props.activeCheckId - Active check id.
 * @param {Function} props.onCheckChange - Handler for selecting a check.
 * @returns {JSX.Element} Checks list.
 */
function ChecksList({ checks, activeCheckId, onCheckChange }) {
  const checksRef = useRef(null);
  const [showRightIndicator, setShowRightIndicator] = useState(false);

  useEffect(() => {
    let rafA = 0;
    let rafB = 0;

    const updateOverflowState = () => {
      const container = checksRef.current;
      if (!container) return;

      const overflow = container.scrollWidth - container.clientWidth > 1;
      const canScrollRight =
        container.scrollLeft + container.clientWidth < container.scrollWidth - 1;
      setShowRightIndicator(overflow && canScrollRight);
    };

    rafA = window.requestAnimationFrame(() => {
      updateOverflowState();
      rafB = window.requestAnimationFrame(updateOverflowState);
    });

    window.addEventListener("resize", updateOverflowState);
    const container = checksRef.current;
    if (container) {
      container.addEventListener("scroll", updateOverflowState, {
        passive: true,
      });
    }

    return () => {
      window.cancelAnimationFrame(rafA);
      window.cancelAnimationFrame(rafB);
      window.removeEventListener("resize", updateOverflowState);
      if (container) {
        container.removeEventListener("scroll", updateOverflowState);
      }
    };
  }, [checks.length]);

  return (
    <div className="top__checks">
      <div
        className={`checks${showRightIndicator ? " checks--overflow-right" : ""}`}
        id="checks"
        ref={checksRef}
      >
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
            <label htmlFor={`check-${check.id}`}>{check.id}</label>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChecksList;
