// api/upload.js - Vercel Serverless Function with postimg.cc
import fetch from 'node-fetch';
import FormData from 'form-data';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

    if (!img1 || !img2) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing images',
        message: 'Both img1 and img2 are required'
      });
    }

    console.log('Starting image upload process...');

    // Step 1: Upload img1 to postimg
    console.log('Uploading image 1 to postimg.cc...');
    const url1 = await uploadToPostimg(img1);
    
    if (!url1) {
      throw new Error('Failed to upload image 1 to postimg');
    }
    console.log('Image 1 uploaded:', url1);

    // Step 2: Upload img2 to postimg
    console.log('Uploading image 2 to postimg.cc...');
    const url2 = await uploadToPostimg(img2);
    
    if (!url2) {
      throw new Error('Failed to upload image 2 to postimg');
    }
    console.log('Image 2 uploaded:', url2);

    // Step 3: Generate polaroid using zenzxz API
    console.log('Generating polaroid with zenzxz API...');
    const polaroidApiUrl = `https://api.zenzxz.my.id/api/maker/polaroid?img1=${encodeURIComponent(url1)}&img2=${encodeURIComponent(url2)}`;
    
    console.log('Polaroid API URL:', polaroidApiUrl);

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

    const contentType = polaroidResponse.headers.get('content-type');
    console.log('Response content-type:', contentType);

    const imageBuffer = await polaroidResponse.buffer();
    
    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error('Received empty image buffer from API');
    }

    console.log('Image buffer size:', imageBuffer.length, 'bytes');

    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64Image}`;

    console.log('Successfully generated polaroid');

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

// Helper function to upload base64 image to postimg.cc
async function uploadToPostimg(base64Image) {
  try {
    // Remove data URL prefix if exists
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    console.log('Image buffer size:', buffer.length, 'bytes');

    // Create form data for postimg.cc
    const form = new FormData();
    form.append('upload', buffer, {
      filename: `polaroid-${Date.now()}.jpg`,
      contentType: 'image/jpeg'
    });
    form.append('type', 'file');

    // Upload to postimg.cc
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch('https://postimg.cc/json', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders()
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`postimg.cc upload failed: ${response.status}`);
      throw new Error(`Upload failed with status: ${response.status}`);
    }

    const text = await response.text();
    console.log('postimg.cc raw response:', text);
    
    // Try to parse as JSON first
    try {
      const data = JSON.parse(text);
      
      // Extract direct image URL from various possible response formats
      // Format: https://i.postimg.cc/xdzsD01X/filename.jpg
      if (data.url) {
        console.log('Direct image URL:', data.url);
        return data.url;
      }
      
      if (data.image && data.image.url) {
        console.log('Direct image URL:', data.image.url);
        return data.image.url;
      }
      
      if (data.src) {
        console.log('Direct image URL:', data.src);
        return data.src;
      }
    } catch (e) {
      // Not JSON, try to extract URL from HTML
      console.log('Response is not JSON, extracting from HTML...');
    }
    
    // Extract URL from HTML response
    // Look for pattern: https://i.postimg.cc/xdzsD01X/filename.jpg
    const urlMatch = text.match(/https?:\/\/i\.postimg\.cc\/[A-Za-z0-9]+\/[^"'\s<>]+\.(jpg|jpeg|png|gif|webp)/i);
    
    if (urlMatch && urlMatch[0]) {
      const directUrl = urlMatch[0];
      console.log('Extracted direct image URL:', directUrl);
      return directUrl;
    }

    console.error('Could not extract URL from postimg.cc response');
    throw new Error('Failed to extract image URL');

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('postimg.cc upload timeout');
      throw new Error('Upload timeout');
    }
    console.error('postimg.cc upload error:', error.message);
    throw error;
  }
}

// Fallback: Not needed anymore, removed
async function uploadToPostimagesOrg(base64Image) {
  throw new Error('Fallback not implemented');
  }
