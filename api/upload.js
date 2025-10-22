// ✅ Polaroid Generator - Edge Runtime (upload -> tmpfiles.org)
export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { img1, img2 } = await req.json();
    if (!img1 || !img2) {
      return new Response(
        JSON.stringify({ error: "Both img1 and img2 are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Upload ke tmpfiles.org
    const url1 = await uploadToTmpFiles(img1);
    const url2 = await uploadToTmpFiles(img2);
    if (!url1 || !url2) throw new Error("Upload ke tmpfiles.org gagal");

    // Panggil API Polaroid
    const apiUrl = `https://api.zenzxz.my.id/api/maker/polaroid?img1=${encodeURIComponent(
      url1
    )}&img2=${encodeURIComponent(url2)}`;

    const result = await fetch(apiUrl);
    if (!result.ok) throw new Error("Gagal memproses API Polaroid");

    const arrayBuffer = await result.arrayBuffer();
    // convert ArrayBuffer -> base64
    const base64Image = btoa(
      String.fromCharCode(...new Uint8Array(arrayBuffer))
    );
    const dataUrl = `data:image/png;base64,${base64Image}`;

    return new Response(
      JSON.stringify({
        success: true,
        result: dataUrl,
        urls: { img1: url1, img2: url2 },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    return new Response(
      JSON.stringify({ error: "Gagal membuat polaroid", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// Helper: upload base64 image to tmpfiles.org using FormData + Blob
async function uploadToTmpFiles(base64Image) {
  try {
    // bersihkan data URL prefix
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const binary = atob(cleanBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);

    const blob = new Blob([bytes], { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", blob, `image-${Date.now()}.jpg`);

    const uploadRes = await fetch("https://tmpfiles.org/api/v1/upload", {
      method: "POST",
      body: form,
    });

    if (!uploadRes.ok) {
      console.error("tmpfiles responded:", uploadRes.status, await uploadRes.text());
      throw new Error("Upload ke tmpfiles gagal (network)");
    }

    const data = await uploadRes.json();
    // contoh respons: { status: "success", data: { url: "https://tmpfiles.org/abcd/filename.jpg", ... } }
    if (data.status === "success" && data.data?.url) {
      // convert to direct dl link: tmpfiles.org/ -> tmpfiles.org/dl/
      return data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
    }

    console.error("tmpfiles returned unexpected:", data);
    return null;
  } catch (e) {
    console.error("Upload error:", e);
    return null;
  }
                }
