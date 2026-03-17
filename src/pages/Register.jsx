import { useState } from "react";
import { loginUser, registerUser } from "../utils/api";
import { useLanguage } from "../contexts/LanguageContext";
import "./Register.css";

function Register({ onRegistered }) {
  const { language } = useLanguage();
  const isEn = language === "en";
  const [mode, setMode] = useState("login");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload =
        mode === "register"
          ? await registerUser(login, password)
          : await loginUser(login, password);
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
          minLength={3}
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
          minLength={4}
        />

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

