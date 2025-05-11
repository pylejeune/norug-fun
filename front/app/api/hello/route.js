export async function GET(request) {
    return new Response(JSON.stringify({ message: 'Bonjour depuis App Router' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }