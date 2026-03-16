import { useState } from "react";
import { loginUser, registerUser } from "../utils/api";
import "./Register.css";

/**
 * Auth page (login + register).
 * @param {{onRegistered: (user: {id: string, login: string}) => void}} props
 * @returns {JSX.Element}
 */
function Register({ onRegistered }) {
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
            ? "Не удалось зарегистрироваться"
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
          {mode === "register" ? "Регистрация" : "Вход"}
        </h1>
        <p className="register-subtitle">
          {mode === "register"
            ? "Создайте аккаунт с логином и паролем."
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
            Вход
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
            Регистрация
          </button>
        </div>

        <label className="register-label" htmlFor="login">
          Логин
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
          Пароль
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
              ? "Создание..."
              : "Вход..."
            : mode === "register"
              ? "Зарегистрироваться"
              : "Войти"}
        </button>
      </form>
    </div>
  );
}

export default Register;
