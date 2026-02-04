import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Coup - der beste Coup den du je hattest" },
    { name: "description", content: "Welcome to have fun with your friends" },
  ];
}

export default function Home() {
  return <div>Hello World</div>;
}
