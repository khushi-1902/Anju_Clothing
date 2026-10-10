import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'

export const uploadRouter = Router()

// Configure Multer for memory storage (images + video up to 100MB)
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // Up to 100 MB for reels / videos
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    const isVideoMime = file.mimetype.startsWith('video/')
    const isImageMime = file.mimetype.startsWith('image/')
    const isVideoExt = /\.(mp4|webm|mov|mkv|avi|m4v|3gp|flv|wmv)$/i.test(file.originalname)
    const isImageExt = /\.(jpg|jpeg|png|webp|gif|svg|avif)$/i.test(file.originalname)

    if (isVideoMime || isImageMime || isVideoExt || isImageExt) {
      cb(null, true)
    } else {
      cb(new Error(`File "${file.originalname}" is not a supported image or video format`))
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
 * Multi-file media upload endpoint to Cloudinary (Images and Videos).
 */
uploadRouter.post(
  '/',
  (req: Request, res: Response, next: NextFunction) => {
    upload.array('images', 10)(req, res, (err: any) => {
      if (err) {
        console.error('[Multer Upload Error]:', err.message || err)
        return res.status(400).json({ error: err.message || 'File upload failed' })
      }
      next()
    })
  },
  async (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[] | undefined

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No media files provided' })
    }

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.warn('Cloudinary credentials missing in backend environment')
      return res.status(500).json({
        error: 'Cloudinary credentials are not configured in backend/.env',
      })
    }

    try {
      const uploadPromises = files.map((file) => {
        const isVideo =
          file.mimetype.startsWith('video/') ||
          /\.(mp4|webm|mov|mkv|avi|m4v|3gp|flv|wmv)$/i.test(file.originalname)
        const resourceType = isVideo ? 'video' : 'image'

        return new Promise<{ url: string; publicId: string; format: string; resourceType: string }>(
          (resolve, reject) => {
            const uploadOptions: any = {
              folder: isVideo ? 'anju_clothing/creators_videos' : 'anju_clothing/products',
              resource_type: resourceType,
            }

            // ONLY apply synchronous image transformations.
            // Cloudinary rejects video uploads if uploadOptions.transformation is provided!
            if (!isVideo) {
              uploadOptions.transformation = [
                { quality: 'auto:good' },
                { fetch_format: 'auto' },
              ]
            }

            const uploadStream = cloudinary.uploader.upload_stream(
              uploadOptions,
              (error, result) => {
                if (error || !result) {
                  console.error('[Cloudinary upload_stream Error]:', error)
                  return reject(error || new Error('Cloudinary upload failed'))
                }
                resolve({
                  url: result.secure_url,
                  publicId: result.public_id,
                  format: result.format || (isVideo ? 'mp4' : 'jpg'),
                  resourceType: result.resource_type,
                })
              }
            )

            uploadStream.end(file.buffer)
          }
        )
      })

      const results = await Promise.all(uploadPromises)

      res.json({
        success: true,
        images: results,
        files: results,
      })
    } catch (err: any) {
      console.error('[POST /api/admin/upload] Error:', err)
      res.status(500).json({
        error: err.message || 'Failed to upload media to Cloudinary',
      })
    }
  }
)
