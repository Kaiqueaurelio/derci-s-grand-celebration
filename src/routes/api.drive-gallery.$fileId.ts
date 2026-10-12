import { createFileRoute } from "@tanstack/react-router";

const MEDIA_TYPES = /^(image\/(jpeg|png|webp|heic|heif)|video\/(mp4|quicktime|webm))$/;

export const Route = createFileRoute("/api/drive-gallery/$fileId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const mimeType = url.searchParams.get("type") ?? "";
        const expiresAt = Number(url.searchParams.get("expires"));
        const signature = url.searchParams.get("signature") ?? "";
        if (!/^[a-zA-Z0-9_-]{10,}$/.test(params.fileId) || !MEDIA_TYPES.test(mimeType)) return new Response("Not found", { status: 404 });

        try {
          const { verifyDrivePreview, downloadDriveFile } = await import("@/lib/server/drive.server");
          if (!(await verifyDrivePreview(params.fileId, mimeType, expiresAt, signature))) {
            return new Response("Link expired", { status: 403 });
          }
          const media = await downloadDriveFile(params.fileId);
          const filename = (url.searchParams.get("download") ?? "arquivo").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 120);
          const disposition = url.searchParams.has("download") ? `attachment; filename="${filename}"` : "inline";
          return new Response(media, {
            headers: {
              "Content-Type": mimeType,
              "Content-Disposition": disposition,
              "Cache-Control": "private, max-age=300",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } catch {
          return new Response("Image unavailable", { status: 502 });
        }
      },
    },
  },
});
