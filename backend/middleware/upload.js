const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const MAX_BYTES = 5 * 1024 * 1024;

// .doc is deliberately absent: mammoth reads OOXML only, so accepting legacy
// binary Word here just produced a confusing 422 later. Reject it up front.
const ACCEPTED = {
  '.pdf': ['application/pdf'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.txt': ['text/plain']
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Derive the extension from our own allow-list rather than from the
    // client-supplied name, so nothing arbitrary lands on disk.
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = Object.keys(ACCEPTED).includes(ext) ? ext : '.bin';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

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

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: 1 }
});
