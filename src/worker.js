async function ensureSchema(db) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS pilot_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status_text TEXT NOT NULL,
        airspace_clearance TEXT NOT NULL,
        base_location TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      INSERT INTO pilot_status (status_text, airspace_clearance, base_location)
      SELECT 'CLEAR FOR DISPATCH — EASA A2 / STS CERTIFIED', 'GREEN (DK / EU)', 'AARHUS & COPENHAGEN, DK'
      WHERE NOT EXISTS (SELECT 1 FROM pilot_status)
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        service TEXT NOT NULL,
        location TEXT,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  ]);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // GET /api/status — Fetches live pilot availability & D1 telemetry stats
    if (url.pathname === "/api/status" && request.method === "GET") {
      try {
        await ensureSchema(env.DB);

        const statusRow = await env.DB.prepare(
          "SELECT status_text, airspace_clearance, base_location FROM pilot_status ORDER BY id DESC LIMIT 1"
        ).first();

        const countRow = await env.DB.prepare(
          "SELECT COUNT(*) AS count FROM inquiries"
        ).first();

        // Also check if a motd table exists from sample1 to surface optional custom flight notice
        let motd = null;
        try {
          const motdRow = await env.DB.prepare(
            "SELECT message FROM motd ORDER BY id DESC LIMIT 1"
          ).first();
          if (motdRow && motdRow.message) {
            motd = motdRow.message;
          }
        } catch {
          // motd table is optional
        }

        return Response.json({
          ok: true,
          status: statusRow?.status_text || "CLEAR FOR DISPATCH",
          clearance: statusRow?.airspace_clearance || "GREEN (DK / EU)",
          base: statusRow?.base_location || "DENMARK",
          loggedMissions: countRow?.count ?? 0,
          motd
        });
      } catch (err) {
        return Response.json(
          {
            ok: false,
            status: "CLEAR FOR DISPATCH — STANDBY TELEMETRY",
            clearance: "GREEN (DK / EU)",
            base: "DENMARK",
            loggedMissions: 0,
            error: err.message
          },
          { status: 200 }
        );
      }
    }

    // POST /api/contact — Logs a new drone flight inquiry into Cloudflare D1
    if (url.pathname === "/api/contact" && request.method === "POST") {
      try {
        const body = await request.json();
        const name = (body.name || "").trim();
        const email = (body.email || "").trim();
        const service = (body.service || "Aerial Cinematography").trim();
        const location = (body.location || "").trim();
        const message = (body.message || "").trim();

        if (!name || !email || !message) {
          return Response.json(
            { ok: false, error: "Please complete pilot contact name, email, and mission brief." },
            { status: 400 }
          );
        }

        await ensureSchema(env.DB);

        const result = await env.DB.prepare(
          "INSERT INTO inquiries (name, email, service, location, message) VALUES (?, ?, ?, ?, ?)"
        )
          .bind(name, email, service, location, message)
          .run();

        const missionId = result?.meta?.last_row_id || Math.floor(100 + Math.random() * 900);

        return Response.json({
          ok: true,
          missionId: `MX-${String(missionId).padStart(4, "0")}`,
          message: "Flight request logged to Cloudflare D1. Telemetry confirmed."
        });
      } catch (err) {
        return Response.json(
          { ok: false, error: err.message || "Failed to store inquiry in D1." },
          { status: 500 }
        );
      }
    }

    // Serve static files from ./public for all other routes
    return env.ASSETS.fetch(request);
  }
};
