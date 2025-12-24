// api/indexnow.js - Vercel Serverless Function for Shopify + IndexNow
// NEW LINE: Use this dynamic import instead:
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
  // 1. Set CORS headers for preflight requests (optional but good practice)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle preflight (OPTIONS) request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 2. Only accept POST requests from Shopify
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
       // 3. Parse Shopify's webhook JSON payload
    const shopifyProduct = req.body;
    console.log('📦 Received Shopify webhook for:', shopifyProduct.title || shopifyProduct.handle);

    // 4. Identify resource and build the correct URL
    let targetUrl;
    const resourceType = shopifyProduct.__parent_resource; // Shopify adds this field

    if (resourceType === 'product' && shopifyProduct.handle) {
      targetUrl = `https://www.pawvortex.com/products/${shopifyProduct.handle}`;
      console.log('🔗 Product URL:', targetUrl);
    }
    else if (resourceType === 'collection' && shopifyProduct.handle) {
      targetUrl = `https://www.pawvortex.com/collections/${shopifyProduct.handle}`;
      console.log('🔗 Collection URL:', targetUrl);
    }
    else {
      // Log other types but take no action for now
      console.log(`⚠️ Webhook for '${resourceType}' received. No action taken.`);
      return res.status(200).json({ message: `Webhook for ${resourceType} received.` });
    }

    // 5. YOUR PROVEN IndexNow Payload
    const indexnowPayload = {
      host: "www.pawvortex.com",
      key: "7f8e9a1b6t7u4e5f6g7h8i9j0k1l2m3n",
      keyLocation: ""https://www.pawvortex.com/7f8e9a1b6t7u4e5f6g7h8i9j0k1l2m3n.txt",
      urlList: [targetUrl] // <-- USING THE NEW VARIABLE HERE
    };
    console.log('📤 Payload ready for IndexNow');

    // 6. Make the POST request to IndexNow API
    const indexnowResponse = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(indexnowPayload)
    });

    const responseStatus = indexnowResponse.status;
    console.log(`✅ IndexNow API Response Status: ${responseStatus}`);

    // 7. Check if IndexNow accepted the submission
    if (responseStatus === 200 || responseStatus === 202) {
      console.log(`🚀 Successfully submitted to IndexNow: ${productUrl}`);
      return res.status(200).json({ 
        success: true, 
        message: `Submitted to IndexNow: ${productUrl}` 
      });
    } else {
      // If IndexNow returned an error, read and log it
      const errorText = await indexnowResponse.text();
      console.error(`❌ IndexNow Error (${responseStatus}):`, errorText);
      return res.status(500).json({ 
        success: false, 
        error: `IndexNow submission failed with status ${responseStatus}`,
        details: errorText 
      });
    }

  } catch (error) {
    // 8. Catch any server errors
    console.error('💥 Server Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error processing webhook' 
    });
  }
};