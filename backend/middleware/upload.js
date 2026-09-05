const multer = require('multer');
const path = require('path');

/**
 * Vercel functions reject request bodies over 4.5 MB with a platform-level 413,
 * and multipart encoding overhead counts toward that. 4 MB leaves headroom and
 * keeps the rejection ours, with a message we control.
 */
const MAX_BYTES = 4 * 1024 * 1024;

// .doc is deliberately absent: mammoth reads OOXML only, so accepting legacy
// binary Word here just produced a confusing 422 later. Reject it up front.
const ACCEPTED = {
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.txt': ['text/plain']
};

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = ACCEPTED[ext];

  // Both signals must agree. This used to be an OR, so a .txt extension passed
  // regardless of mimetype and vice versa.
  if (allowedMimes && allowedMimes.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'cv'));
}

// Memory, not disk: serverless filesystems are read-only apart from /tmp, and
// holding a <=4 MB buffer removes the temp-file lifecycle entirely.
module.exports = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: 1 }
});

module.exports.MAX_BYTES = MAX_BYTES;
