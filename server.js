import http from "node:http";
import { HOST, PORT, requestHandler } from "./api-core.js";

const server = http.createServer(requestHandler);

server.listen(PORT, HOST, () => {
  console.log(`Сервер запущен: http://${HOST}:${PORT}`);
});

server.on("error", (error) => {
  console.error("Ошибка сервера:", error);
  if (error.code === "EADDRINUSE") {
    console.error(`Порт ${PORT} уже занят. Попробуйте другой порт.`);
  }
});
