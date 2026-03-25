import { requestHandler } from "../api-core.js";

export default async function handler(req, res) {
  return requestHandler(req, res);
}
