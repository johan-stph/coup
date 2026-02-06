import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("lobby", "routes/lobby.tsx"),
  route("login", "routes/auth/Login.tsx"),
] satisfies RouteConfig;
