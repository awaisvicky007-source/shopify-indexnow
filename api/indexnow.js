// api/indexnow.js - Vercel Serverless Function for Shopify + IndexNow
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const shopifyData = req.body;
    console.log('📦 Received Shopify webhook for:', shopifyData.title || shopifyData.handle || 'Unknown Resource');

      let targetUrl;
    let resourceType = 'unknown';

    // Method 1: Check the Shopify-added field (works for products)
    if (shopifyData.__parent_resource === 'product' && shopifyData.handle) {
      resourceType = 'product';
      targetUrl = `https://www.pawvortex.com/products/${shopifyData.handle}`;
    }
    // Method 2: Check for collection-specific data structure
    else if (shopifyData.handle && shopifyData.title && shopifyData.__parent_resource === undefined) {
      // Collections often have 'handle' and 'title' but no '__parent_resource'
      resourceType = 'collection';
      targetUrl = `https://www.pawvortex.com/collections/${shopifyData.handle}`;
    }

    // If we couldn't identify it, log the FULL data and exit
    if (!targetUrl) {
      console.log('⚠️ Unidentified webhook received. Full data:', JSON.stringify(shopifyData, null, 2));
      return res.status(200).json({ message: 'Webhook received but resource type not recognized.' });
    }

    console.log(`🔗 ${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} URL:`, targetUrl);

    // ⭐⭐ CRITICAL: This object must be perfectly formed ⭐⭐
    const indexnowPayload = {
      host: "www.pawvortex.com",
      key: "7f8e9a1b6t7u4e5f6g7h8i9j0k1l2m3n",
      keyLocation: "https://www.pawvortex.com/7f8e9a1b6t7u4e5f6g7h8i9j0k1l2m3n.txt",
      urlList: [targetUrl]
    };
    console.log('📤 Payload ready for IndexNow');

    const indexnowResponse = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(indexnowPayload)
    });

    const responseStatus = indexnowResponse.status;
    console.log(`✅ IndexNow API Response Status: ${responseStatus}`);

    if (responseStatus === 200 || responseStatus === 202) {
      console.log(`🚀 Successfully submitted to IndexNow: ${targetUrl}`);
      return res.status(200).json({ success: true, message: `Submitted to IndexNow: ${targetUrl}` });
    } else {
      const errorText = await indexnowResponse.text();
      console.error(`❌ IndexNow Error (${responseStatus}):`, errorText);
      return res.status(500).json({ success: false, error: `IndexNow submission failed with status ${responseStatus}`, details: errorText });
    }

  } catch (error) {
    console.error('💥 Server Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error processing webhook' });
  }
};