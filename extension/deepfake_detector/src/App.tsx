import React, { useState, useRef } from 'react'

import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
  // convertToPixelCrop,
} from 'react-image-crop'
import { canvasPreview } from './canvasPreview'
import { useDebounceEffect } from './useDebounceEffect'

import 'react-image-crop/dist/ReactCrop.css'
import { evalImage } from './ml_model'

// This is to demonstate how to make and center a % aspect crop
// which is a bit trickier so we use some helper functions.
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}



export default function App() {
  const [imgSrc, setImgSrc] = useState('')
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()

  const aspect = undefined

  const [ results, setResults ] = useState<object>({})

  const onScreenshot = async () => {
    setCrop(undefined)
    // @ts-ignore
    const url = await chrome.tabs.captureVisibleTab()
    setImgSrc(url)
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget
      setCrop(centerAspectCrop(width, height, aspect))
    }
  }

  async function onDownloadCropClick() {
    const image = imgRef.current
    const previewCanvas = previewCanvasRef.current
    if (!image || !previewCanvas || !completedCrop) {
      throw new Error('Crop canvas does not exist')
    }

    // This will size relative to the uploaded image
    // size. If you want to size according to what they
    // are looking at on screen, remove scaleX + scaleY
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    const offscreen = new OffscreenCanvas(
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
    )
    const ctx = offscreen.getContext('2d')
    if (!ctx) {
      throw new Error('No 2d context')
    }

    ctx.drawImage(
      previewCanvas,
      0,
      0,
      previewCanvas.width,
      previewCanvas.height,
      0,
      0,
      offscreen.width,
      offscreen.height,
    )
    // You might want { type: "image/jpeg", quality: <0 to 1> } to
    // reduce image size
    const blob = await offscreen.convertToBlob({
      type: 'image/png',
    })
    const res = await evalImage(blob)
    console.log("FINAL: ", res)
    setResults(res)
  }

  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width &&
        completedCrop?.height &&
        imgRef.current &&
        previewCanvasRef.current
      ) {
        // We use canvasPreview as it's much faster than imgPreview.
        canvasPreview(
          imgRef.current,
          previewCanvasRef.current,
          completedCrop,
        )
      }
    },
    100,
    [completedCrop],
  )

  return (
    <div className="bg-zinc-900 text-white p-6 flex flex-col justify-center items-center w-[500px]">
      <h3 className='text-xs text-white/20 self-start'>Welcome to Sherlock. Click the button below to begin.</h3>
      <button className="text-lg bg-gradient-to-r from-indigo-700 to-pink-700 px-4 py-2 rounded-xl w-full my-2 hover:scale-105 transition-transform" onClick={onScreenshot}>Capture Screen</button>
      <div>
      {!!imgSrc && (
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect}
          className='rounded-xl drop-shadow-xl'
        >
          <img
            ref={imgRef}
            alt="Crop me"
            src={imgSrc}
            style={{ width: "auto"}}
            onLoad={onImageLoad}
          />
        </ReactCrop>
      )}
      </div>

      {!!completedCrop && (
        <>
          <div>
            <canvas
              ref={previewCanvasRef}
              style={{
                border: '1px solid black',
                objectFit: 'contain',
                maxWidth: "300px"
              }}
            />
          </div>
          {/* THIS IS THE IMAGE ANALYSIS */}
          <div>
            <button className="bg-gradient-to-r from-indigo-700 to-pink-700 px-4 py-2 rounded-xl hover:scale-105 transition-transform" onClick={onDownloadCropClick}>Analyze Image</button>
              <p>
                {JSON.stringify(results)}
              </p>
          </div>
        </>
      )}
    </div>
  )
}
