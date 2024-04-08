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

import { PropagateLoader } from 'react-spinners'

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
  const [ loading, setLoading ] = useState<boolean>(false)

  const aspect = undefined

  const [ results, setResults ] = useState<object>([])

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
    setLoading(true)
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
    setResults(res)
    console.log(res)
    setLoading(false)
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
    <div className="bg-zinc-900 text-white px-4 py-6 flex flex-col gap-4 justify-center items-center w-[500px]">
      <div className='bg-zinc-800 w-full p-4 drop-shadow-xl rounded-lg'>
        <h1 className='font-bold text-4xl bg-gradient-to-r from-indigo-500 to-pink-500 inline-block text-transparent bg-clip-text drop-shadow-xl'>Deepfake Detector</h1>
        <h3 className='text-xs text-white/20 self-start'>Welcome to Deepfake Detector. Click the button below to begin.</h3>
        <button className="text-lg bg-gradient-to-r from-indigo-700 to-pink-700 px-4 py-2 rounded-xl w-full mt-4 drop-shadow-xl hover:scale-105 transition-transform" onClick={onScreenshot}>Capture Screen</button>
      </div>
      {!!imgSrc && (
      <div className='bg-zinc-800 w-full p-4 drop-shadow-xl rounded-lg'>
        <p className='text-xs text-white/20 self-start mb-2'>Select a face that you see on screen.</p>
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
            className='rounded-xl drop-shadow-xl'
          />
        </ReactCrop>
        </div>
      )}

      {!!completedCrop && (
        <>
          <div className='bg-zinc-800 w-full p-4 drop-shadow-xl rounded-lg'>
            <p className='text-xs text-white/20 self-start mb-2'>Preview: </p>
            <canvas
              ref={previewCanvasRef}
              style={{
                border: '1px solid black',
                objectFit: 'contain',
                maxWidth: "300px"
              }}
              className='rounded-xl drop-shadow-xl mx-auto'
            />
          </div>
          {/* THIS IS THE IMAGE ANALYSIS */}
          <div className='w-full flex flex-col justify-center items-center bg-zinc-800 w-full p-4 drop-shadow-xl rounded-lg'>
            <button className="text-lg bg-gradient-to-r from-indigo-700 to-pink-700 px-4 py-2 rounded-xl w-full drop-shadow-xl hover:scale-105 transition-transform" onClick={onDownloadCropClick}>Analyze Image</button>
              <div>
                { loading ?
                    <div className='p-4'>
                      <PropagateLoader color='lightgray'/>
                    </div>
                  :
                  // @ts-ignore
                  results.length ?
                    <div className='mt-4'>
                      {/* {JSON.stringify(results)} */}
                      {/* @ts-ignore */}
                      <p className='font-medium text-2xl'>This portrait is most likely <span className='font-bold text-4xl bg-gradient-to-r from-indigo-400 to-pink-400 inline-block text-transparent bg-clip-text'>{results[0].label}</span></p>
                      <ul className='mt-1 text-white/20'>
                        <li>
                          {/* @ts-ignore */}
                          <p>{results[0].label}: {(results[0].score.toFixed(4)*100).toFixed(2)}%</p>
                        </li>
                        <li>
                          {/* @ts-ignore */}
                          <p>{results[1].label}: {(results[1].score.toFixed(4)*100).toFixed(2)}%</p>
                        </li>
                      </ul>
                    </div>
                  : <p className='text-xs text-white/20 self-start mt-2'>Please click the button above to analyze your selected portion of the screen.</p>
                }
              </div>
          </div>
        </>
      )}
    </div>
  )
}
