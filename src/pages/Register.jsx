import { useState } from "react";
import { loginUser, registerUser } from "../utils/api";
import { useLanguage } from "../contexts/LanguageContext";
import "./Register.css";

const LOGIN_MIN_LENGTH = 3;
const LOGIN_MAX_LENGTH = 24;
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_MAX_LENGTH = 72;
const LOGIN_PATTERN = /^[a-z0-9._-]+$/i;

function Register({ onRegistered }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [mode, setMode] = useState("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getRegisterValidationError = (nextLogin, nextPassword) => {
    if (!nextLogin) {
      return isEn ? "Login is required" : "Логин обязателен";
    }
    if (nextLogin.length < LOGIN_MIN_LENGTH) {
      return isEn
        ? `Login must be at least ${LOGIN_MIN_LENGTH} characters`
        : `Логин должен быть не короче ${LOGIN_MIN_LENGTH} символов`;
    }
    if (nextLogin.length > LOGIN_MAX_LENGTH) {
      return isEn
        ? `Login must be no longer than ${LOGIN_MAX_LENGTH} characters`
        : `Логин должен быть не длиннее ${LOGIN_MAX_LENGTH} символов`;
    }
    if (!LOGIN_PATTERN.test(nextLogin)) {
      return isEn
        ? "Login can contain only letters, numbers, dot, underscore and hyphen"
        : "Логин может содержать только буквы, цифры, точку, подчёркивание и дефис";
    }
    if (!nextPassword) {
      return isEn ? "Password is required" : "Пароль обязателен";
    }
    if (nextPassword.length < PASSWORD_MIN_LENGTH) {
      return isEn
        ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
        : `Пароль должен быть не короче ${PASSWORD_MIN_LENGTH} символов`;
    }
    if (nextPassword.length > PASSWORD_MAX_LENGTH) {
      return isEn
        ? `Password must be no longer than ${PASSWORD_MAX_LENGTH} characters`
        : `Пароль должен быть не длиннее ${PASSWORD_MAX_LENGTH} символов`;
    }
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const normalizedLogin = login.trim().toLowerCase();
    const normalizedPassword = password.trim();
    if (mode === "register") {
      const validationError = getRegisterValidationError(normalizedLogin, normalizedPassword);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);

    try {
      const payload =
        mode === "register"
          ? await registerUser(normalizedLogin, normalizedPassword)
          : await loginUser(normalizedLogin, normalizedPassword);
      onRegistered(payload.user);
    } catch (submitError) {
      setError(
        submitError.message ||
          (mode === "register"
            ? isEn
              ? "Failed to register"
              : "Не удалось зарегистрироваться"
            : isEn
              ? "Failed to sign in"
              : "Не удалось войти"),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <form className="register-card" onSubmit={handleSubmit}>
        <h1 className="register-title">
          {mode === "register"
            ? isEn
              ? "Sign up"
              : "Регистрация"
            : isEn
              ? "Sign in"
              : "Вход"}
        </h1>
        <p className="register-subtitle">
          {mode === "register"
            ? isEn
              ? "Create an account with login and password."
              : "Создайте аккаунт с логином и паролем."
            : isEn
              ? "Enter your login and password to continue."
              : "Введите логин и пароль, чтобы войти."}
        </p>

        <div className="register-switch">
          <button
            type="button"
            className={`register-switch__item${
              mode === "login" ? " register-switch__item--active" : ""
            }`}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            {isEn ? "Sign in" : "Вход"}
          </button>
          <button
            type="button"
            className={`register-switch__item${
              mode === "register" ? " register-switch__item--active" : ""
            }`}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            {isEn ? "Sign up" : "Регистрация"}
          </button>
        </div>

        <label className="register-label" htmlFor="login">
          {isEn ? "Login" : "Логин"}
        </label>
        <input
          id="login"
          className="register-input"
          type="text"
          autoComplete="username"
          value={login}
          onChange={(event) => setLogin(event.target.value)}
          required
          minLength={LOGIN_MIN_LENGTH}
          maxLength={LOGIN_MAX_LENGTH}
        />

        <label className="register-label" htmlFor="password">
          {isEn ? "Password" : "Пароль"}
        </label>
        <input
          id="password"
          className="register-input"
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={mode === "register" ? PASSWORD_MIN_LENGTH : 4}
          maxLength={PASSWORD_MAX_LENGTH}
        />
        {mode === "register" ? (
          <p className="register-hint">
            {isEn
              ? `Login: ${LOGIN_MIN_LENGTH}-${LOGIN_MAX_LENGTH} chars, letters/numbers/._-. Password: ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} chars.`
              : `Логин: ${LOGIN_MIN_LENGTH}-${LOGIN_MAX_LENGTH} символов, буквы/цифры/._-. Пароль: ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} символов.`}
          </p>
        ) : null}

        {error ? <p className="register-error">{error}</p> : null}

        <button className="register-button" type="submit" disabled={loading}>
          {loading
            ? mode === "register"
              ? isEn
                ? "Creating..."
                : "Создание..."
              : isEn
                ? "Signing in..."
                : "Вход..."
            : mode === "register"
              ? isEn
                ? "Sign up"
                : "Зарегистрироваться"
              : isEn
                ? "Sign in"
                : "Войти"}
        </button>
      </form>
    </div>
  );
}

export default Register;
