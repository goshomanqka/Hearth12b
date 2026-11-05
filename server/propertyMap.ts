import type { Express } from "express";
import { getPublicProperty } from "./marketplace";

export function registerPropertyMaps(app: Express) {
  app.get("/api/property-map/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id < 1) {
      res.status(400).json({ error: "Invalid property" });
      return;
    }
    try {
      const property = await getPublicProperty(id);
      if (!property) {
        res.status(404).json({ error: "Property is unavailable" });
        return;
      }
      const base = process.env.MANUS_API_URL;
      const key = process.env.MANUS_API_KEY;
      if (!base || !key) {
        res.status(503).json({ error: "Maps are not configured" });
        return;
      }
      const center =
        property.latitude !== null && property.longitude !== null
          ? `${property.latitude},${property.longitude}`
          : `${property.address}, ${property.location}`;
      const url = new URL(
        `${base.replace(/\/$/, "")}/v1/maps/proxy/maps/api/staticmap`
      );
      for (const [name, value] of Object.entries({
        key,
        center,
        zoom: "14",
        size: "640x320",
        scale: "2",
        markers: center,
      }))
        url.searchParams.set(name, value);
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      const contentType = response.headers.get("content-type") ?? "";
      if (!response.ok || !contentType.startsWith("image/")) {
        res.status(502).json({ error: "The map is temporarily unavailable" });
        return;
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      res
        .set({
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=300",
        })
        .send(bytes);
    } catch {
      res.status(502).json({ error: "The map is temporarily unavailable" });
    }
  });
}
