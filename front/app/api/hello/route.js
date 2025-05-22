export async function GET() {
  return new Response(JSON.stringify({ message: "Bienvenue sur noRug.fun" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
