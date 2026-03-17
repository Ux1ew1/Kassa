import { createContext, useContext, useMemo, useState } from "react";
import { useLanguage } from "./LanguageContext";

const CURRENCY_STORAGE_KEY = "kassa_currency";

const CURRENCIES = [
  { code: "RUB", labelRu: "Российский рубль", labelEn: "Russian ruble" },
  { code: "USD", labelRu: "Доллар США", labelEn: "US dollar" },
  { code: "EUR", labelRu: "Евро", labelEn: "Euro" },
  { code: "GBP", labelRu: "Фунт стерлингов", labelEn: "Pound sterling" },
  { code: "CNY", labelRu: "Китайский юань", labelEn: "Chinese yuan" },
  { code: "KZT", labelRu: "Казахстанский тенге", labelEn: "Kazakhstani tenge" },
  { code: "INR", labelRu: "Индийская рупия", labelEn: "Indian rupee" },
];

const getCurrencyByCode = (code) => CURRENCIES.find((item) => item.code === code) || CURRENCIES[0];

const getStoredCurrencyCode = () => {
  try {
    const raw = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return getCurrencyByCode(raw).code;
  } catch {
    return "RUB";
  }
};

const CurrencyContext = createContext({
  currency: CURRENCIES[0],
  currencies: CURRENCIES,
  setCurrencyCode: () => {},
  formatCurrency: (value) => String(value),
});

export function CurrencyProvider({ children }) {
  const { language } = useLanguage();
  const [currencyCode, setCurrencyCodeState] = useState(() => getStoredCurrencyCode());

  const currency = useMemo(() => getCurrencyByCode(currencyCode), [currencyCode]);

  const setCurrencyCode = (nextCode) => {
    const normalized = getCurrencyByCode(nextCode).code;
    setCurrencyCodeState(normalized);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, normalized);
    } catch {
      // ignore storage errors
    }
  };

  const formatCurrency = (value) => {
    const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
    const locale = language === "en" ? "en-US" : "ru-RU";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.code,
      maximumFractionDigits: 2,
    }).format(safe);
  };

  const value = useMemo(
    () => ({ currency, currencies: CURRENCIES, setCurrencyCode, formatCurrency }),
    [currency],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
