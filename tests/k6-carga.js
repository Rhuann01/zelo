import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "15s", target: 200 },
    { duration: "30s", target: 1000 },
    { duration: "15s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3001";
const STORE_SLUG = __ENV.STORE_SLUG || "";

export default function () {
  const routes = ["/", "/explorar", "/termos", "/privacidade"];
  if (STORE_SLUG) {
    routes.push(`/${STORE_SLUG}`);
  }
  const path = routes[Math.floor(Math.random() * routes.length)];
  const res = http.get(`${BASE_URL}${path}`);

  check(res, {
    "status 200": (r) => r.status === 200,
    "tempo < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(0.5);
}
