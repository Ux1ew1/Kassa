import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { useCurrency } from "../contexts/CurrencyContext";
import "./BottomBar.css";

function BottomBar({ activeCheck, onComplete, onAmount, isDesktop = false }) {
  const { language } = useLanguage();
  const { currency, formatCurrency } = useCurrency();
  const isEn = language === "en";
  const barRef = useRef(null);
  const sentinelRef = useRef(null);
  const [isStuck, setIsStuck] = useState(false);
  const currencyIcon = {
    RUB: "₽",
    USD: "$",
    EUR: "€",
    GBP: "£",
    CNY: "¥",
    KZT: "₸",
    INR: "₹",
  }[currency.code] || currency.code;

  useEffect(() => {
    if (isDesktop) {
      setIsStuck(false);
      return undefined;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setIsStuck(entry.isIntersecting),
      { root: null, threshold: 1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isDesktop]);

  return (
    <>
      <div
        className={`bottom${isStuck ? " bottom--stuck" : ""}${
          isDesktop ? " bottom--desktop" : ""
        }`}
        ref={barRef}
      >
        <button
          className="done-button"
          onClick={onComplete}
          aria-label={isEn ? "Complete check" : "Завершить чек"}
        >
          ✓
        </button>
        <span className="price">
          {isEn ? "Price" : "Цена"}: {formatCurrency(activeCheck?.price || 0)}
        </span>
        <span className="amount">
          {isEn ? "Change" : "Сдача"}: {formatCurrency(activeCheck?.change || 0)}
        </span>
        <button
          className="amountButton"
          onClick={onAmount}
          aria-label={isEn ? "Enter amount" : "Ввести сумму"}
        >
          <span aria-hidden="true">{currencyIcon}</span>
        </button>
      </div>
      {!isDesktop && <div className="bottom-sentinel" ref={sentinelRef} aria-hidden="true" />}
    </>
  );
}

export default BottomBar;
