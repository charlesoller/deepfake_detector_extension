import { pipeline } from "@xenova/transformers";

export const evalImage = async (url: any) => {
    console.log("----------IN FUNCTION------------")
    console.log("THE URL IS: ", url)
    const pipe = await pipeline("image-classification", "dima806/deepfake_vs_real_image_detection")

    const res = await pipe(url)
    console.log("IN FUNCTION, RETURNING: ", res)
    return res
}
