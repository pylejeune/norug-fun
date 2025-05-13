export async function GET(request) {
    return new Response(JSON.stringify({ message: 'Bienvenue sur noRug.fun' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }