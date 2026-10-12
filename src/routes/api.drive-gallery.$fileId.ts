import { createFileRoute } from "@tanstack/react-router";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

export const Route = createFileRoute("/api/drive-gallery/$fileId")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const url = new URL(request.url);
        const mimeType = url.searchParams.get("type") ?? "";
        const expiresAt = Number(url.searchParams.get("expires"));
        const signature = url.searchParams.get("signature") ?? "";
        if (!/^[a-zA-Z0-9_-]{10,}$/.test(params.fileId) || !IMAGE_TYPES.has(mimeType)) return new Response("Not found", { status: 404 });

        try {
          const { verifyDrivePreview, downloadDriveFile } = await import("@/lib/server/drive.server");
          if (!(await verifyDrivePreview(params.fileId, mimeType, expiresAt, signature))) {
            return new Response("Link expired", { status: 403 });
          }
          const image = await downloadDriveFile(params.fileId);
          return new Response(image, {
            headers: {
              "Content-Type": mimeType,
              "Content-Disposition": "inline",
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
