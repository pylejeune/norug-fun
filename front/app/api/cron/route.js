export async function GET(request) {
    return new Response(JSON.stringify({ message: 'Cron Job Ready' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }