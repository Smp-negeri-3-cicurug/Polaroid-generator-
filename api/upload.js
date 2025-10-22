// api/upload.js - Vercel Serverless Function
import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed',
      message: 'Only POST requests are allowed'
    });
  }

  try {
    const { img1, img2 } = req.body;

    // Validate inputs
    if (!img1 || !img2) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing images',
        message: 'Both img1 and img2 are required'
      });
    }

    console.log('Starting image upload process...');

    // Step 1: Upload img1 to tmpfiles.org
    console.log('Uploading image 1 to tmpfiles.org...');
    const url1 = await uploadToTmpFiles(img1);
    
    if (!url1) {
      throw new Error('Failed to upload image 1 to tmpfiles.org');
    }
    console.log('Image 1 uploaded:', url1);

    // Step 2: Upload img2 to tmpfiles.org
    console.log('Uploading image 2 to tmpfiles.org...');
    const url2 = await uploadToTmpFiles(img2);
    
    if (!url2) {
      throw new Error('Failed to upload image 2 to tmpfiles.org');
    }
    console.log('Image 2 uploaded:', url2);

    // Step 3: Generate polaroid using zenzxz API
    console.log('Generating polaroid with zenzxz API...');
    const polaroidApiUrl = `https://api.zenzxz.my.id/api/maker/polaroid?img1=${encodeURIComponent(url1)}&img2=${encodeURIComponent(url2)}`;
    
    console.log('Polaroid API URL:', polaroidApiUrl);

    // Fetch polaroid with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const polaroidResponse = await fetch(polaroidApiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    clearTimeout(timeout);

    if (!polaroidResponse.ok) {
      throw new Error(`Polaroid API returned status: ${polaroidResponse.status}`);
    }

    // Check content type
    const contentType = polaroidResponse.headers.get('content-type');
    console.log('Response content-type:', contentType);

    // Get image buffer
    const imageBuffer = await polaroidResponse.buffer();
    
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Received empty image buffer from API');
    }

    console.log('Image buffer size:', imageBuffer.length, 'bytes');

    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    console.log('Successfully generated polaroid');

    // Return success response
    return res.status(200).json({
      success: true,
      image: dataUrl,
      metadata: {
        img1Url: url1,
        img2Url: url2,
        size: imageBuffer.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error in handler:', error);
    
    // Handle different error types
    let statusCode = 500;
    let errorMessage = error.message;

    if (error.name === 'AbortError') {
      statusCode = 504;
      errorMessage = 'Request timeout - API took too long to respond';
    }

    return res.status(statusCode).json({ 
      success: false,
      error: 'Processing failed',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
}

// Helper function to upload base64 image to tmpfiles.org
async function uploadToTmpFiles(base64Image) {
  try {
    // Remove data URL prefix if exists
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log('Image buffer size:', buffer.length, 'bytes');

    // Create form data
    const form = new FormData();
    form.append('file', buffer, {
      filename: `polaroid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`,
      contentType: 'image/jpeg'
    });

    // Upload to tmpfiles.org with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`tmpfiles.org upload failed: ${response.status} ${response.statusText}`);
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('tmpfiles.org response:', JSON.stringify(data));
    
    // Check response format
    if (data.status === 'success' && data.data && data.data.url) {
      // Convert to direct download URL
      // From: https://tmpfiles.org/12345/image.jpg
      // To: https://tmpfiles.org/dl/12345/image.jpg
      const directUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      console.log('Direct download URL:', directUrl);
      return directUrl;
    }

    console.error('Invalid tmpfiles.org response:', data);
    throw new Error('Invalid response from tmpfiles.org');

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('tmpfiles.org upload timeout');
      throw new Error('Upload timeout');
    }
    console.error('tmpfiles.org upload error:', error.message);
    throw error;
  }
      }
