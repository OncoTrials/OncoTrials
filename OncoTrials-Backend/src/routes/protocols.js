// src/routes/protocols.js
// API routes for protocol PDF upload and management

const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');

// Apply auth middleware to all protocol routes
router.use(authenticateUser);

const multer = require('multer');
const { 
  parseProtocol, 
  queueProtocolParsing 
} = require('../services/ai/protocolParser');
const supabase = require('../db/supabaseClient');

// Service role client for storage operations (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Configure multer for PDF upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for protocol PDFs
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Middleware to check if user is CRC or admin
function requireCRC(req, res, next) {
//   if (req.user.role !== 'crc' && req.user.role !== 'admin') {
//     return res.status(403).json({ 
//       error: 'Only CRCs can upload protocol documents' 
//     });
//   }
  next();
}

/**
 * POST /api/trials/:trialId/protocol
 * Upload protocol PDF for a trial
 */
router.post('/trials/:trialId/protocol', requireCRC, upload.single('protocol'), async (req, res) => {
  try {
    const { trialId } = req.params;
    const file = req.file;
    // const userId = req.user.id;
    const userId = "b2f87b42-a1d8-47b1-b8ad-635f525765e9";
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Verify trial exists
    const { data: trial, error: trialError } = await supabase
      .from('trials')
      .select('id, nct_id, title')
      .eq('id', trialId)
      .single();
    
    if (trialError || !trial) {
      return res.status(404).json({ error: 'Trial not found' });
    }
    
    // Check if protocol already exists
    const { data: existing } = await supabase
      .from('trial_protocols')
      .select('id')
      .eq('trial_id', trialId)
      .single();
    
    if (existing) {
      return res.status(409).json({ 
        error: 'Protocol already exists for this trial. Use PATCH to update.' 
      });
    }
    
    // Upload to Supabase Storage
    const fileName = `${trialId}/${Date.now()}_${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('trial-protocols')
    .upload(fileName, file.buffer, {
        contentType: 'application/pdf',
        upsert: false
    });

    if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return res.status(500).json({ 
        error: 'Failed to upload file to storage',
        details: uploadError.message 
    });
    }
    
    // Get signed URL (valid for 1 year)
    const { data: urlData, error: urlError } = supabaseAdmin.storage
    .from('trial-protocols')
    .createSignedUrl(fileName, 31536000);

    if (urlError || !urlData) {
    console.error('Signed URL error:', urlError);
    // Cleanup uploaded file
    await supabaseAdmin.storage
        .from('trial-protocols')
        .remove([fileName]);
    return res.status(500).json({ 
        error: 'Failed to create signed URL',
        details: urlError?.message 
    });
    }
    
    // Create protocol record
    const { data: protocol, error: dbError } = await supabase
      .from('trial_protocols')
      .insert([{
        trial_id: trialId,
        pdf_file_name: file.originalname,
        pdf_storage_path: fileName,
        pdf_url: urlData.signedUrl,
        uploaded_by: userId,
        parsed: false
      }])
      .select()
      .single();
    
    if (dbError) {
      console.error('Database error:', dbError);
      // Cleanup uploaded file
      await supabase.storage
        .from('trial-protocols')
        .remove([fileName]);
      return res.status(500).json({ error: 'Failed to create protocol record' });
    }
    
    // Queue for async parsing
    queueProtocolParsing(protocol.id);
    
    res.status(201).json({
      message: 'Protocol uploaded successfully. Parsing in progress.',
      protocol: {
        id: protocol.id,
        trial_id: protocol.trial_id,
        file_name: protocol.pdf_file_name,
        uploaded_at: protocol.uploaded_at,
        parsed: protocol.parsed,
        parsing_status: 'queued'
      }
    });
    
  } catch (error) {
    console.error('Error uploading protocol:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trials/:trialId/protocol
 * Get protocol for a trial
 */
router.get('/trials/:trialId/protocol', async (req, res) => {
  try {
    const { trialId } = req.params;
    
    const { data: protocol, error } = await supabase
      .from('trial_protocols')
      .select('*')
      .eq('trial_id', trialId)
      .single();
    
    if (error || !protocol) {
      return res.status(404).json({ error: 'Protocol not found for this trial' });
    }
    
    res.json({ protocol });
    
  } catch (error) {
    console.error('Error fetching protocol:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/protocols/:protocolId/download
 * Download original protocol PDF
 */
router.get('/protocols/:protocolId/download', async (req, res) => {
  try {
    const { protocolId } = req.params;
    
    // Get protocol record
    const { data: protocol, error: fetchError } = await supabase
      .from('trial_protocols')
      .select('pdf_storage_path, pdf_file_name')
      .eq('id', protocolId)
      .single();
    
    if (fetchError || !protocol) {
      return res.status(404).json({ error: 'Protocol not found' });
    }
    
    // Download from storage
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('trial-protocols')
      .download(protocol.pdf_storage_path);
    
    if (downloadError) {
      console.error('Download error:', downloadError);
      return res.status(500).json({ error: 'Failed to download file' });
    }
    
    // Send as attachment
    const arrayBuffer = await pdfData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${protocol.pdf_file_name}"`,
      'Content-Length': buffer.length
    });
    
    res.send(buffer);
    
  } catch (error) {
    console.error('Error downloading protocol:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/protocols/:protocolId/reparse
 * Manually trigger re-parsing of protocol
 */
router.post('/protocols/:protocolId/reparse', requireCRC, async (req, res) => {
  try {
    const { protocolId } = req.params;
    
    // Reset parsed status
    const { error: resetError } = await supabase
      .from('trial_protocols')
      .update({ 
        parsed: false, 
        parsing_error: null 
      })
      .eq('id', protocolId);
    
    if (resetError) {
      return res.status(500).json({ error: 'Failed to reset protocol status' });
    }
    
    // Trigger parsing
    const result = await parseProtocol(protocolId);
    
    if (result.success) {
      res.json({
        message: 'Protocol reparsed successfully',
        protocol: result.data
      });
    } else {
      res.status(500).json({
        error: 'Parsing failed',
        details: result.error
      });
    }
    
  } catch (error) {
    console.error('Error reparsing protocol:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/protocols/unparsed
 * Get list of unparsed protocols (for monitoring/admin)
 */
router.get('/protocols/unparsed', requireCRC, async (req, res) => {
  try {
    const { data: unparsed, error } = await supabase
      .from('trial_protocols')
      .select(`
        id,
        pdf_file_name,
        uploaded_at,
        parsing_error,
        trial:trials(nct_id, title)
      `)
      .eq('parsed', false)
      .order('uploaded_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({
      count: unparsed.length,
      protocols: unparsed
    });
    
  } catch (error) {
    console.error('Error fetching unparsed protocols:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/trials/:trialId/protocol
 * Delete protocol for a trial
 */
router.delete('/trials/:trialId/protocol', requireCRC, async (req, res) => {
  try {
    const { trialId } = req.params;
    
    // Get protocol
    const { data: protocol, error: fetchError } = await supabase
      .from('trial_protocols')
      .select('id, pdf_storage_path')
      .eq('trial_id', trialId)
      .single();
    
    if (fetchError || !protocol) {
      return res.status(404).json({ error: 'Protocol not found' });
    }
    
    // Delete from storage
    await supabase.storage
      .from('trial-protocols')
      .remove([protocol.pdf_storage_path]);
    
    // Delete from database (cascade will handle related data)
    const { error: deleteError } = await supabase
      .from('trial_protocols')
      .delete()
      .eq('id', protocol.id);
    
    if (deleteError) throw deleteError;
    
    res.json({ message: 'Protocol deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting protocol:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;