// ✅ Polaroid Generator - Edge Runtime (PostImages Upload)
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { img1, img2 } = await req.json();
    if (!img1 || !img2) {
      return new Response(
        JSON.stringify({ error: "Kedua gambar (img1 & img2) wajib dikirim" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // === STEP 1: Upload ke POSTIMAGES.ORG ===
    console.log("⬆️ Uploading ke PostImages...");
    const url1 = await uploadToPostImages(img1);
    const url2 = await uploadToPostImages(img2);

    if (!url1 || !url2) throw new Error("Gagal upload ke postimages.org");

    // === STEP 2: Generate Polaroid ===
    console.log("🎨 Membuat Polaroid...");
    const apiUrl = `https://api.zenzxz.my.id/api/maker/polaroid?img1=${encodeURIComponent(
      url1
    )}&img2=${encodeURIComponent(url2)}`;

    const response = await fetch(apiUrl);
    if (!response.ok) throw new Error("Gagal memproses API Polaroid");

    const arrayBuffer = await response.arrayBuffer();
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
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("❌ Error:", err);
    return new Response(
      JSON.stringify({
        error: "Gagal membuat polaroid",
        message: err.message,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}

// ==========================
// 🔧 Helper: Upload ke PostImages
// ==========================
async function uploadToPostImages(base64Image) {
  try {
    // ✅ Perbaikan regex — HAPUS double backslash
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: "image/jpeg" });

    const formData = new FormData();
    formData.append("file", blob, `image-${Date.now()}.jpg`);

    const uploadRes = await fetch("https://postimages.org/json/rr", {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) throw new Error("Upload ke postimages gagal");

    const data = await uploadRes.json();
    const url = data?.url?.replace("postimg.cc/", "i.postimg.cc/");
    return url || null;
  } catch (err) {
    console.error("Upload error:", err);
    return null;
  }
}
