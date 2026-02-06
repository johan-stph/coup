import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("lobby", "routes/lobby.tsx"),
  route("login", "routes/auth/Login.tsx"),
  route("logout", "routes/auth/Logout.tsx"),
  route("auth/setup", "routes/auth/Setup.tsx"),
] satisfies RouteConfig;
