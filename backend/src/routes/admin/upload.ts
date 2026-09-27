import { Router, Request, Response } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'

export const uploadRouter = Router()

// Configure Multer for memory storage
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per image
    files: 10, // Up to 10 images simultaneously
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// Configure Cloudinary from environment
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

/**
 * POST /api/admin/upload
 * Multi-file image upload endpoint to Cloudinary.
 * Returns array of uploaded image URLs and metadata.
 */
uploadRouter.post('/', upload.array('images', 10), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[] | undefined

  if (!files || files.length === 0) {
    return res.status(400).json({ error: 'No image files provided' })
  }

  // Check if Cloudinary is configured
  if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn('Cloudinary credentials missing in backend environment')
    return res.status(500).json({
      error: 'Cloudinary credentials are not configured in backend/.env',
    })
  }

  try {
    const uploadPromises = files.map((file) => {
      return new Promise<{ url: string; publicId: string; format: string; width: number; height: number }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'anju_clothing/products',
            resource_type: 'image',
            transformation: [
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error('Cloudinary upload failed'))
            }
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              format: result.format,
              width: result.width,
              height: result.height,
            })
          }
        )

        uploadStream.end(file.buffer)
      })
    })

    const results = await Promise.all(uploadPromises)

    res.json({
      success: true,
      images: results,
    })
  } catch (err: any) {
    console.error('Error uploading to Cloudinary:', err)
    res.status(500).json({
      error: err.message || 'Failed to upload image(s) to Cloudinary',
    })
  }
})
