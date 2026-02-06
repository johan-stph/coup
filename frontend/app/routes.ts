import {
  type RouteConfig,
  index,
  layout,
  route,
} from '@react-router/dev/routes';

export default [
  route('login', 'routes/auth/Login.tsx'),
  route('auth/setup', 'routes/auth/Setup.tsx'),
  layout('routes/layout.tsx', [
    index('routes/home.tsx'),
    route('lobby', 'routes/lobby.tsx'),
    route('logout', 'routes/auth/Logout.tsx'),
  ]),
] satisfies RouteConfig;
