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

    // === STEP 1: Upload ke tmpfiles.org ===
    const url1 = await uploadToTmpFiles(img1);
    const url2 = await uploadToTmpFiles(img2);
    if (!url1 || !url2) throw new Error("Upload ke tmpfiles.org gagal");

    // === STEP 2: Panggil API Polaroid ===
    const apiUrl = `https://api.zenzxz.my.id/api/maker/polaroid?img1=${encodeURIComponent(
      url1
    )}&img2=${encodeURIComponent(url2)}`;

    const result = await fetch(apiUrl);
    if (!result.ok) throw new Error("Gagal memproses API Polaroid");

    const arrayBuffer = await result.arrayBuffer();
    const base64Image = arrayBufferToBase64(arrayBuffer);
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
    console.error("❌ Error:", err.message);
    return new Response(
      JSON.stringify({
        error: "Internal Server Error",
        message: err.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// ==========================
// 🔧 Helper: Upload ke tmpfiles.org
// ==========================
async function uploadToTmpFiles(base64Image) {
  try {
    const cleanBase64 = base64Image.replace(/^data:image\\/\\w+;base64,/, "");
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
      const text = await uploadRes.text();
      console.error("Upload error:", text.slice(0, 300)); // Hindari logging besar
      throw new Error("Upload gagal: tmpfiles.org error");
    }

    const data = await uploadRes.json().catch(() => ({}));
    if (data.status === "success" && data.data?.url) {
      return data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
    }
    console.error("Unexpected tmpfiles.org response:", JSON.stringify(data));
    return null;
  } catch (e) {
    console.error("UploadToTmpFiles exception:", e.message);
    return null;
  }
}

// ==========================
// 🔧 Helper: Convert ArrayBuffer → Base64
// ==========================
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192; // Hindari stack overflow
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
      }
