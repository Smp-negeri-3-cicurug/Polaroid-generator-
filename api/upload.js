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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { img1, img2 } = req.body;

    if (!img1 || !img2) {
      return res.status(400).json({ 
        error: 'Missing images',
        message: 'Both img1 and img2 are required'
      });
    }

    // Step 1: Upload img1 to tmpfiles.org
    console.log('Uploading image 1 to tmpfiles.org...');
    const url1 = await uploadToTmpFiles(img1);
    
    if (!url1) {
      throw new Error('Failed to upload image 1');
    }

    // Step 2: Upload img2 to tmpfiles.org
    console.log('Uploading image 2 to tmpfiles.org...');
    const url2 = await uploadToTmpFiles(img2);
    
    if (!url2) {
      throw new Error('Failed to upload image 2');
    }

    // Step 3: Generate polaroid using external API
    console.log('Generating polaroid...');
    const polaroidUrl = `https://api.zenzxz.my.id/api/maker/polaroid?img1=${encodeURIComponent(url1)}&img2=${encodeURIComponent(url2)}`;
    
    const polaroidResponse = await fetch(polaroidUrl);
    
    if (!polaroidResponse.ok) {
      throw new Error('Failed to generate polaroid');
    }

    // Get image buffer
    const imageBuffer = await polaroidResponse.buffer();
    
    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    // Return success response
    return res.status(200).json({
      success: true,
      image: dataUrl,
      urls: {
        img1: url1,
        img2: url2
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
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
    
    // Create form data
    const form = new FormData();
    form.append('file', buffer, {
      filename: `image-${Date.now()}.jpg`,
      contentType: 'image/jpeg'
    });

    // Upload to tmpfiles.org
    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: form,
      headers: form.getHeaders()
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Check response format
    if (data.status === 'success' && data.data && data.data.url) {
      // Convert to direct download URL
      // From: https://tmpfiles.org/12345/image.jpg
      // To: https://tmpfiles.org/dl/12345/image.jpg
      const directUrl = data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
      return directUrl;
    }

    throw new Error('Invalid response from tmpfiles.org');

  } catch (error) {
    console.error('Upload error:', error);
    return null;
  }
        }
