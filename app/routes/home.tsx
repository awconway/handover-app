import type { Route } from "./+types/home";

export const loader = async ({}: Route.LoaderArgs) => {
  const response = await fetch('http://localhost:8000/api/data');
  const data = await response.json();
  return data;
};

export default function Index({ loaderData }: Route.ComponentProps) {
  const data = loaderData;

  return (
    <div>
      <h1>{data.message}</h1>
    </div>
  );
}
